"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/status-pill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  SlidersHorizontal,
  Settings,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { useState, useEffect } from "react"

interface School {
  id: string;
  name: string;
  slug: string;
  country: string;
  type: string;
  status: string;
  createdAt: string;
  planName?: string;
  planPrice?: number;
}

const planColors: Record<string, string> = {
  Free: "bg-gray-100 text-gray-700",
  Basic: "bg-blue-100 text-blue-700",
  Standard: "bg-purple-100 text-purple-700",
  Premium: "bg-orange-100 text-orange-700",
}

export function SchoolRegistryTable() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  const fetchSchools = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/master/schools?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch schools')
      }

      const data = await response.json()
      setSchools(data.schools || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching schools:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchools()
  }, [statusFilter])

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRefresh = () => {
    fetchSchools()
  }

  if (error) {
    return (
      <Card className="rounded-xl border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading schools</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search schools..."
              className="pl-10 rounded-full border-gray-200 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Badge variant="outline" className="rounded-full">
          {loading ? "Loading..." : `${filteredSchools.length} schools`}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setStatusFilter(statusFilter === "active" ? "" : "active")}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {statusFilter === "active" ? "Show All" : "Active Only"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50">
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">School Name</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Domain</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Type</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Plan</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Created</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading schools...
                    </TableCell>
                  </TableRow>
                ) : filteredSchools.length > 0 ? (
                  filteredSchools.map((school) => (
                    <TableRow key={school.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{school.name}</p>
                          <p className="text-xs text-gray-500">{school.country}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {school.slug}.roxan.com
                        </code>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <span className="text-sm text-gray-600 capitalize">{school.type}</span>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        {school.planName ? (
                          <Badge className={`${planColors[school.planName] || 'bg-gray-100 text-gray-700'} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                            {school.planName}
                            {school.planPrice && school.planPrice > 0 && ` - $${school.planPrice}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                            No Plan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <StatusPill
                          status={school.status === "active" ? "active" : "inactive"}
                          text={school.status === "active" ? "Active" : "Inactive"}
                        />
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600">
                        {new Date(school.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.location.href = `/master/schools/${school.id}`}
                        >
                          <Settings className="h-4 w-4" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      {searchTerm ? "No schools found matching your search." : "No schools found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
