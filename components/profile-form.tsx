"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  BadgeCheck,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Clipboard,
  Contact,
  Download,
  HeartPulse,
  IdCard,
  Languages,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  Sparkles,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { CityInput, CountrySelect, PhoneNumberField } from "@/components/shared/localized-fields"

type ExtendedProfile = {
  phone: string
  alternateEmail: string
  jobTitle: string
  department: string
  employeeCode: string
  admissionNumber: string
  guardianContact: string
  campus: string
  address: string
  city: string
  country: string
  timezone: string
  language: string
  bio: string
  emergencyContactName: string
  emergencyContactPhone: string
  preferredContactMethod: string
}

type ApiProfileUser = {
  id: string
  name?: string | null
  email: string
  role?: string | null
  image?: string | null
  createdAt?: string | Date | null
}

const defaultProfile: ExtendedProfile = {
  phone: "",
  alternateEmail: "",
  jobTitle: "",
  department: "",
  employeeCode: "",
  admissionNumber: "",
  guardianContact: "",
  campus: "",
  address: "",
  city: "",
  country: "",
  timezone: "Africa/Kampala",
  language: "English",
  bio: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  preferredContactMethod: "in_app",
}

const profileCompletionFields: Array<keyof ExtendedProfile | "name" | "image"> = [
  "name",
  "image",
  "phone",
  "alternateEmail",
  "jobTitle",
  "department",
  "address",
  "city",
  "country",
  "emergencyContactName",
  "emergencyContactPhone",
  "bio",
]

function normalizeProfile(value: Partial<Record<keyof ExtendedProfile, unknown>> = {}): ExtendedProfile {
  return (Object.keys(defaultProfile) as Array<keyof ExtendedProfile>).reduce((next, key) => {
    const raw = value[key]
    next[key] = raw == null ? defaultProfile[key] : String(raw)
    return next
  }, { ...defaultProfile })
}

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "User"
  return source
    .split(/[ @._-]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatRole(role?: string | null) {
  return String(role || "user").replace(/_/g, " ")
}

function getProfilePath() {
  if (typeof window === "undefined") return "/profile"
  const parts = window.location.pathname.split("/").filter(Boolean)
  if (parts[0] === "master") return "/master/profile"
  if (parts[1] === "owner") return `/${parts[0]}/owner/profile`
  if (parts.length > 1) return `/${parts[0]}/${parts[1]}/profile`
  return "/profile"
}

function getSettingsPath() {
  if (typeof window === "undefined") return "/settings"
  const parts = window.location.pathname.split("/").filter(Boolean)
  if (parts[0] === "master") return "/master/settings"
  if (parts[1] === "owner") return `/${parts[0]}/owner/user-settings`
  if (parts.length > 1) return `/${parts[0]}/${parts[1]}/settings`
  return "/settings"
}

export const USER_PROFILE_UPDATED_EVENT = "roxan:user-profile-updated"
export const USER_PROFILE_CACHE_KEY = "roxan:user-profile-cache"

export type UserProfileUpdateDetail = {
  name?: string
  image?: string | null
  avatarVersion?: number
}

export function readCachedUserProfile(): UserProfileUpdateDetail | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeCachedUserProfile(detail: UserProfileUpdateDetail) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(detail))
  } catch {
    // Large data-url avatars may exceed storage quota; event sync still updates the current tab.
  }
}

export function ProfileForm() {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [isUpdating, setIsUpdating] = useState(false)
  const [name, setName] = useState("")
  const [image, setImage] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [profile, setProfile] = useState<ExtendedProfile>(defaultProfile)
  const [apiUser, setApiUser] = useState<ApiProfileUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setImage(session.user.image || "")
    }
  }, [session])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" }).catch(() => null)
        if (!response?.ok) return
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (data.currentUser) {
          setApiUser(data.currentUser)
          setName((current) => current || data.currentUser.name || "")
          setImage((current) => current || data.currentUser.image || "")
        }
        setProfile(normalizeProfile(data.profile || {}))
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const updateProfileField = (key: keyof ExtendedProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const user = (apiUser || session?.user) as ApiProfileUser | undefined
  const role = formatRole((user as { role?: string } | undefined)?.role)
  const joinedAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Not recorded"
  const profilePath = getProfilePath()
  const settingsPath = getSettingsPath()

  const completion = useMemo(() => {
    const completed = profileCompletionFields.filter((field) => {
      if (field === "name") return Boolean(name.trim())
      if (field === "image") return Boolean(image || user?.image)
      return Boolean(profile[field].trim())
    }).length
    return Math.round((completed / profileCompletionFields.length) * 100)
  }, [image, name, profile, user?.image])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setPreviewUrl(base64String)
      setImage(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleCopyAccountId = async () => {
    if (!user?.id) return
    await navigator.clipboard.writeText(user.id).catch(() => undefined)
    toast.success("Account ID copied")
  }

  const handleDownloadContact = () => {
    if (!user) return
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name || user.name || "User"}`,
      `EMAIL:${user.email}`,
      profile.phone ? `TEL:${profile.phone}` : "",
      profile.jobTitle ? `TITLE:${profile.jobTitle}` : "",
      profile.department ? `ORG:${profile.department}` : "",
      profile.address ? `ADR:;;${profile.address};${profile.city};${profile.country};;;` : "",
      "END:VCARD",
    ].filter(Boolean).join("\n")
    const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${(name || user.name || "profile").replace(/\s+/g, "-").toLowerCase()}.vcf`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Contact card downloaded")
  }

  const handleResetAvatar = () => {
    setPreviewUrl("")
    setImage("")
    toast.info("Avatar cleared. Save changes to persist.")
  }

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsUpdating(true)

    try {
      if (!name.trim()) {
        toast.error("Full name is required")
        return
      }
      if (profile.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.alternateEmail)) {
        toast.error("Alternate email must be valid")
        return
      }

      if (session?.user) {
        const { error } = await authClient.updateUser({ name, image })
        if (error) {
          toast.error(error.message || "Failed to update profile")
          return
        }
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, name, image }),
      }).catch(() => null)

      if (!response?.ok) {
        const data = await response?.json().catch(() => ({}))
        toast.error(data?.error || "Failed to save profile")
        return
      }

      const data = await response.json().catch(() => ({}))
      setProfile(normalizeProfile(data.profile || profile))
      if (data.currentUser) {
        setApiUser(data.currentUser)
        setName(data.currentUser.name || name)
        setImage(data.currentUser.image || "")
      }
      const avatarVersion = Date.now()
      const nextImage = data.currentUser?.image || image || null
      const detail = { name: data.currentUser?.name || name, image: nextImage ? `/api/profile/avatar?v=${avatarVersion}` : null, avatarVersion }
      writeCachedUserProfile(detail)
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail }))
      await refetch().catch(() => undefined)
      setLastSavedAt(new Date().toLocaleTimeString())
      toast.success("Profile updated successfully")
      setPreviewUrl("")
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  if ((isPending || profileLoading) && !session?.user && !apiUser) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border bg-card/70">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Loading profile workspace...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="py-10 text-center">
          <Shield className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please log in to view and manage your profile.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleUpdateProfile} className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_19rem] lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative h-32 w-32 shrink-0">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={previewUrl || image || user.image || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary text-4xl text-primary-foreground">{initials(name || user.name, user.email)}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 flex size-11 cursor-pointer items-center justify-center rounded-2xl border bg-background shadow-md transition hover:bg-muted"
                title="Upload profile image"
              >
                <Camera className="size-5" />
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="capitalize" variant="secondary">{role}</Badge>
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    Active account
                  </Badge>
                </div>
                <h1 className="mt-3 truncate text-3xl font-bold tracking-tight">{name || user.name || "User Profile"}</h1>
                <p className="mt-1 truncate text-muted-foreground">{user.email}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Profile completion</p>
                  <p className="mt-1 text-2xl font-semibold">{completion}%</p>
                  <Progress value={completion} className="mt-2" />
                </div>
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="mt-1 text-sm font-semibold">{joinedAt}</p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Contact method</p>
                  <p className="mt-1 text-sm font-semibold capitalize">{profile.preferredContactMethod.replace(/_/g, " ")}</p>
                </div>
              </div>
              {lastSavedAt ? (
                <p className="text-xs text-muted-foreground">All profile cards refreshed from the saved record at {lastSavedAt}.</p>
              ) : null}
            </div>
          </div>

          <div className="grid content-start gap-2">
            <Button type="submit" disabled={isUpdating} className="justify-center">
              {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadContact}>
              <Download className="size-4" />
              Download Contact
            </Button>
            <Button type="button" variant="outline" onClick={handleCopyAccountId}>
              <Clipboard className="size-4" />
              Copy Account ID
            </Button>
            <Button type="button" variant="outline" onClick={handleResetAvatar}>
              <RefreshCw className="size-4" />
              Reset Avatar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold leading-snug">Account Details</h2>
              <CardDescription>Core identity fields used in dashboards, messages, audit logs, and reports.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="name" className="pl-10" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="email" type="email" value={user.email} disabled className="pl-10" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jobTitle">Job Title / Learner Status</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="jobTitle" className="pl-10" value={profile.jobTitle} onChange={(event) => updateProfileField("jobTitle", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department / Class</Label>
                <Input id="department" value={profile.department} onChange={(event) => updateProfileField("department", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employeeCode">Staff Code</Label>
                <Input id="employeeCode" value={profile.employeeCode} onChange={(event) => updateProfileField("employeeCode", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admissionNumber">Admission Number</Label>
                <Input id="admissionNumber" value={profile.admissionNumber} onChange={(event) => updateProfileField("admissionNumber", event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold leading-snug">Contact & Emergency</h2>
              <CardDescription>Primary, alternate, guardian, and emergency contacts for operational workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <PhoneNumberField id="phone" label="Primary Phone" value={profile.phone} country={profile.country} onChange={(value) => updateProfileField("phone", value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alternateEmail">Alternate Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="alternateEmail" type="email" className="pl-10" value={profile.alternateEmail} onChange={(event) => updateProfileField("alternateEmail", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guardianContact">Guardian Contact</Label>
                <Input id="guardianContact" value={profile.guardianContact} onChange={(event) => updateProfileField("guardianContact", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select value={profile.preferredContactMethod} onValueChange={(value) => updateProfileField("preferredContactMethod", value)}>
                  <SelectTrigger id="preferredContactMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-app</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="phone">Phone call</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <div className="relative">
                  <Contact className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="emergencyContactName" className="pl-10" value={profile.emergencyContactName} onChange={(event) => updateProfileField("emergencyContactName", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <PhoneNumberField id="emergencyContactPhone" label="Emergency Contact Phone" value={profile.emergencyContactPhone} country={profile.country} onChange={(value) => updateProfileField("emergencyContactPhone", value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold leading-snug">Location & Preferences</h2>
              <CardDescription>Localization and campus details used by tenant dashboards and personal workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="address" className="pl-10" value={profile.address} onChange={(event) => updateProfileField("address", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <CityInput id="city" label="City" value={profile.city} country={profile.country} onChange={(value) => updateProfileField("city", value)} />
              </div>
              <div className="grid gap-2">
                <CountrySelect id="country" label="Country" value={profile.country} onChange={(value) => updateProfileField("country", value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="campus">Campus / Branch</Label>
                <Input id="campus" value={profile.campus} onChange={(event) => updateProfileField("campus", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={profile.timezone} onValueChange={(value) => updateProfileField("timezone", value)}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Kampala">Africa/Kampala</SelectItem>
                    <SelectItem value="Africa/Accra">Africa/Accra</SelectItem>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Africa/Johannesburg</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="language">Preferred Language</Label>
                <div className="relative">
                  <Languages className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="language" className="pl-10" value={profile.language} onChange={(event) => updateProfileField("language", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="bio">Professional / Academic Bio</Label>
                <Textarea id="bio" rows={5} value={profile.bio} onChange={(event) => updateProfileField("bio", event.target.value)} maxLength={1200} />
                <p className="text-xs text-muted-foreground">{profile.bio.length}/1200 characters</p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                Save Profile
              </Button>
            </CardFooter>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">Account Controls</h2>
              <CardDescription>Fast actions for this signed-in user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={settingsPath}>
                  <Sparkles className="size-4" />
                  User Settings
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={profilePath}>
                  <User className="size-4" />
                  Refresh Profile Route
                </Link>
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={handleCopyAccountId}>
                <IdCard className="size-4" />
                Copy Secure ID
              </Button>
              <Separator />
              <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <LockKeyhole className="size-4 text-primary" />
                  Security status
                </div>
                <p className="mt-2 text-muted-foreground">Email is locked to the authenticated account. Profile edits are audited on master accounts and scoped per tenant for tenant users.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">Profile Health</h2>
              <CardDescription>Missing fields that improve dashboards and communications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Full name", done: Boolean(name.trim()), icon: User },
                { label: "Avatar", done: Boolean(image || user.image), icon: Camera },
                { label: "Primary phone", done: Boolean(profile.phone), icon: Phone },
                { label: "Emergency contact", done: Boolean(profile.emergencyContactName && profile.emergencyContactPhone), icon: HeartPulse },
                { label: "Location", done: Boolean(profile.city && profile.country), icon: MapPin },
                { label: "Role context", done: Boolean(profile.jobTitle || profile.department), icon: Briefcase },
                { label: "Bio", done: Boolean(profile.bio), icon: Activity },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Badge variant={item.done ? "secondary" : "outline"}>{item.done ? "Set" : "Missing"}</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">Identity Snapshot</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize">{role}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Account ID</span>
                <span className="max-w-36 truncate font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Timezone</span>
                <span>{profile.timezone}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Language</span>
                <span>{profile.language}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}
