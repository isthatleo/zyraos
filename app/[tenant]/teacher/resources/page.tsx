"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Archive,
  BookOpen,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  Heart,
  ListChecks,
  Lock,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Star,
  TrendingUp,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type TeacherResource = {
  id: string
  title: string
  description: string
  kind: string
  category: string
  url: string
  size: string
  fileSize: number
  sourceType: string
  sourceId: string
  subjectId: string
  subject: string
  subjectCode: string
  classId: string
  className: string
  tags: string[]
  isPublic: boolean
  viewCount: number
  downloadCount: number
  createdAt: string | null
  updatedAt: string | null
  favorited: boolean
  shared: boolean
  archived: boolean
}

type TeacherClass = {
  id: string
  name: string
  grade: string
  section: string
  academicYear: string
  students?: number
}

type TeacherSubject = {
  id: string
  name: string
  code: string
  type: string
}

type LearningContentPayload = {
  generatedAt: string
  currentUser: { id: string; name: string; email: string; role: string }
  school: { id: string; name: string; slug: string; type: string }
  teacher: { id: string; name: string; email: string; position: string; department: string; qualifications: string; employeeId: string }
  metrics: {
    resources: number
    favorited: number
    shared: number
    archived: number
    totalSize: number
    totalViews: number
    totalDownloads: number
  }
  subjects: TeacherSubject[]
  classes: TeacherClass[]
  resources: TeacherResource[]
  categories: string[]
  tags: string[]
}

type ResourceForm = {
  title: string
  category: string
  resourceType: string
  subjectId: string
  classId: string
  description: string
  isPublic: boolean
  tags: string
}

const emptyForm: ResourceForm = {
  title: "",
  category: "Learning Materials",
  resourceType: "document",
  subjectId: "",
  classId: "",
  description: "",
  isPublic: false,
  tags: "",
}

const resourceTypes = [
  "document",
  "presentation",
  "video",
  "image",
  "audio",
  "worksheet",
  "quiz",
  "assignment",
  "rubric",
  "assessment",
  "template",
  "other",
]

const defaultCategories = [
  "Learning Materials",
  "Lesson Plans",
  "Assessments",
  "Student Work Examples",
  "Rubrics & Grading",
  "Multimedia",
  "Reference Materials",
  "Templates",
  "Archives",
]

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(value: string | null) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

async function fetchResourcesJson<T>(endpoint: string, fallback: string): Promise<{ data: T | null; error: string }> {
  let last = fallback
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(endpoint, { cache: "no-store", credentials: "include" }).catch(() => null)
    if (response?.ok) return { data: await response.json() as T, error: "" }
    const body = await response?.json().catch(() => ({}))
    last = String(body?.error || fallback)
    if (!response || ![401, 403].includes(response.status) || attempt === 3) break
    await new Promise((resolve) => window.setTimeout(resolve, 300 + attempt * 350))
  }
  return { data: null, error: last }
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[640px] rounded-3xl" />
    </div>
  )
}

export default function TeacherResourcesPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payload, setPayload] = React.useState<LearningContentPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState(searchParams?.get("q") || "")
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams?.get("category") || "all")
  const [selectedSubject, setSelectedSubject] = React.useState(searchParams?.get("subject") || "all")
  const [filterFavorited, setFilterFavorited] = React.useState(false)
  const [filterShared, setFilterShared] = React.useState(false)
  const [filterArchived, setFilterArchived] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<ResourceForm>(emptyForm)
  const [acting, setActing] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewResource, setPreviewResource] = React.useState<TeacherResource | null>(null)
  const payloadRef = React.useRef<LearningContentPayload | null>(null)

  React.useEffect(() => {
    payloadRef.current = payload
  }, [payload])

  // Sync filters/search to the URL so the page is linkable and sharable.
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const params = new URLSearchParams()
        if (query) params.set("q", query)
        if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory)
        if (selectedSubject && selectedSubject !== "all") params.set("subject", selectedSubject)
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        void router.replace(newUrl)
      } catch (e) {
        // ignore URL update failures
      }
    }, 450)
    return () => window.clearTimeout(t)
  }, [query, selectedCategory, selectedSubject, pathname, router])

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname || "").split("/").filter(Boolean)
    return segments[1] === "teacher" ? `/${segments[0]}` : ""
  }, [pathname])

  const teacherHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const hostTenant = typeof window !== "undefined" ? window.location.hostname.split(".")[0] : ""
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : hostTenant && !["localhost", "127", "www"].includes(hostTenant) ? hostTenant : ""
    return tenant ? `/api/tenant/teacher/resources?tenant=${encodeURIComponent(tenant)}` : "/api/teacher/resources"
  }, [tenantPrefix])

  const loadResources = React.useCallback(async (notify = false) => {
    setError("")
    if (!payloadRef.current) setLoading(true)
    const result = await fetchResourcesJson<LearningContentPayload>(endpoint(), "Learning content could not be loaded")
    if (result.error || !result.data) {
      setError(result.error)
      if (!payloadRef.current) setLoading(false)
      if (notify) toast.error(result.error)
      return
    }
    setPayload(result.data)
    setLoading(false)
    if (notify) toast.success("Learning content refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadResources()
  }, [loadResources])

  const resources = payload?.resources || []
  const categories = payload?.categories || defaultCategories
  const subjects = payload?.subjects || []
  const classes = payload?.classes || []
  const search = query.trim().toLowerCase()

  const filteredResources = resources.filter((resource) => {
    if (filterArchived !== (resource.archived)) return false
    if (filterFavorited && !resource.favorited) return false
    if (filterShared && !resource.shared) return false
    if (selectedCategory !== "all" && resource.category !== selectedCategory) return false
    if (selectedSubject !== "all" && resource.subjectId !== selectedSubject) return false
    if (!search) return true
    return [resource.title, resource.description, resource.subject, resource.category, ...resource.tags].some((value) => value.toLowerCase().includes(search))
  })

  const stats = React.useMemo(() => {
    const activeResources = resources.filter((r) => !r.archived)
    const byCategory: Record<string, number> = {}
    const bySubject: Record<string, number> = {}
    const byType: Record<string, number> = {}
    const topViewed: TeacherResource[] = []
    const recentlyCreated: TeacherResource[] = []
    const mostDownloaded: TeacherResource[] = []

    activeResources.forEach((r) => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1
      if (r.subjectId) bySubject[r.subject] = (bySubject[r.subject] || 0) + 1
      byType[r.kind] = (byType[r.kind] || 0) + 1
    })

    topViewed.push(...activeResources.filter(r => r.viewCount > 0).sort((a, b) => b.viewCount - a.viewCount).slice(0, 5))
    recentlyCreated.push(...activeResources.filter(r => r.createdAt).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5))
    mostDownloaded.push(...activeResources.filter(r => r.downloadCount > 0).sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 5))

    const publicResources = activeResources.filter(r => r.isPublic).length
    const privateResources = activeResources.filter(r => !r.isPublic).length
    const avgEngagement = activeResources.length ? Math.round(activeResources.reduce((sum, r) => sum + r.viewCount + r.downloadCount, 0) / activeResources.length) : 0

    return { activeResources, byCategory, bySubject, byType, topViewed, recentlyCreated, mostDownloaded, publicResources, privateResources, avgEngagement }
  }, [resources])

  const postAction = async (body: Record<string, unknown>, success: string) => {
    setActing(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setActing(false)
    if (!response?.ok) {
      toast.error(String(data?.error || "Action failed"))
      return false
    }
    toast.success(success)
    await loadResources()
    return true
  }

  const toggleFavorite = async (resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    const ok = await postAction({ action: resource.favorited ? "unfavorite" : "favorite", resourceId }, resource.favorited ? "Removed from favorites" : "Added to favorites")
    if (ok && previewResource?.id === resourceId) setPreviewResource({ ...previewResource, favorited: !previewResource.favorited })
  }

  const toggleShared = async (resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    const ok = await postAction({ action: resource.shared ? "unshare" : "share", resourceId }, resource.shared ? "Unshared" : "Shared with learners")
    if (ok && previewResource?.id === resourceId) setPreviewResource({ ...previewResource, shared: !previewResource.shared })
  }

  const toggleArchived = async (resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId)
    if (!resource) return
    const ok = await postAction({ action: resource.archived ? "unarchive" : "archive", resourceId }, resource.archived ? "Unarchived" : "Archived")
    if (ok && previewResource?.id === resourceId) setPreviewResource({ ...previewResource, archived: !previewResource.archived })
  }

  const createResource = async () => {
    const ok = await postAction(
      {
        action: "resource.create",
        ...form,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      },
      "Resource created"
    )
    if (ok) {
      setDialogOpen(false)
      setForm(emptyForm)
    }
  }

  // Preview, copy and duplicate helpers
  const openPreview = (resource: TeacherResource) => {
    setPreviewResource(resource)
    setPreviewOpen(true)
  }

  const closePreview = () => {
    setPreviewOpen(false)
    setPreviewResource(null)
  }

  const copyResourceLink = async (resource: TeacherResource) => {
    try {
      const link = resource.url || `${window.location.origin}${teacherHref(`/teacher/resources?q=${encodeURIComponent(resource.title)}`)}`
      await navigator.clipboard.writeText(link)
      toast.success("Link copied to clipboard")
    } catch (e) {
      toast.error("Could not copy link")
    }
  }

  const duplicateResource = (resource: TeacherResource) => {
    setForm({
      title: `${resource.title} (copy)`,
      category: resource.category || "Learning Materials",
      resourceType: resource.kind || "document",
      subjectId: resource.subjectId || "",
      classId: resource.classId || "",
      description: resource.description || "",
      isPublic: resource.isPublic || false,
      tags: Array.isArray(resource.tags) ? resource.tags.join(", ") : String(resource.tags || ""),
    })
    setDialogOpen(true)
  }

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Learning content could not be loaded</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadResources(true)}><RefreshCcw className="size-4" />Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><GraduationCap className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">Learning Content Library</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Learning Content Hub</h1>
                <p className="mt-2 text-muted-foreground">
                  Organize, manage, and share learning resources across {payload?.teacher?.name}'s classes. Store lesson materials, assessments, templates, and multimedia in one centralized library.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
                <BookOpen className="size-4" />Dashboard
              </Button>
              <Button variant="outline" onClick={async () => { setRefreshing(true); await loadResources(true); setRefreshing(false) }} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />New resource
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
            { label: "Total Resources", value: stats.activeResources.length, helper: `${payload?.metrics?.archived || 0} archived`, icon: ListChecks, color: "bg-blue-50 text-blue-700" },
            { label: "Favorited", value: payload?.metrics?.favorited || 0, helper: "Quick access items", icon: Star, color: "bg-amber-50 text-amber-700" },
            { label: "Shared", value: payload?.metrics?.shared || 0, helper: "Available to learners", icon: Share2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Storage Used", value: formatBytes(payload?.metrics?.totalSize || 0), helper: `${payload?.metrics?.totalDownloads || 0} downloads`, icon: Download, color: "bg-purple-50 text-purple-700" },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                </div>
                <div className={cn("rounded-2xl p-3", card.color)}><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="size-5 text-amber-500" />Top Engagement</CardTitle>
            <CardDescription>Most viewed and downloaded resources this month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topViewed.slice(0, 3).length ? stats.topViewed.slice(0, 3).map((resource) => (
              <div key={resource.id} className="flex items-center justify-between rounded-2xl border p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm line-clamp-1">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">{resource.subject}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs"><Eye className="inline mr-1 size-3" />{resource.viewCount}</div>
                  <div className="text-right text-xs"><Download className="inline mr-1 size-3" />{resource.downloadCount}</div>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No resources with views yet.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Resource Distribution</CardTitle>
            <CardDescription>Privacy status breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Public (Shared)</span>
                <Badge variant="outline">{stats.publicResources}</Badge>
              </div>
              <Progress value={stats.activeResources.length ? (stats.publicResources / stats.activeResources.length) * 100 : 0} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Private</span>
                <Badge variant="outline">{stats.privateResources}</Badge>
              </div>
              <Progress value={stats.activeResources.length ? (stats.privateResources / stats.activeResources.length) * 100 : 0} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Avg. engagement: {stats.avgEngagement} per resource</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-emerald-500" />Recently Created</CardTitle>
            <CardDescription>Your latest uploaded or created resources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentlyCreated.slice(0, 4).length ? stats.recentlyCreated.slice(0, 4).map((resource) => (
              <button key={resource.id} type="button" onClick={() => { setQuery(resource.title); setActiveTab("all") }} className="w-full text-left p-2 rounded-2xl border hover:bg-muted transition-colors">
                <p className="font-medium text-sm line-clamp-1">{resource.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(resource.createdAt)}</p>
              </button>
            )) : <p className="text-sm text-muted-foreground">No recently created resources.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Resource Types</CardTitle>
            <CardDescription>Distribution by resource format.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 rounded-2xl border">
                  <p className="text-sm font-medium capitalize">{type}</p>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            {Object.keys(stats.byType).length === 0 && <p className="text-sm text-muted-foreground">No resources yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Find and organize resources by category, subject, and metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="relative md:col-span-3">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by title, description, tags..." value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjects.map((subj) => <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setFilterFavorited(!filterFavorited)} className={filterFavorited ? "bg-primary/10" : ""}>
                  <Star className="size-4" />Favorited {filterFavorited ? "✓" : ""}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFilterShared(!filterShared)} className={filterShared ? "bg-primary/10" : ""}>
                  <Share2 className="size-4" />Shared {filterShared ? "✓" : ""}
                </Button>
                <Button variant="outline" onClick={() => setFilterArchived(!filterArchived)} className={filterArchived ? "bg-primary/10" : ""}>
                  <Archive className="size-4" />Archived {filterArchived ? "✓" : ""}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="border-b border-muted">
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "all"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListChecks className="size-4" />
                  All Resources
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredResources.length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab("favorited")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "favorited"
                      ? "border-destructive text-destructive"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart className="size-4" />
                  Favorited
                  <Badge variant="secondary" className="ml-1 text-xs">{resources.filter((r) => r.favorited && !r.archived).length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab("shared")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "shared"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Share2 className="size-4" />
                  Shared
                  <Badge variant="secondary" className="ml-1 text-xs">{resources.filter((r) => r.shared && !r.archived).length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab("recent")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "recent"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="size-4" />
                  Recent
                  <Badge variant="secondary" className="ml-1 text-xs">{stats.recentlyCreated.length}</Badge>
                </button>
              </div>
            </div>

            {activeTab === "all" && (
              (filteredResources.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredResources.map((resource) => (
                    <Card key={resource.id} className="rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="line-clamp-2 text-base">{resource.title}</CardTitle>
                            <CardDescription className="mt-1">{resource.subject} • {resource.category}</CardDescription>
                          </div>
                           <div className="flex gap-1 flex-shrink-0">
                             <Button size="icon" variant="ghost" onClick={() => toggleFavorite(resource.id)}>
                               <Heart className={cn("size-4", resource.favorited && "fill-destructive text-destructive")} />
                             </Button>
                             <Button size="icon" variant="ghost" onClick={() => toggleShared(resource.id)}>
                               <Share2 className={cn("size-4", resource.shared && "text-primary")} />
                             </Button>
                             <Button size="icon" variant="ghost" onClick={() => openPreview(resource)}>
                               <Eye className="size-4" />
                             </Button>
                           </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                          {resource.tags.length > 3 ? <Badge variant="secondary" className="text-xs">+{resource.tags.length - 3}</Badge> : null}
                        </div>
                        <div className="grid gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Eye className="size-3" />{resource.viewCount} views</div>
                          <div className="flex items-center gap-1"><Download className="size-3" />{resource.downloadCount} downloads</div>
                          <div>{formatDate(resource.createdAt)}</div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          {resource.url && <Button variant="outline" size="sm" asChild><a href={resource.url} target="_blank" rel="noopener noreferrer"><Download className="size-3" />Download</a></Button>}
                          <Button variant="outline" size="sm" onClick={() => toggleArchived(resource.id)}>
                            <Archive className="size-3" />{resource.archived ? "Unarchive" : "Archive"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="rounded-3xl">
                  <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                    <BookOpen className="size-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">No resources match this view</p>
                      <p className="text-sm text-muted-foreground">Create new resources or adjust your filters.</p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)}><Plus className="size-4" />Create resource</Button>
                  </CardContent>
                </Card>
              ))
            )}

            {activeTab === "favorited" && (
              (resources.filter((r) => r.favorited && !r.archived).length ? (
                <div className="space-y-3">
                  {resources.filter((r) => r.favorited && !r.archived).map((resource) => (
                    <Card key={resource.id} className="rounded-3xl shadow-sm">
                      <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-center">
                        <div>
                          <p className="font-semibold">{resource.title}</p>
                          <p className="text-sm text-muted-foreground">{resource.subject} • {resource.category}</p>
                        </div>
                        <div className="text-sm"><Eye className="mr-1 inline size-3" />{resource.viewCount}</div>
                        <Button variant="outline" size="sm" onClick={() => toggleFavorite(resource.id)}><Heart className="size-3 fill-destructive text-destructive" />Unfavorite</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-center text-muted-foreground">No favorited resources yet.</CardContent></Card>
              ))
            )}

            {activeTab === "shared" && (
              (resources.filter((r) => r.shared && !r.archived).length ? (
                <div className="space-y-3">
                  {resources.filter((r) => r.shared && !r.archived).map((resource) => (
                    <Card key={resource.id} className="rounded-3xl shadow-sm">
                      <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-center">
                        <div>
                          <p className="font-semibold">{resource.title}</p>
                          <p className="text-sm text-muted-foreground">{resource.subject} • {resource.category}</p>
                        </div>
                        <div className="text-sm"><Download className="mr-1 inline size-3" />{resource.downloadCount}</div>
                        <Button variant="outline" size="sm" onClick={() => toggleShared(resource.id)}><Share2 className="size-3" />Unshare</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-center text-muted-foreground">No shared resources yet.</CardContent></Card>
              ))
            )}

            {activeTab === "recent" && (
              (stats.recentlyCreated.length ? (
                <div className="space-y-3">
                  {stats.recentlyCreated.map((resource) => (
                    <Card key={resource.id} className="rounded-3xl shadow-sm">
                      <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_160px_140px] md:items-center">
                        <div>
                          <p className="font-semibold">{resource.title}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(resource.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className="w-fit text-xs">{resource.kind}</Badge>
                        <Button variant="outline" size="sm" onClick={() => toggleFavorite(resource.id)}><Heart className={cn("size-3", resource.favorited && "fill-destructive text-destructive")} /></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-center text-muted-foreground">No recently created resources.</CardContent></Card>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Resource distribution across categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setSelectedCategory(cat); setFilterArchived(false) }}
                    className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{cat}</p>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  </button>
                ))}
              {Object.keys(stats.byCategory).length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>By Subject</CardTitle>
              <CardDescription>Resource allocation by subject.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.bySubject)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between rounded-2xl border p-3">
                    <p className="text-sm font-medium line-clamp-1">{subject}</p>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              {Object.keys(stats.bySubject).length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="size-5 text-blue-500" />Class Coverage</CardTitle>
              <CardDescription>Resource access by assigned class.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classes.slice(0, 4).map((classItem) => {
                const classResources = resources.filter(r => r.classId === classItem.id && !r.archived).length
                return (
                  <div key={classItem.id} className="rounded-2xl border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{classItem.name}</p>
                      <Badge variant="outline">{classResources}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{classItem.students || 0} students</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Storage Insights</CardTitle>
              <CardDescription>Library space utilization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>Used capacity</span>
                  <span>{((payload?.metrics?.totalSize || 0) / (5 * 1024 * 1024 * 1024)) * 100 | 0}%</span>
                </div>
                <Progress value={Math.min(100, ((payload?.metrics?.totalSize || 0) / (5 * 1024 * 1024 * 1024)) * 100)} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total: {formatBytes(payload?.metrics?.totalSize || 0)}</p>
                <p>Quota: 5 GB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(true)}><Plus className="size-4" />Create resource</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/lesson-plans"))}><ListChecks className="size-4" />Lesson plans</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/classes"))}><GraduationCap className="size-4" />My classes</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))}><TrendingUp className="size-4" />Dashboard</Button>
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); else setPreviewOpen(open) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewResource?.title || "Resource preview"}</DialogTitle>
            <DialogDescription>{previewResource ? `${previewResource.subject} • ${previewResource.category}` : "Preview a resource"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{previewResource?.description}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => previewResource && toggleFavorite(previewResource.id)}>
                <Heart className={cn("size-4", previewResource?.favorited && "fill-destructive text-destructive")} />{previewResource?.favorited ? " Favorited" : " Favorite"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => previewResource && toggleShared(previewResource.id)}>
                <Share2 className="size-4" />{previewResource?.shared ? " Unshare" : " Share"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => previewResource && toggleArchived(previewResource.id)}>
                <Archive className="size-4" />{previewResource?.archived ? " Unarchive" : " Archive"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => previewResource && copyResourceLink(previewResource)}>
                <Copy className="size-4" /> Copy link
              </Button>
              <Button size="sm" onClick={() => previewResource && duplicateResource(previewResource)}>
                <Copy className="size-4" /> Duplicate
              </Button>
              {previewResource?.url && (
                <Button size="sm" asChild>
                  <a href={previewResource.url} target="_blank" rel="noopener noreferrer"><Download className="size-4" /> Open</a>
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{previewResource ? `${previewResource.viewCount} views • ${previewResource.downloadCount} downloads` : ""}</p>
              <p>Created: {formatDate(previewResource?.createdAt || null)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { closePreview() }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Learning Resource</DialogTitle>
            <DialogDescription>Add a new resource to your learning content library. Resources can be shared with learners or kept private.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input placeholder="Resource title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <Textarea placeholder="Description" className="min-h-20" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.resourceType} onValueChange={(value) => setForm((current) => ({ ...current, resourceType: value }))}>
                <SelectTrigger><SelectValue placeholder="Resource type" /></SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={form.subjectId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, subjectId: value === "none" ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General resource</SelectItem>
                  {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.classId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, classId: value === "none" ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All assigned classes</SelectItem>
                  {classes.map((classItem) => <SelectItem key={classItem.id} value={classItem.id}>{classItem.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} />
              <label htmlFor="isPublic" className="text-sm font-medium cursor-pointer">Share with all learners in my classes</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createResource} disabled={acting || !form.title}>
              {acting ? "Creating..." : "Create resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
