"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Construction, LayoutDashboard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type StudentPlaceholderPageProps = {
  title: string
  description: string
  features?: string[]
}

export function StudentPlaceholderPage({ title, description, features = [] }: StudentPlaceholderPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const segments = (pathname || "").split("/").filter(Boolean)
  const tenantPrefix = segments[1] === "student" ? `/${segments[0]}` : ""

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_34%),linear-gradient(135deg,rgba(34,197,94,0.09),transparent_45%)]" />
          <div className="relative max-w-3xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Construction className="size-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">{description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Implementation Queue</CardTitle>
            <CardDescription>This route is available now and will be expanded without breaking navigation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(features.length ? features : ["Live data feed", "Search and filters", "Student actions", "Export and reports"]).map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl border p-3 text-sm">
                <span className="size-2 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Now</CardTitle>
            <CardDescription>Use completed student sections while this module is being implemented.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-between" asChild>
              <Link href={`${tenantPrefix}/student/dashboard`}>
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="size-4" />
                  Student dashboard
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-between" asChild>
              <Link href={`${tenantPrefix}/student/subjects`}>
                Subjects
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
