"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Filter,
  Download,
  User,
  Settings,
  Shield,
  Database,
  Mail,
  Loader2,
  RefreshCw,
  X
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ActivityLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  ip: string
  status: string
  details: string
}

const getActionIcon = (action: string) => {
  const normalizedAction = action.toLowerCase()
  if (normalizedAction.includes('school')) return <Database className="h-4 w-4" />
  if (normalizedAction.includes('login')) return <User className="h-4 w-4" />
  if (normalizedAction.includes('settings')) return <Settings className="h-4 w-4" />
  if (normalizedAction.includes('invoice')) return <Mail className="h-4 w-4" />
  if (normalizedAction.includes('backup')) return <Database className="h-4 w-4" />
  if (normalizedAction.includes('security')) return <Shield className="h-4 w-4" />
  return <Settings className="h-4 w-4" />
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'success':
      return 'bg-green-100 text-green-700'
    case 'warning':
      return 'bg-yellow-100 text-yellow-700'
    case 'error':
    case 'failed':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [actionFilter, setActionFilter] = useState<string[]>([])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/master/activity')
      const data = await response.json()
      if (data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const statuses = Array.from(new Set(logs.map(log => log.status)))
  const actions = Array.from(new Set(logs.map(log => log.action)))

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(log.status)
    const matchesAction = actionFilter.length === 0 || actionFilter.includes(log.action)

    return matchesSearch && matchesStatus && matchesAction
  })

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Activity Log
          </h1>
          <p className="text-gray-600">
            Monitor system activities and user actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className="gap-2 rounded-full border-gray-200">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, action, resource or details..."
                  className="pl-10 rounded-full border-gray-200 bg-white focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full border-gray-200">
                    <Filter className="h-4 w-4" />
                    Status {statusFilter.length > 0 && `(${statusFilter.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statuses.map(status => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        setStatusFilter(prev => 
                          checked ? [...prev, status] : prev.filter(s => s !== status)
                        )
                      }}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {statusFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setStatusFilter([])}
                      >
                        Clear Status Filters
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full border-gray-200">
                    <Filter className="h-4 w-4" />
                    Action {actionFilter.length > 0 && `(${actionFilter.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Action</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    {actions.map(action => (
                      <DropdownMenuCheckboxItem
                        key={action}
                        checked={actionFilter.includes(action)}
                        onCheckedChange={(checked) => {
                          setActionFilter(prev => 
                            checked ? [...prev, action] : prev.filter(a => a !== action)
                          )
                        }}
                      >
                        {action}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                  {actionFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setActionFilter([])}
                      >
                        Clear Action Filters
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {(statusFilter.length > 0 || actionFilter.length > 0 || searchTerm) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter([])
                    setActionFilter([])
                  }}
                >
                  Reset All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50">
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Timestamp</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">User</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Action</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Resource</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">IP Address</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span>Loading activity logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No activity logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="py-4 px-4 text-sm text-gray-600 font-mono">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {log.user === 'System' ? (
                              <Settings className="h-4 w-4 text-gray-600" />
                            ) : (
                              <User className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{log.user}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm font-medium">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {log.resource}
                        </code>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Badge variant="secondary" className={`${getStatusColor(log.status)} rounded-full px-2.5 py-0.5 text-xs font-medium border-none`}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600 font-mono">
                        {log.ip}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
