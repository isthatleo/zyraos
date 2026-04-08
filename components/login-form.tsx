"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { GraduationCap, Users, UserCheck, Shield, ArrowLeft, Crown } from "lucide-react"

const roleConfig = {
  master: {
    title: "Super Admin Login",
    subtitle: "Platform administration and multi-tenant management",
    icon: Crown,
    color: "text-red-600",
    redirectPath: "/master/dashboard"
  },
  student: {
    title: "Student Login",
    subtitle: "Access your academic dashboard",
    icon: GraduationCap,
    color: "text-blue-600",
    redirectPath: "/student/dashboard"
  },
  parent: {
    title: "Parent Login",
    subtitle: "Monitor your child's progress",
    icon: Users,
    color: "text-green-600",
    redirectPath: "/parent/dashboard"
  },
  staff: {
    title: "Staff Login",
    subtitle: "Manage classes and students",
    icon: UserCheck,
    color: "text-purple-600",
    redirectPath: "/staff/dashboard"
  },
  hr: {
    title: "HR Login",
    subtitle: "Staff and payroll management",
    icon: UserCheck,
    color: "text-purple-600",
    redirectPath: "/hr/dashboard"
  },
  accountant: {
    title: "Finance Login",
    subtitle: "Institutional finance and fees",
    icon: Shield,
    color: "text-green-600",
    redirectPath: "/accountant/dashboard"
  },
  admin: {
    title: "Admin Login",
    subtitle: "Full system administration",
    icon: Shield,
    color: "text-orange-600",
    redirectPath: "/admin/dashboard"
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams?.get("role")
  const role = roleParam || "student"
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.student
  const Icon = config.icon

  // Back always goes to role selection
  const backLink = "/login"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const response = await authClient.signIn.email({
        email,
        password,
      })
      
      if (response.error) {
        toast.error(response.error.message || "Failed to sign in")
        setLoading(false)
        return
      }
      
      toast.success("Signed in successfully!")
      router.push(config.redirectPath)
    } catch (err) {
      toast.error("An error occurred while signing in")
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Back to roles button */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(backLink)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to roles
                </Button>
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`p-3 rounded-full bg-primary/10 ${config.color} mb-2`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">{config.title}</h1>
                <p className="text-balance text-muted-foreground">
                  {config.subtitle}
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/signup" className="underline underline-offset-4 hover:text-primary">Sign up</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-gradient-to-br from-primary/10 to-chart-1/10 md:flex items-center justify-center">
            <div className="text-center p-8">
              <Image src="/images/roxan-logo.png" alt="Roxan" width={80} height={80} className="mx-auto mb-4" />
              <p className="text-2xl font-bold text-foreground">Roxan</p>
              <p className="text-sm text-muted-foreground">Education Operations System</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
