"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CheckCircle, Copy, KeyRound, UserPlus } from "lucide-react"

interface InviteUserFormProps {
  tenantSlug: string
}

type TenantRoleOption = {
  id: string
  name: string
  description?: string
}

type AccessResult = {
  email: string
  temporaryPassword: string
  loginUrl: string
}

export function InviteUserForm({ tenantSlug }: InviteUserFormProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [roleId, setRoleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [roles, setRoles] = useState<TenantRoleOption[]>([])
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRoles() {
      if (!tenantSlug) return
      setRolesLoading(true)
      try {
        const response = await fetch(`/api/tenant/roles?tenant=${tenantSlug}`, {
          cache: "no-store",
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to load roles")
        if (!cancelled) {
          setRoles(data.roles || [])
        }
      } catch (error) {
        console.error("Error loading tenant roles:", error)
        toast.error("Failed to load tenant roles")
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    }

    loadRoles()

    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !name || !roleId) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tenant/users/create-with-access?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          roleId,
          departmentId: null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user account")
      }

      setAccessResult({
        email,
        temporaryPassword: result.temporaryPassword,
        loginUrl: result.loginUrl,
      })
      toast.success("User account created with temporary access")
      setSuccess(true)

      // Reset form
      setEmail("")
      setName("")
      setRoleId("")

    } catch (error) {
      console.error("Error creating user:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New User
        </CardTitle>
        <CardDescription>
          Generate a temporary password and force the user to change it before entering their dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success && accessResult ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Temporary Access Created</h3>
            <p className="text-muted-foreground">
              Share this credential securely. The user must change it after first login.
            </p>
            <div className="mx-auto mt-6 max-w-lg space-y-3 rounded-2xl border bg-muted/30 p-4 text-left text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{accessResult.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Temporary password</p>
                <p className="font-mono text-base font-semibold">{accessResult.temporaryPassword}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Login portal</p>
                <p className="break-all font-medium">{accessResult.loginUrl}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`Email: ${accessResult.email}\nTemporary Password: ${accessResult.temporaryPassword}\nLogin: ${accessResult.loginUrl}`).catch(() => null)}
              >
                <Copy className="size-4" />
                Copy Access
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSuccess(false)
                  setAccessResult(null)
                }}
              >
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={roleId} onValueChange={setRoleId} required disabled={rolesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={rolesLoading ? "Loading tenant roles..." : "Select a role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || rolesLoading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Create Temporary Access
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
