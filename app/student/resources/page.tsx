"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Download,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Library,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Printer,
  RefreshCcw,
  Search,
  Star,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Resource = {
  id: string
  title: string
  description: string
  kind: string
  url: string
  size: string
  sourceId: string
  subjectId: string
  subject: string
  subjectCode: string
  teacher: string
  createdAt: string | null
  dueDate: string | null
  assessmentType: string
  saved: boolean
  viewed: boolean
  downloaded: boolean
}

type LibraryBook = {
  id: string
  title: string
  author: string
  category: string
  shelf: string
  isbn: string
  copies: number
  available: number
  status: string
  notes: string
  saved: boolean
  reserved: boolean
}

type ResourcesPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string }
  student?: { id: string; userId: string; admissionNumber: string; className: string; classTeacher: string; classTeacherId: string; term: string; academicYear: string }
  metrics?: { resources: number; books: number; saved: number; viewed: number; downloaded: number; availableBooks: number }
  subjects: Array<{ id: string; name: string; code: string; type: string }>
  resources: Resource[]
  books: LibraryBook[]
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null }>
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ResourcesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<ResourcesPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [actingId, setActingId] = React.useState("")
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [subjectFilter, setSubjectFilter] = React.useState("all")
  const [kindFilter, setKindFilter] = React.useState("all")
  const [selectedResource, setSelectedResource] = React.useState<Resource | null>(null)
  const [selectedBook, setSelectedBook] = React.useState<LibraryBook | null>(null)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/resources?tenant=${encodeURIComponent(tenant)}` : "/api/student/resources"
  }, [tenantPrefix])

  const loadResources = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load learning resources")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as ResourcesPayload)
    setLoading(false)
    if (notify) toast.success("Resources refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadResources()
  }, [loadResources])

  const resources = payload?.resources || []
  const books = payload?.books || []
  const subjects = payload?.subjects || []
  const kinds = Array.from(new Set(resources.map((resource) => resource.kind).filter(Boolean)))
  const savedResources = resources.filter((resource) => resource.saved)
  const savedBooks = books.filter((book) => book.saved || book.reserved)
  const dueSoonResources = resources
    .filter((resource) => {
      if (!resource.dueDate) return false
      const due = new Date(resource.dueDate).getTime()
      const now = Date.now()
      return Number.isFinite(due) && due >= now - 24 * 60 * 60 * 1000 && due <= now + 14 * 24 * 60 * 60 * 1000
    })
    .toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
    .slice(0, 5)
  const continueLearning = resources
    .filter((resource) => resource.viewed && !resource.downloaded)
    .concat(resources.filter((resource) => !resource.viewed))
    .slice(0, 4)
  const unavailableBooks = books.filter((book) => book.available <= 0)

  const filteredResources = resources.filter((resource) => {
    const haystack = `${resource.title} ${resource.subject} ${resource.kind} ${resource.teacher}`.toLowerCase()
    return (subjectFilter === "all" || resource.subjectId === subjectFilter) && (kindFilter === "all" || resource.kind === kindFilter) && haystack.includes(query.toLowerCase())
  })
  const filteredBooks = books.filter((book) => `${book.title} ${book.author} ${book.category} ${book.shelf}`.toLowerCase().includes(query.toLowerCase()))

  const refresh = () => {
    setRefreshing(true)
    void loadResources(true).finally(() => setRefreshing(false))
  }

  const runAction = async (action: string, resourceId: string, notify: string) => {
    setActingId(resourceId)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resourceId }),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Action failed"))
      return
    }
    toast.success(notify)
    void loadResources()
  }

  const openResource = (resource: Resource) => {
    setSelectedResource(resource)
    void runAction("view", resource.id, "Resource marked as viewed")
  }

  const downloadResource = (resource: Resource) => {
    if (resource.url) {
      const opened = window.open(resource.url, "_blank", "noopener,noreferrer")
      if (!opened) toast.warning("Pop-up blocked. Use the resource details dialog to copy or open the link.")
    } else {
      downloadFile(`${resource.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`, resource.description || resource.title, "text/plain")
    }
    void runAction("download", resource.id, "Download recorded")
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-learning-resources.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Resources export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["section", "title", "subject_or_category", "type", "status", "date"],
      ...resources.map((resource) => [
        "resource",
        resource.title,
        resource.subject,
        resource.kind,
        [resource.saved ? "saved" : "", resource.viewed ? "viewed" : "", resource.downloaded ? "downloaded" : ""].filter(Boolean).join(" ") || "available",
        formatDate(resource.createdAt),
      ]),
      ...books.map((book) => [
        "library",
        book.title,
        book.category,
        book.author,
        book.reserved ? "reserved" : book.available > 0 ? "available" : "unavailable",
        book.shelf,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-learning-resources.csv", csv, "text/csv")
    toast.success("Resources CSV downloaded")
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what resource help you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Student resource support request", message, category: "academic", priority: "normal", dashboardArea: "student-resources" }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send support request"))
      return
    }
    setHelpMessage("")
    setHelpOpen(false)
    toast.success("Support request sent")
  }

  const sendTeacherMessage = async () => {
    const message = messageBody.trim()
    if (!payload?.student?.classTeacherId) {
      router.push(studentHref("/student/communication"))
      toast.info("Open communication to select a staff member")
      return
    }
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "teacher-message", message }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send message"))
      return
    }
    setMessageBody("")
    setMessageOpen(false)
    toast.success("Message sent")
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Resources could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadResources(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,rgba(34,197,94,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <GraduationCap className="mr-1 size-3.5" />
                  {payload?.student?.term || "Current term"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name || "School"}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.student?.className || "Class"}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Learning Resources</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live course files, teacher instructions, study packs, and library books for {payload?.currentUser?.name || "this student"}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" onClick={exportJson} disabled={!payload}>
                <Download className="size-4" />
                Export
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv} disabled={!payload}>
                <Download className="size-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print
              </Button>
              <Button type="button" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Resource help
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Course Resources", value: payload?.metrics?.resources ?? resources.length, helper: `${payload?.metrics?.viewed ?? 0} viewed`, icon: FileText },
          { label: "Library Books", value: payload?.metrics?.books ?? books.length, helper: `${payload?.metrics?.availableBooks ?? 0} available`, icon: Library },
          { label: "Saved", value: payload?.metrics?.saved ?? 0, helper: "Resources and books", icon: Star },
          { label: "Downloads", value: payload?.metrics?.downloaded ?? 0, helper: "Tracked downloads", icon: Download },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{loading ? <Loader2 className="size-6 animate-spin" /> : metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
            <CardDescription>Next resources based on your viewed and downloaded activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {continueLearning.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => openResource(resource)}
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{resource.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{resource.subject} - {resource.kind}</p>
                  </div>
                  <Badge variant="outline">{resource.viewed ? "Resume" : "Start"}</Badge>
                </div>
              </button>
            ))}
            {!continueLearning.length ? <p className="rounded-2xl border p-6 text-center text-sm text-muted-foreground md:col-span-2">No learning queue yet. New resources appear here when teachers publish content.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Actions</CardTitle>
            <CardDescription>Help, messaging, and related student pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}>
              <MessageSquare className="size-4" />
              Message class teacher
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(studentHref("/student/assignments"))}>Open assignments</Button>
            <Button type="button" variant="outline" onClick={() => router.push(studentHref("/student/subjects"))}>Open subjects</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Due Soon Resources</CardTitle>
            <CardDescription>Assessment-linked resources due in the next 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueSoonResources.map((resource) => (
              <div key={resource.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{resource.title}</p>
                  <p className="text-sm text-muted-foreground">{resource.subject} - due {formatDate(resource.dueDate)}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => openResource(resource)}>Open</Button>
              </div>
            ))}
            {!dueSoonResources.length ? <p className="rounded-xl border p-4 text-center text-sm text-muted-foreground">No linked resource deadlines in the next 14 days.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Library Availability</CardTitle>
            <CardDescription>Books that may need a reservation or librarian follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unavailableBooks.slice(0, 5).map((book) => (
              <div key={book.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{book.title}</p>
                  <p className="text-sm text-muted-foreground">{book.author || "Unknown author"} - currently unavailable</p>
                </div>
                <Badge variant="outline">0 available</Badge>
              </div>
            ))}
            {!unavailableBooks.length ? <p className="rounded-xl border p-4 text-center text-sm text-muted-foreground">All listed library books currently have available copies.</p> : null}
          </CardContent>
        </Card>
      </section>

      {resources.some((resource) => !resource.url && resource.kind !== "instructions") ? (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
            <div>
              <p className="font-medium">Some files are missing download links</p>
              <p className="text-sm text-muted-foreground">They remain readable from the details dialog, and the support action can notify the school about missing attachments.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search resources, books, subjects, authors..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {kinds.map((kind) => <SelectItem key={kind} value={kind}>{kind}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="resources">Course Resources</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="grid gap-4 lg:grid-cols-2">
          {filteredResources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.subject} - {resource.teacher}</CardDescription>
                  </div>
                  <Badge variant="outline">{resource.kind}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{resource.description || "No description provided."}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{resource.size}</Badge>
                  <Badge variant="outline">{formatDate(resource.createdAt)}</Badge>
                  {resource.viewed ? <Badge variant="outline">Viewed</Badge> : null}
                  {resource.downloaded ? <Badge variant="outline">Downloaded</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => openResource(resource)}>
                    <Eye className="size-4" />
                    Open
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => downloadResource(resource)}>
                    <Download className="size-4" />
                    Download
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={actingId === resource.id} onClick={() => void runAction(resource.saved ? "unsave" : "save", resource.id, resource.saved ? "Removed from saved" : "Saved")}>
                    <Star className="size-4" />
                    {resource.saved ? "Saved" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filteredResources.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">{loading ? "Loading resources..." : "No course resources match the current filters."}</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="library" className="grid gap-4 lg:grid-cols-2">
          {filteredBooks.map((book) => (
            <Card key={book.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{book.title}</CardTitle>
                    <CardDescription>{book.author || "Unknown author"} - {book.category}</CardDescription>
                  </div>
                  <Badge variant="outline">{book.available} available</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{book.notes || `Shelf ${book.shelf || "not assigned"} ${book.isbn ? `- ISBN ${book.isbn}` : ""}`}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedBook(book)}>
                    <BookOpen className="size-4" />
                    Details
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={actingId === book.id} onClick={() => void runAction(book.saved ? "unsave" : "save", book.id, book.saved ? "Removed from saved" : "Book saved")}>
                    <Star className="size-4" />
                    {book.saved ? "Saved" : "Save"}
                  </Button>
                  <Button type="button" size="sm" disabled={(!book.reserved && book.available <= 0) || actingId === book.id} onClick={() => void runAction(book.reserved ? "unreserve" : "reserve", book.id, book.reserved ? "Reservation removed" : "Book reserved")}>
                    <BookMarked className="size-4" />
                    {book.reserved ? "Reserved" : "Reserve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filteredBooks.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">{loading ? "Loading library..." : "No library books match the current search."}</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="saved" className="grid gap-4 lg:grid-cols-2">
          {[...savedResources.map((item) => ({ type: "resource" as const, item })), ...savedBooks.map((item) => ({ type: "book" as const, item }))].map((entry) => (
            <Card key={`${entry.type}_${entry.item.id}`}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{entry.item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.type === "resource" ? entry.item.subject : entry.item.category}</p>
                </div>
                <Badge variant="outline">{entry.type}</Badge>
              </CardContent>
            </Card>
          ))}
          {!savedResources.length && !savedBooks.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Saved resources and book reservations will appear here.</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="activity" className="grid gap-4 lg:grid-cols-2">
          {(payload?.progressNotes || []).map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{note.category || note.type || "Activity"}</p>
                  <Badge variant="outline">{note.value || "Note"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{note.note || "No note text provided."}</p>
              </CardContent>
            </Card>
          ))}
          {!payload?.progressNotes?.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Resource activity will appear after submissions or resource events.</CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedResource)} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedResource?.title}</DialogTitle>
            <DialogDescription>{selectedResource?.subject} learning resource.</DialogDescription>
          </DialogHeader>
          {selectedResource ? (
            <div className="space-y-3 text-sm">
              <p className="rounded-2xl border p-4 text-muted-foreground">{selectedResource.description || "No description available."}</p>
              <p>Teacher: {selectedResource.teacher}</p>
              <p>Created: {formatDate(selectedResource.createdAt)}</p>
            </div>
          ) : null}
          <DialogFooter>
            {selectedResource ? <Button type="button" onClick={() => downloadResource(selectedResource)}>Download</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedBook)} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBook?.title}</DialogTitle>
            <DialogDescription>Library book details and reservation status.</DialogDescription>
          </DialogHeader>
          {selectedBook ? (
            <div className="space-y-2 text-sm">
              <p>Author: {selectedBook.author || "Unknown"}</p>
              <p>Category: {selectedBook.category}</p>
              <p>Shelf: {selectedBook.shelf || "Not assigned"}</p>
              <p>Available: {selectedBook.available} of {selectedBook.copies}</p>
              <p>{selectedBook.notes || "No notes provided."}</p>
            </div>
          ) : null}
          <DialogFooter>
            {selectedBook ? <Button type="button" disabled={!selectedBook.reserved && selectedBook.available <= 0} onClick={() => void runAction(selectedBook.reserved ? "unreserve" : "reserve", selectedBook.id, selectedBook.reserved ? "Reservation removed" : "Book reserved")}>{selectedBook.reserved ? "Remove reservation" : "Reserve"}</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Resource Support</DialogTitle>
            <DialogDescription>This creates a real academic support ticket.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Explain the missing file, broken link, or resource issue..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendHelpRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Class Teacher</DialogTitle>
            <DialogDescription>Send a direct message about learning resources.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendTeacherMessage}>Send message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
