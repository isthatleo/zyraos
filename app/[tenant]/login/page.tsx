"use client"

import { createTenantAuthClient } from "@/lib/tenant-auth-client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Users, UserCheck, Briefcase, Calculator, HardHat, Crown } from "lucide-react"

interface PortalLink {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  color: string
}

const portalLinks: PortalLink[] = [
  {
    title: "Student Portal",
    description: "Access your courses, grades, and assignments",
    href: "/student",
    icon: GraduationCap,
    roles: ["student"],
    color: "bg-blue-500"
  },
  {
    title: "Parent Portal",
    description: "Monitor your child's progress and communicate with teachers",
    href: "/parent",
    icon: Users,
    roles: ["parent"],
    color: "bg-green-500"
  },
  {
    title: "Teacher Dashboard",
    description: "Manage classes, assignments, and student progress",
    href: "/teacher",
    icon: UserCheck,
    roles: ["teacher"],
    color: "bg-purple-500"
  },
  {
    title: "Admin Dashboard",
    description: "School administration and management tools",
    href: "/admin",
    icon: Crown,
    roles: ["admin", "school_admin"],
    color: "bg-red-500"
  },
  {
    title: "Account Dashboard",
    description: "Financial management and accounting",
    href: "/account",
    icon: Calculator,
    roles: ["accountant", "account"],
    color: "bg-yellow-500"
  },
  {
    title: "HR Dashboard",
    description: "Human resources and staff management",
    href: "/hr",
    icon: Briefcase,
    roles: ["hr", "human_resources"],
    color: "bg-indigo-500"
  },
  {
    title: "Staff Portal",
    description: "Staff resources and communications",
    href: "/staff",
    icon: HardHat,
    roles: ["staff", "support_staff"],
    color: "bg-gray-500"
  }
]

export default function SchoolLoginPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const tenantSlug = params?.tenant as string

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authClient = createTenantAuthClient(tenantSlug)
        const { data } = await authClient.getSession()
        if (!data?.user) {
          router.push('/login')
          return
        }

        // Get user role from API
        const response = await fetch('/api/user/role')
        const result = await response.json()
        setUserRole(result.role)
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Check for success message from magic link
    const message = searchParams?.get('message')
    if (message) {
      toast.success(message)
    }
  }, [router, searchParams, tenantSlug])

  const handleSignOut = async () => {
    const authClient = createTenantAuthClient(tenantSlug)
    await authClient.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const availablePortals = portalLinks.filter(portal =>
    portal.roles.some(role => userRole?.includes(role))
  )

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome to Your School Portal</h1>
            <p className="text-muted-foreground mt-2">
              Select your dashboard to continue
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="capitalize">
              {userRole?.replace('_', ' ')}
            </Badge>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePortals.map((portal) => {
            const Icon = portal.icon
            return (
              <Card key={portal.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={portal.href}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${portal.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{portal.title}</CardTitle>
                        <CardDescription>{portal.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      Access {portal.title}
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>

        {availablePortals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No portals available for your current role. Please contact your administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
