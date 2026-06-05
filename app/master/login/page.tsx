"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Building2, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function withTimeout<T>(task: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    task
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId))
  })
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Authentication service timed out. Check the database connection and try again."
  }
  if (message.toLowerCase().includes("timed out")) {
    return `${message}. The database/auth service may be unavailable.`
  }
  return message || "Master authentication failed"
}

export default function MasterLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email || !password) {
      toast.error("Please provide both email and password")
      return
    }

    setLoading(true)
    try {
      const loginResponse = await withTimeout(
        fetch("/api/master/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            email,
            password,
            sessionId: crypto.randomUUID(),
          }),
        }),
        30000,
        "Master authentication timed out"
      )
      const loginPayload = await loginResponse.json().catch(() => ({}))

      if (!loginResponse.ok || !loginPayload?.success) {
        toast.error(loginPayload?.error || "Invalid super admin credentials")
        setLoading(false)
        return
      }

      toast.success("Welcome back")
      router.replace("/master/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-neutral-950 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,.22),transparent_34%),linear-gradient(145deg,rgba(255,255,255,.08),transparent_40%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.11)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Button
            type="button"
            variant="ghost"
            className="w-fit text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Button>

          <div className="max-w-xl space-y-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <Image src="/images/roxan-logo.png" alt="Roxan" width={34} height={34} className="size-9" />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-300">Roxan Control Centre</p>
              <h1 className="text-5xl font-semibold tracking-tight">Secure access for platform operators.</h1>
              <p className="text-base leading-7 text-white/62">
                Manage schools, subscriptions, billing, platform analytics, activity logs, and system-wide settings from the master dashboard.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">Tenant Control</p>
              <p className="mt-1 text-xs">Provision and monitor schools.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">Billing</p>
              <p className="mt-1 text-xs">Plans, invoices, subscriptions.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">Audit</p>
              <p className="mt-1 text-xs">Trace sensitive actions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Master login</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enter your super admin credentials to continue.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="leonardlomude@icloud.com"
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  Recovery
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  This area controls platform-wide schools, subscriptions, billing, analytics, and logs.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">Roxan Education OS. Authorized access only.</p>
        </div>
      </section>
    </main>
  )
}
