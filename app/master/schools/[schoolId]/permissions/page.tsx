"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Shield, Users, BookOpen, Calendar, FileText, BarChart3, Settings, MessageSquare, CreditCard, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  icon: React.ReactNode
}

const permissions: Permission[] = [
  // User Management
  { id: 'user.view', name: 'View Users', description: 'View user profiles and basic information', category: 'User Management', icon: <Users className="h-4 w-4" /> },
  { id: 'user.create', name: 'Create Users', description: 'Add new users to the system', category: 'User Management', icon: <Users className="h-4 w-4" /> },
  { id: 'user.edit', name: 'Edit Users', description: 'Modify user information and settings', category: 'User Management', icon: <Users className="h-4 w-4" /> },
  { id: 'user.delete', name: 'Delete Users', description: 'Remove users from the system', category: 'User Management', icon: <Users className="h-4 w-4" /> },
  { id: 'user.roles', name: 'Manage Roles', description: 'Assign and modify user roles', category: 'User Management', icon: <Shield className="h-4 w-4" /> },

  // Academic Management
  { id: 'academic.view', name: 'View Academic Data', description: 'Access student grades, attendance, and academic records', category: 'Academic Management', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'academic.create', name: 'Create Academic Records', description: 'Add new grades, assignments, and academic data', category: 'Academic Management', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'academic.edit', name: 'Edit Academic Records', description: 'Modify existing academic information', category: 'Academic Management', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'academic.delete', name: 'Delete Academic Records', description: 'Remove academic data and records', category: 'Academic Management', icon: <BookOpen className="h-4 w-4" /> },

  // Scheduling
  { id: 'schedule.view', name: 'View Schedules', description: 'Access class schedules and timetables', category: 'Scheduling', icon: <Calendar className="h-4 w-4" /> },
  { id: 'schedule.create', name: 'Create Schedules', description: 'Create new class schedules and events', category: 'Scheduling', icon: <Calendar className="h-4 w-4" /> },
  { id: 'schedule.edit', name: 'Edit Schedules', description: 'Modify existing schedules and timetables', category: 'Scheduling', icon: <Calendar className="h-4 w-4" /> },

  // Communication
  { id: 'communication.view', name: 'View Messages', description: 'Read messages and announcements', category: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'communication.send', name: 'Send Messages', description: 'Send messages to users and groups', category: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'communication.announce', name: 'Create Announcements', description: 'Post school-wide announcements', category: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },

  // Reports & Analytics
  { id: 'reports.view', name: 'View Reports', description: 'Access various system reports and analytics', category: 'Reports & Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'reports.generate', name: 'Generate Reports', description: 'Create custom reports and export data', category: 'Reports & Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'reports.advanced', name: 'Advanced Analytics', description: 'Access detailed analytics and insights', category: 'Reports & Analytics', icon: <BarChart3 className="h-4 w-4" /> },

  // Financial Management
  { id: 'finance.view', name: 'View Financial Data', description: 'Access fee structures and payment records', category: 'Financial Management', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'finance.fees', name: 'Manage Fees', description: 'Set up and modify fee structures', category: 'Financial Management', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'finance.payments', name: 'Process Payments', description: 'Handle payment processing and records', category: 'Financial Management', icon: <CreditCard className="h-4 w-4" /> },

  // System Administration
  { id: 'system.settings', name: 'System Settings', description: 'Modify school-wide system settings', category: 'System Administration', icon: <Settings className="h-4 w-4" /> },
  { id: 'system.backup', name: 'Data Backup', description: 'Access backup and restore functionality', category: 'System Administration', icon: <Settings className="h-4 w-4" /> },
  { id: 'system.integrations', name: 'Manage Integrations', description: 'Configure third-party integrations', category: 'System Administration', icon: <Settings className="h-4 w-4" /> },

  // School Management
  { id: 'school.profile', name: 'School Profile', description: 'Edit school information and settings', category: 'School Management', icon: <Building2 className="h-4 w-4" /> },
  { id: 'school.structure', name: 'School Structure', description: 'Manage grades, classes, and departments', category: 'School Management', icon: <Building2 className="h-4 w-4" /> },
]

const categories = Array.from(new Set(permissions.map(p => p.category)))

export default function PermissionsPage() {
  const params = useParams()
  const schoolId = (params?.schoolId as string) || ''
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set([
    'user.view', 'academic.view', 'schedule.view', 'communication.view', 'reports.view'
  ]))

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const newPermissions = new Set(selectedPermissions)
    if (checked) {
      newPermissions.add(permissionId)
    } else {
      newPermissions.delete(permissionId)
    }
    setSelectedPermissions(newPermissions)
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    const categoryPermissions = permissions.filter(p => p.category === category).map(p => p.id)
    const newPermissions = new Set(selectedPermissions)

    if (checked) {
      categoryPermissions.forEach(id => newPermissions.add(id))
    } else {
      categoryPermissions.forEach(id => newPermissions.delete(id))
    }
    setSelectedPermissions(newPermissions)
  }

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = permissions.filter(p => p.category === category)
    return categoryPermissions.every(p => selectedPermissions.has(p.id))
  }

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = permissions.filter(p => p.category === category)
    const selectedCount = categoryPermissions.filter(p => selectedPermissions.has(p.id)).length
    return selectedCount > 0 && selectedCount < categoryPermissions.length
  }

  const handleSave = () => {
    // Simulate saving permissions
    console.log('Permissions saved:', Array.from(selectedPermissions))
    // Here you would typically make an API call to save the permissions
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/master/schools/${schoolId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to School
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissions Manager</h1>
            <p className="text-muted-foreground mt-1">
              Configure role-based permissions for school administrators
            </p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Permissions
        </Button>
      </div>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Summary
          </CardTitle>
          <CardDescription>
            Overview of selected permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedPermissions.size}</div>
              <p className="text-sm text-muted-foreground">Selected</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{permissions.length - selectedPermissions.size}</div>
              <p className="text-sm text-muted-foreground">Not Selected</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((selectedPermissions.size / permissions.length) * 100)}%
              </div>
              <p className="text-sm text-muted-foreground">Coverage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryPermissions = permissions.filter(p => p.category === category)
          const fullySelected = isCategoryFullySelected(category)
          const partiallySelected = isCategoryPartiallySelected(category)

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={fullySelected || partiallySelected}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-medium">
                      Select All {partiallySelected && <span className="text-xs text-gray-500">(partial)</span>}
                    </Label>
                  </div>
                </div>
                <CardDescription>
                  {categoryPermissions.length} permissions in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {permission.icon}
                          <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                            {permission.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
