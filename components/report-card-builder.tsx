"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Save,
  Eye,
  Printer,
  Upload,
  Plus,
  Trash2,
  Move,
  Type,
  Image,
  Hash,
  Calendar,
  User,
  Building,
  Minus,
  BookOpen,
  Award,
  TrendingUp,
  Users,
  MessageSquare,
} from "lucide-react"

interface ReportCardElement {
  id: string
  type: 'text' | 'image' | 'divider' | 'student_name' | 'student_number' | 'class_name' | 'term_name' | 'academic_year' | 'school_logo' | 'school_name' | 'grades_table' | 'overall_grade' | 'overall_percentage' | 'gpa' | 'rank' | 'attendance' | 'teacher_comments' | 'principal_comments' | 'parent_comments' | 'date' | 'signature'
  content: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

interface ReportCardTemplate {
  id: string
  name: string
  description: string
  elements: ReportCardElement[]
  canvasWidth: number
  canvasHeight: number
}

interface ReportCardBuilderProps {
  tenantSlug: string
  userId: string
}

const ELEMENT_TYPES = [
  { type: 'school_logo' as const, label: 'School Logo', icon: Image },
  { type: 'school_name' as const, label: 'School Name', icon: Building },
  { type: 'student_name' as const, label: 'Student Name', icon: User },
  { type: 'student_number' as const, label: 'Student Number', icon: Hash },
  { type: 'class_name' as const, label: 'Class/Grade', icon: BookOpen },
  { type: 'term_name' as const, label: 'Term/Semester', icon: Calendar },
  { type: 'academic_year' as const, label: 'Academic Year', icon: Calendar },
  { type: 'grades_table' as const, label: 'Grades Table', icon: BookOpen },
  { type: 'overall_grade' as const, label: 'Overall Grade', icon: Award },
  { type: 'overall_percentage' as const, label: 'Overall Percentage', icon: TrendingUp },
  { type: 'gpa' as const, label: 'GPA', icon: Award },
  { type: 'rank' as const, label: 'Class Rank', icon: Users },
  { type: 'attendance' as const, label: 'Attendance', icon: Calendar },
  { type: 'teacher_comments' as const, label: 'Teacher Comments', icon: MessageSquare },
  { type: 'principal_comments' as const, label: 'Principal Comments', icon: MessageSquare },
  { type: 'parent_comments' as const, label: 'Parent Comments', icon: MessageSquare },
  { type: 'date' as const, label: 'Issue Date', icon: Calendar },
  { type: 'signature' as const, label: 'Signature', icon: User },
  { type: 'text' as const, label: 'Custom Text', icon: Type },
  { type: 'divider' as const, label: 'Divider Line', icon: Minus },
]

function SortableElement({ element, isSelected, onSelect, onUpdate, onDelete }: {
  element: ReportCardElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<ReportCardElement>) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const renderElementContent = () => {
    switch (element.type) {
      case 'divider':
        return <hr className="w-full border-t-2 border-gray-400" />
      case 'image':
      case 'school_logo':
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
            [Image]
          </div>
        )
      case 'grades_table':
        return (
          <div className="w-full h-full border border-gray-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-1 text-left">Subject</th>
                  <th className="p-1 text-center">Grade</th>
                  <th className="p-1 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1">Mathematics</td>
                  <td className="p-1 text-center">A</td>
                  <td className="p-1 text-center">95%</td>
                </tr>
                <tr>
                  <td className="p-1">English</td>
                  <td className="p-1 text-center">B+</td>
                  <td className="p-1 text-center">87%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      default:
        return (
          <span className="whitespace-nowrap overflow-hidden">
            {element.content || `[${element.type.replace('_', ' ').toUpperCase()}]`}
          </span>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`absolute border-2 cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        textAlign: element.textAlign,
        color: element.color,
        ...style,
      }}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div className="w-full h-full p-2 flex items-center justify-center overflow-hidden">
        {renderElementContent()}
      </div>
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function ReportCardBuilder({ tenantSlug, userId }: ReportCardBuilderProps) {
  const [template, setTemplate] = useState<ReportCardTemplate>({
    id: '',
    name: '',
    description: '',
    elements: [],
    canvasWidth: 800,
    canvasHeight: 1100,
  })

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const selectedElement = template.elements.find(el => el.id === selectedElementId)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTemplate(prev => {
        const oldIndex = prev.elements.findIndex(el => el.id === active.id)
        const newIndex = prev.elements.findIndex(el => el.id === over.id)

        return {
          ...prev,
          elements: arrayMove(prev.elements, oldIndex, newIndex),
        }
      })
    }
  }

  const addElement = useCallback((type: ReportCardElement['type']) => {
    const newElement: ReportCardElement = {
      id: `element-${Date.now()}`,
      type,
      content: '',
      x: 50,
      y: 50,
      width: type === 'grades_table' ? 700 : type === 'divider' ? 700 : 200,
      height: type === 'grades_table' ? 200 : type === 'divider' ? 10 : 40,
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#000000',
    }

    setTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }))
  }, [])

  const updateElement = useCallback((id: string, updates: Partial<ReportCardElement>) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }))
  }, [])

  const deleteElement = useCallback((id: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
    }))
    if (selectedElementId === id) {
      setSelectedElementId(null)
    }
  }, [selectedElementId])

  const saveTemplate = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/report-card-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      })

      if (response.ok) {
        toast.success('Template saved successfully!')
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const previewTemplate = () => {
    // Open preview modal or new window
    toast.info('Preview functionality coming soon!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Card Template Builder</CardTitle>
          <CardDescription>
            Design custom report card templates with drag-and-drop elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Template Settings */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={template.description}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="canvas-width">Width (px)</Label>
                  <Input
                    id="canvas-width"
                    type="number"
                    value={template.canvasWidth}
                    onChange={(e) => setTemplate(prev => ({ ...prev, canvasWidth: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="canvas-height">Height (px)</Label>
                  <Input
                    id="canvas-height"
                    type="number"
                    value={template.canvasHeight}
                    onChange={(e) => setTemplate(prev => ({ ...prev, canvasHeight: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="lg:col-span-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div
                  ref={canvasRef}
                  className="relative bg-white border mx-auto"
                  style={{
                    width: template.canvasWidth,
                    height: template.canvasHeight,
                  }}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={template.elements.map(el => el.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {template.elements.map((element) => (
                        <SortableElement
                          key={element.id}
                          element={element}
                          isSelected={selectedElementId === element.id}
                          onSelect={() => setSelectedElementId(element.id)}
                          onUpdate={(updates) => updateElement(element.id, updates)}
                          onDelete={() => deleteElement(element.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>

            {/* Element Library & Properties */}
            <div className="lg:col-span-1 space-y-4">
              <Tabs defaultValue="elements" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="elements">Elements</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                </TabsList>

                <TabsContent value="elements" className="space-y-2">
                  <Label>Available Elements</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {ELEMENT_TYPES.map((elementType) => (
                      <Button
                        key={elementType.type}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => addElement(elementType.type)}
                      >
                        <elementType.icon className="h-4 w-4 mr-2" />
                        <span className="text-sm">{elementType.label}</span>
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="properties" className="space-y-4">
                  {selectedElement ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Content</Label>
                        <Textarea
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          placeholder="Enter content"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>X Position</Label>
                          <Input
                            type="number"
                            value={selectedElement.x}
                            onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Y Position</Label>
                          <Input
                            type="number"
                            value={selectedElement.y}
                            onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={selectedElement.width}
                            onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={selectedElement.height}
                            onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Font Size</Label>
                        <Input
                          type="number"
                          value={selectedElement.fontSize}
                          onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                        />
                      </div>

                      <div>
                        <Label>Font Weight</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedElement.fontWeight}
                          onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value as 'normal' | 'bold' })}
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>

                      <div>
                        <Label>Text Align</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedElement.textAlign}
                          onChange={(e) => updateElement(selectedElement.id, { textAlign: e.target.value as 'left' | 'center' | 'right' })}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div>
                        <Label>Color</Label>
                        <Input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select an element to edit its properties
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={previewTemplate}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
