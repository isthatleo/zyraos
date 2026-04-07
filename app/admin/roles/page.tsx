"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2 } from "lucide-react"

const roles = [
  {
    id: "1",
    name: "Admin",
    description: "Full system access",
    permissions: ["View", "Create", "Edit", "Delete"],
    users: 3,
  },
  {
    id: "2",
    name: "Teacher",
    description: "Can manage classes and assign grades",
    permissions: ["View", "Create", "Edit"],
    users: 45,
  },
  {
    id: "3",
    name: "Finance",
    description: "Manage fees and payments",
    permissions: ["View", "Edit"],
    users: 2,
  },
  {
    id: "4",
    name: "Student",
    description: "Access academic records",
    permissions: ["View"],
    users: 250,
  },
]

const permissionMatrix = {
  headers: ["Role", "View", "Create", "Edit", "Delete"],
  rows: [
    ["Admin", true, true, true, true],
    ["Teacher", true, true, true, false],
    ["Finance", true, false, true, false],
    ["Student", true, false, false, false],
  ],
}

export default function RolesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage system roles and access control</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>{role.name}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((perm) => (
                        <Badge key={perm} variant="secondary">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Users with this role: <strong>{role.users}</strong></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>Toggle permissions for each role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {permissionMatrix.headers.map((header) => (
                        <th key={header} className="text-left py-3 px-4 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role, rowIndex) => (
                      <tr key={role.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{role.name}</td>
                        {role.permissions.map((perm, colIndex) => (
                          <td key={colIndex} className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              defaultChecked={true}
                              className="w-4 h-4"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <Button className="bg-primary text-primary-foreground">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
