"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import { toast } from "sonner"

interface GradingScalesProps {
  tenantSlug: string
}

interface GradingScale {
  id: string
  name: string
  description: string
  scaleType: 'letter' | 'percentage' | 'gpa' | 'points'
  isDefault: boolean
  ranges: GradingRange[]
  createdAt: string
  updatedAt: string
}

interface GradingRange {
  id: string
  minScore: number
  maxScore: number
  grade: string
  description: string
  gpaValue?: number
}

export function GradingScales({ tenantSlug }: GradingScalesProps) {
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null)

  const [newScale, setNewScale] = useState<{
    name: string
    description: string
    scaleType: 'letter' | 'percentage' | 'gpa' | 'points'
    isDefault: boolean
    ranges: GradingRange[]
  }>({
    name: "",
    description: "",
    scaleType: "letter",
    isDefault: false,
    ranges: [],
  })

  useEffect(() => {
    fetchGradingScales()
  }, [])

  const fetchGradingScales = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/${tenantSlug}/grading-scales`)
      const data = await response.json()
      setGradingScales(data.gradingScales || [])
    } catch (error) {
      console.error("Error fetching grading scales:", error)
      toast.error("Failed to fetch grading scales")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateScale = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/grading-scales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newScale),
      })

      if (response.ok) {
        toast.success("Grading scale created successfully")
        setIsCreateDialogOpen(false)
        setNewScale({
          name: "",
          description: "",
          scaleType: "letter",
          isDefault: false,
          ranges: [],
        })
        fetchGradingScales()
      } else {
        throw new Error("Failed to create grading scale")
      }
    } catch (error) {
      console.error("Error creating grading scale:", error)
      toast.error("Failed to create grading scale")
    }
  }

  const handleUpdateScale = async (scaleId: string, updates: Partial<GradingScale>) => {
    try {
      const response = await fetch(`/api/${tenantSlug}/grading-scales/${scaleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success("Grading scale updated successfully")
        setEditingScale(null)
        fetchGradingScales()
      } else {
        throw new Error("Failed to update grading scale")
      }
    } catch (error) {
      console.error("Error updating grading scale:", error)
      toast.error("Failed to update grading scale")
    }
  }

  const handleDeleteScale = async (scaleId: string) => {
    if (!confirm("Are you sure you want to delete this grading scale?")) return

    try {
      const response = await fetch(`/api/${tenantSlug}/grading-scales/${scaleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Grading scale deleted successfully")
        fetchGradingScales()
      } else {
        throw new Error("Failed to delete grading scale")
      }
    } catch (error) {
      console.error("Error deleting grading scale:", error)
      toast.error("Failed to delete grading scale")
    }
  }

  const addRange = (scale: GradingScale, setScale: (scale: GradingScale) => void) => {
    const newRange: GradingRange = {
      id: `range-${Date.now()}`,
      minScore: 0,
      maxScore: 100,
      grade: "",
      description: "",
      gpaValue: scale.scaleType === 'gpa' ? 0 : undefined,
    }
    setScale({
      ...scale,
      ranges: [...scale.ranges, newRange],
    })
  }

  const updateRange = (
    scale: GradingScale,
    setScale: (scale: GradingScale) => void,
    rangeId: string,
    updates: Partial<GradingRange>
  ) => {
    setScale({
      ...scale,
      ranges: scale.ranges.map(r =>
        r.id === rangeId ? { ...r, ...updates } : r
      ),
    })
  }

  const removeRange = (
    scale: GradingScale,
    setScale: (scale: GradingScale) => void,
    rangeId: string
  ) => {
    setScale({
      ...scale,
      ranges: scale.ranges.filter(r => r.id !== rangeId),
    })
  }

  const getDefaultRanges = (scaleType: string) => {
    switch (scaleType) {
      case 'letter':
        return [
          { id: 'a', minScore: 90, maxScore: 100, grade: 'A', description: 'Excellent' },
          { id: 'b', minScore: 80, maxScore: 89, grade: 'B', description: 'Good' },
          { id: 'c', minScore: 70, maxScore: 79, grade: 'C', description: 'Satisfactory' },
          { id: 'd', minScore: 60, maxScore: 69, grade: 'D', description: 'Needs Improvement' },
          { id: 'f', minScore: 0, maxScore: 59, grade: 'F', description: 'Fail' },
        ]
      case 'gpa':
        return [
          { id: 'a', minScore: 90, maxScore: 100, grade: 'A', description: 'Excellent', gpaValue: 4.0 },
          { id: 'b', minScore: 80, maxScore: 89, grade: 'B', description: 'Good', gpaValue: 3.0 },
          { id: 'c', minScore: 70, maxScore: 79, grade: 'C', description: 'Satisfactory', gpaValue: 2.0 },
          { id: 'd', minScore: 60, maxScore: 69, grade: 'D', description: 'Needs Improvement', gpaValue: 1.0 },
          { id: 'f', minScore: 0, maxScore: 59, grade: 'F', description: 'Fail', gpaValue: 0.0 },
        ]
      default:
        return []
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Grading Scales Management
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scale
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Grading Scale</DialogTitle>
                  <DialogDescription>
                    Define a new grading scale with ranges and criteria.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scale-name">Scale Name</Label>
                      <Input
                        id="scale-name"
                        value={newScale.name}
                        onChange={(e) => setNewScale({ ...newScale, name: e.target.value })}
                        placeholder="e.g., Standard Letter Grades"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scale-type">Scale Type</Label>
                      <Select
                        value={newScale.scaleType}
                        onValueChange={(value) => {
                          setNewScale({
                            ...newScale,
                            scaleType: value as 'letter' | 'percentage' | 'gpa' | 'points',
                            ranges: getDefaultRanges(value),
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="letter">Letter Grades (A, B, C, D, F)</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="gpa">GPA Scale</SelectItem>
                          <SelectItem value="points">Points System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="scale-description">Description</Label>
                    <Textarea
                      id="scale-description"
                      value={newScale.description}
                      onChange={(e) => setNewScale({ ...newScale, description: e.target.value })}
                      placeholder="Describe this grading scale"
                    />
                  </div>

                  <div>
                    <Label>Grade Ranges</Label>
                    <div className="space-y-2 mt-2">
                      {newScale.ranges.map((range, index) => (
                        <div key={range.id} className="flex items-center space-x-2 p-2 border rounded">
                          <div className="flex items-center space-x-2 flex-1">
                            <Input
                              type="number"
                              placeholder="Min %"
                              value={range.minScore}
                            onChange={(e) => setNewScale({
                              ...newScale,
                              ranges: newScale.ranges.map(r =>
                                r.id === range.id ? { ...r, minScore: Number(e.target.value) } : r
                              ),
                            })}
                            className="w-20"
                            />
                            <span>-</span>
                            <Input
                              type="number"
                              placeholder="Max %"
                              value={range.maxScore}
                              onChange={(e) => setNewScale({
                              ...newScale,
                              ranges: newScale.ranges.map(r =>
                                r.id === range.id ? { ...r, maxScore: Number(e.target.value) } : r
                              ),
                            })}
                              className="w-20"
                            />
                            <Input
                              placeholder="Grade"
                              value={range.grade}
                              onChange={(e) => setNewScale({
                              ...newScale,
                              ranges: newScale.ranges.map(r =>
                                r.id === range.id ? { ...r, grade: e.target.value } : r
                              ),
                            })}
                              className="w-16"
                            />
                            {newScale.scaleType === 'gpa' && (
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="GPA"
                                value={range.gpaValue || 0}
                                onChange={(e) => setNewScale({
                                  ...newScale,
                                  ranges: newScale.ranges.map(r =>
                                    r.id === range.id ? { ...r, gpaValue: Number(e.target.value) } : r
                                  ),
                                })}
                                className="w-16"
                              />
                            )}
                            <Input
                              placeholder="Description"
                              value={range.description}
                              onChange={(e) => setNewScale({
                              ...newScale,
                              ranges: newScale.ranges.map(r =>
                                r.id === range.id ? { ...r, description: e.target.value } : r
                              ),
                            })}
                              className="flex-1"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewScale({
                              ...newScale,
                              ranges: newScale.ranges.filter(r => r.id !== range.id),
                            })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newRange: GradingRange = {
                            id: `range-${Date.now()}`,
                            minScore: 0,
                            maxScore: 100,
                            grade: "",
                            description: "",
                            gpaValue: newScale.scaleType === 'gpa' ? 0 : undefined,
                          }
                          setNewScale({
                            ...newScale,
                            ranges: [...newScale.ranges, newRange],
                          })
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Range
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateScale}>Create Scale</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Define and manage grading scales for different assessment types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading grading scales...</div>
          ) : gradingScales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No grading scales found. Create your first grading scale to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ranges</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingScales.map((scale) => (
                  <TableRow key={scale.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{scale.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {scale.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {scale.scaleType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {scale.ranges.length} ranges
                      </div>
                    </TableCell>
                    <TableCell>
                      {scale.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingScale(scale)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteScale(scale.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
