"use client"

import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, User, Mail, Shield, Calendar, Camera, Phone, Briefcase, MapPin, Contact, HeartPulse } from "lucide-react"

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

function normalizeProfile(value: Partial<Record<keyof ExtendedProfile, unknown>> = {}): ExtendedProfile {
  return (Object.keys(defaultProfile) as Array<keyof ExtendedProfile>).reduce((next, key) => {
    const raw = value[key]
    next[key] = raw == null ? defaultProfile[key] : String(raw)
    return next
  }, { ...defaultProfile })
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

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setImage(session.user.image || "")
    }
  }, [session])

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/profile", { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const data = await response.json().catch(() => ({}))
      setProfile(normalizeProfile(data.profile || {}))
    })()
  }, [])

  const updateProfileField = (key: keyof ExtendedProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
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
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      const { error } = await authClient.updateUser({
        name: name,
        image: image,
      })

      if (error) {
        toast.error(error.message || "Failed to update profile")
        return
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, name, image }),
      }).catch(() => null)

      if (!response?.ok) {
        toast.error("Basic profile saved, but extended profile failed")
        return
      }

      const data = await response.json().catch(() => ({}))
      setProfile(normalizeProfile(data.profile || profile))
      const detail = { name, image: image ? `/api/profile/avatar?v=${Date.now()}` : null, avatarVersion: Date.now() }
      writeCachedUserProfile(detail)
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT, { detail }))
      await refetch().catch(() => undefined)
      toast.success("Profile updated successfully")
      setPreviewUrl("")
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to view and manage your profile.</p>
        </CardContent>
      </Card>
    )
  }

  const user = session.user

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpdateProfile}>
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left Column: Avatar & Quick Info */}
          <Card className="md:col-span-4 h-fit">
            <CardHeader className="text-center">
              <div className="relative mx-auto w-32 h-32 mb-4 group">
                <Avatar className="w-full h-full border-4 border-background shadow-xl">
                  <AvatarImage src={previewUrl || image || user.image || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="h-8 w-8 text-white" />
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              <CardTitle className="text-xl">{name || user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary" className="capitalize">
                  {(user as any).role?.replace("_", " ") || "user"}
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Separator />
              <div className="space-y-3 pt-2">
                <div className="flex items-center text-sm gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Joined:</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Account ID:</span>
                  <span className="truncate max-w-[120px]" title={user.id}>{user.id}</span>
                </div>
                {profile.phone ? (
                  <div className="flex items-center text-sm gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">Phone:</span>
                    <span className="truncate">{profile.phone}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Edit Form */}
          <Card className="md:col-span-8">
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Update your public profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="name" 
                      placeholder="Your Name" 
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      value={user.email} 
                      disabled 
                      className="pl-9 bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground px-1">
                    Email address cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium mb-4">Security Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-[12px] text-muted-foreground">Enhance your account security.</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>Configure</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">School Profile</h3>
                  <p className="text-sm text-muted-foreground">Role-aware contact and school identity details used across the education system.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Primary Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" className="pl-9" value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="alternateEmail">Alternate Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="alternateEmail" type="email" className="pl-9" value={profile.alternateEmail} onChange={(event) => updateProfileField("alternateEmail", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="jobTitle">Job Title / Learner Status</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="jobTitle" className="pl-9" value={profile.jobTitle} onChange={(event) => updateProfileField("jobTitle", event.target.value)} />
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
                  <div className="grid gap-2">
                    <Label htmlFor="campus">Campus / Branch</Label>
                    <Input id="campus" value={profile.campus} onChange={(event) => updateProfileField("campus", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guardianContact">Guardian Contact</Label>
                    <Input id="guardianContact" value={profile.guardianContact} onChange={(event) => updateProfileField("guardianContact", event.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Location & Preferences</h3>
                  <p className="text-sm text-muted-foreground">Used for scheduling, communication, support, and localized dashboard behavior.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="address" className="pl-9" value={profile.address} onChange={(event) => updateProfileField("address", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={profile.city} onChange={(event) => updateProfileField("city", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={profile.country} onChange={(event) => updateProfileField("country", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" value={profile.timezone} onChange={(event) => updateProfileField("timezone", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="language">Preferred Language</Label>
                    <Input id="language" value={profile.language} onChange={(event) => updateProfileField("language", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <div className="relative">
                      <Contact className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="emergencyContactName" className="pl-9" value={profile.emergencyContactName} onChange={(event) => updateProfileField("emergencyContactName", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <div className="relative">
                      <HeartPulse className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="emergencyContactPhone" className="pl-9" value={profile.emergencyContactPhone} onChange={(event) => updateProfileField("emergencyContactPhone", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                    <Input id="preferredContactMethod" value={profile.preferredContactMethod} onChange={(event) => updateProfileField("preferredContactMethod", event.target.value)} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="bio">Professional / Academic Bio</Label>
                    <Textarea id="bio" rows={4} value={profile.bio} onChange={(event) => updateProfileField("bio", event.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
