'use client'

import { SchoolRegistryTable } from "@/components/school-registry-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Building2, Plus, ShieldCheck, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SchoolsPage() {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-card/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              Platform tenant registry
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">School Registry</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Provision, monitor, and manage isolated school environments across the Roxan Education System.
              </p>
            </div>
          </div>
          <Button className="gap-2 rounded-xl shadow-sm" onClick={() => router.push('/master/schools/provision')}>
            <Plus className="h-4 w-4" />
            Provision New School
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="flex gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Guided provisioning</p>
              <p className="mt-1 text-sm text-muted-foreground">Five-step setup validates school, admin, plan, modules, and final review.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="flex gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Role-ready tenants</p>
              <p className="mt-1 text-sm text-muted-foreground">Selected education level seeds the correct role names and dashboard routes.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="flex gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRight className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Operational handoff</p>
              <p className="mt-1 text-sm text-muted-foreground">Provisioning returns portal URL, owner credentials, invoice, and currency metadata.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SchoolRegistryTable />
    </div>
  )
}
