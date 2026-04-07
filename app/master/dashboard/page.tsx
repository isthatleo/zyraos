"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, DollarSign, Activity, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { KPICard } from '@/components/master/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'

interface SchoolInfo {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  subscriptionPlan?: string
}

export default function MasterDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalRevenue: 0,
    systemStatus: 'healthy' as const,
  })
  const [recentSchools, setRecentSchools] = useState<SchoolInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/master/dashboard')
        const data = await response.json()
        
        setStats(data.stats)
        setRecentSchools(data.recentSchools)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    trial: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of all schools and system metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Schools"
          value={stats.totalSchools}
          description="Active and inactive"
          icon={Building2}
          trend={{
            value: 12,
            isPositive: true,
            label: 'this month',
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="Active Schools"
          value={stats.activeSchools}
          description="Currently active"
          icon={Activity}
          trend={{
            value: 8,
            isPositive: true,
            label: 'this month',
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="Monthly Revenue"
          value={stats.totalRevenue > 1000 ? `R${(stats.totalRevenue / 1000).toFixed(1)}k` : `R${stats.totalRevenue}`}
          description="Estimated MRR"
          icon={DollarSign}
          trend={{
            value: 15,
            isPositive: true,
            label: 'vs last month',
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="System Status"
          value={stats.systemStatus === 'healthy' ? '✓ Healthy' : '⚠ Warning'}
          description="All systems operational"
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* Recent School Provisioning */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent School Provisioning</CardTitle>
              <CardDescription>
                Latest schools provisioned in the system
              </CardDescription>
            </div>
            <Link href="/master/schools">
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.slug}</TableCell>
                    <TableCell>{school.subscriptionPlan}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[school.status]}>
                        {school.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {school.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/master/schools/${school.id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
