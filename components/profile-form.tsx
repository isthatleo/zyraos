"use client"

import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Upload, User, Mail, Shield, Calendar, Camera } from "lucide-react"

export function ProfileForm() {
  const { data: session, isPending, error } = authClient.useSession()
  const [isUpdating, setIsUpdating] = useState(false)
  const [name, setName] = useState("")
  const [image, setImage] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setImage(session.user.image || "")
    }
  }, [session])

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
      } else {
        toast.success("Profile updated successfully")
        setPreviewUrl("")
      }
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
                  <AvatarImage src={previewUrl || user.image || undefined} className="object-cover" />
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
              <CardTitle className="text-xl">{user.name}</CardTitle>
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
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={isUpdating || (name === user.name && !previewUrl)}
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
