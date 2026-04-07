'use client'

import { SchoolRegistryTable } from "@/components/school-registry-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SchoolsPage() {
  const router = useRouter()

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            School Registry
          </h1>
          <p className="text-gray-600">
            Provision and manage isolated school environments.
          </p>
        </div>
        <Button className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm" onClick={() => router.push('/master/schools/provision')}>
          <Plus className="h-4 w-4" />
          Provision New School
        </Button>
      </div>

      {/* School Registry Table */}
      <SchoolRegistryTable />
    </div>
  )
}
