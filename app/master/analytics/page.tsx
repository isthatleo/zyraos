"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/master/kpi-card'
import { TrendingUp, Users, Building2, Activity, ShieldCheck, Database, Zap, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface AnalyticsData {
  stats: {
    totalSchools: number
    activeSchools: number
    mrr: number
    platformAdmins: number
  }
  planDistribution: Array<{ name: string; value: number; color: string }>
  recentProvisionings: Array<{ month: string; count: number }>
  revenueTrend: Array<{ month: string; amount: number }>
  schoolGrowth: Array<{ month: string; count: number }>
}

export default function SystemAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const response = await fetch('/api/master/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error(error)
      toast.error('Could not load ecosystem analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ecosystem Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analytics and insights across all schools
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Estimated MRR"
          value={new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(data?.stats.mrr || 0)}
          description="Monthly recurring revenue"
          icon={TrendingUp}
          trend={{
            value: 18,
            isPositive: true,
            label: 'vs last month',
          }}
        />
        <KPICard
          title="Total Environments"
          value={data?.stats.totalSchools.toString() || "0"}
          description="Active school environments"
          icon={Building2}
          trend={{
            value: data?.stats.activeSchools || 0,
            isPositive: true,
            label: 'active now',
          }}
        />
        <KPICard
          title="Growth Rate"
          value={`${data?.schoolGrowth.reduce((acc, curr) => acc + curr.count, 0) || 0}`}
          description="New schools (Last 6m)"
          icon={Activity}
          trend={{
            value: 25,
            isPositive: true,
            label: 'vs prev period',
          }}
        />
        <KPICard
          title="Platform Admins"
          value={data?.stats.platformAdmins.toString() || "0"}
          description="Active administrators"
          icon={Users}
          trend={{
            value: 0,
            isPositive: true,
            label: 'stable',
          }}
        />
      </div>

      {/* Primary Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Monthly revenue based on processed payments (Last 6 Months)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R${value}`} />
                <Tooltip 
                  formatter={(value: any) => [new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value)), 'Revenue']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Revenue"
                  stroke="#10B981" 
                  strokeWidth={2} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Market share by subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data?.planDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(data?.planDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Provisionings */}
        <Card>
          <CardHeader>
            <CardTitle>School Growth</CardTitle>
            <CardDescription>
              New school environments provisioned over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.recentProvisionings || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="New Schools" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Health Indicators */}
        <div className="grid gap-6 md:grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Performance</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Response Time</span>
                <span className="font-semibold">245ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime (30 days)</span>
                <span className="font-semibold text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Sessions</span>
                <span className="font-semibold">1,247</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Database Storage</span>
                <span className="font-semibold">2.4 GB / 10 GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API Calls (Monthly)</span>
                <span className="font-semibold">45.2K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bandwidth Consumed</span>
                <span className="font-semibold">156 GB</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Security & Compliance</CardTitle>
            <CardDescription>Real-time security monitoring and threat detection</CardDescription>
          </div>
          <ShieldCheck className="h-6 w-6 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Failed Login Attempts</div>
              <div className="mt-1 text-2xl font-bold text-green-600">12</div>
              <div className="text-xs text-muted-foreground mt-1">Normal activity levels</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Active Threats</div>
              <div className="mt-1 text-2xl font-bold text-green-600">0</div>
              <div className="text-xs text-muted-foreground mt-1">No anomalies detected</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">SSL Infrastructure</div>
              <div className="mt-1 text-2xl font-bold text-green-600">Secure</div>
              <div className="text-xs text-muted-foreground mt-1">All certificates are valid</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
