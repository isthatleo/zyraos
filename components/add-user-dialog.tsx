"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Copy, Plus } from "lucide-react"
import { toast } from "sonner"

type TenantRoleOption = {
  id: string
  name: string
}

type AccessResult = {
  email: string
  temporaryPassword: string
  loginUrl: string
}

export function AddUserDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roles, setRoles] = useState<TenantRoleOption[]>([])
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  })

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadRoles() {
      const tenantSlug = window.location.pathname.split("/")[1]
      if (!tenantSlug) return
      setRolesLoading(true)
      try {
        const response = await fetch(`/api/tenant/roles?tenant=${tenantSlug}`, {
          cache: "no-store",
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to load roles")
        const nextRoles = data.roles || []
        if (!cancelled) {
          setRoles(nextRoles)
          setFormData((current) => ({
            ...current,
            role: current.role || nextRoles[0]?.id || "",
          }))
        }
      } catch (error) {
        console.error("Error loading roles:", error)
        toast.error("Failed to load tenant roles")
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    }

    loadRoles()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const name = `${formData.firstName} ${formData.lastName}`.trim()

      // Get tenant slug from URL or context
      const tenantSlug = window.location.pathname.split("/")[1] // Assuming URL structure like /tenant-slug/...

      const response = await fetch(
        `/api/tenant/users/create-with-access?tenant=${tenantSlug}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            name,
            roleId: formData.role, // This might need to be mapped to actual role IDs
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user account")
      }

      setAccessResult({
        email: formData.email,
        temporaryPassword: data.temporaryPassword,
        loginUrl: data.loginUrl,
      })
      toast.success("User account created with temporary access")
      setFormData({ firstName: "", lastName: "", email: "", role: "" })
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a user account with a temporary password that must be changed on first login.
          </DialogDescription>
        </DialogHeader>
        {accessResult ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold">Temporary access created</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this credential securely. The user must change it before entering their dashboard.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border bg-muted/30 p-4 text-sm">
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
            <div className="flex justify-end gap-2">
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
                  setAccessResult(null)
                  setOpen(false)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              disabled={rolesLoading}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={rolesLoading ? "Loading tenant roles..." : "Select role"} />
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
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground"
              disabled={loading || rolesLoading || !formData.role}
            >
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
