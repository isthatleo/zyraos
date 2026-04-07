"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  Save,
  Eye,
  Printer,
  Plus,
  Trash2,
  Move,
  Type,
  Image as ImageIcon,
  Hash,
  Calendar,
  DollarSign,
  User,
  Building,
  Minus,
  FileDown,
  Table,
  Undo2,
  Redo2,
  Copy,
  Grid3X3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  BookOpen,
  GraduationCap,
} from "lucide-react"

// --- Types ---

interface ReceiptElement {
  id: string
  type: 'text' | 'image' | 'divider' | 'table' | 'dynamic'
  content: string
  binding: string // e.g. {{student.name}}, {{amount}}, etc
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  borderRadius: number
  padding: number
  zIndex: number
}

interface ReceiptTemplate {
  id: string
  name: string
  description: string
  elements: ReceiptElement[]
  canvasWidth: number
  canvasHeight: number
  paperSize: 'A4' | 'A5' | 'Letter' | 'Custom'
}

interface ReceiptBuilderProps {
  tenantSlug: string
  userId: string
}

// --- Dynamic field bindings ---
const DYNAMIC_FIELDS = [
  { binding: '{{school.name}}', label: 'School Name', icon: Building, category: 'School' },
  { binding: '{{school.logo}}', label: 'School Logo', icon: ImageIcon, category: 'School' },
  { binding: '{{school.address}}', label: 'School Address', icon: MapPin, category: 'School' },
  { binding: '{{school.phone}}', label: 'School Phone', icon: Phone, category: 'School' },
  { binding: '{{school.email}}', label: 'School Email', icon: Mail, category: 'School' },
  { binding: '{{student.name}}', label: 'Student Name', icon: GraduationCap, category: 'Student' },
  { binding: '{{student.id}}', label: 'Student ID', icon: Hash, category: 'Student' },
  { binding: '{{student.class}}', label: 'Student Class', icon: BookOpen, category: 'Student' },
  { binding: '{{parent.name}}', label: 'Parent Name', icon: User, category: 'Guardian' },
  { binding: '{{parent.phone}}', label: 'Parent Phone', icon: Phone, category: 'Guardian' },
  { binding: '{{receipt.number}}', label: 'Receipt Number', icon: Hash, category: 'Payment' },
  { binding: '{{receipt.date}}', label: 'Receipt Date', icon: Calendar, category: 'Payment' },
  { binding: '{{amount}}', label: 'Amount Paid', icon: DollarSign, category: 'Payment' },
  { binding: '{{amount.words}}', label: 'Amount in Words', icon: Type, category: 'Payment' },
  { binding: '{{payment.method}}', label: 'Payment Method', icon: CreditCard, category: 'Payment' },
  { binding: '{{balance}}', label: 'Balance Due', icon: DollarSign, category: 'Payment' },
  { binding: '{{term}}', label: 'Academic Term', icon: Calendar, category: 'Academic' },
  { binding: '{{year}}', label: 'Academic Year', icon: Calendar, category: 'Academic' },
]

const ELEMENT_PALETTE = [
  { type: 'text' as const, label: 'Text Block', icon: Type },
  { type: 'dynamic' as const, label: 'Dynamic Field', icon: Hash },
  { type: 'image' as const, label: 'Image', icon: ImageIcon },
  { type: 'divider' as const, label: 'Divider', icon: Minus },
  { type: 'table' as const, label: 'Fee Table', icon: Table },
]

const PAPER_SIZES = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  Letter: { width: 612, height: 792 },
  Custom: { width: 600, height: 800 },
}

// Mock data for preview
const PREVIEW_DATA: Record<string, string> = {
  '{{school.name}}': 'Greenfield International School',
  '{{school.logo}}': '/images/roxan-logo.png',
  '{{school.address}}': '123 Education Street, Accra, Ghana',
  '{{school.phone}}': '+233 20 123 4567',
  '{{school.email}}': 'info@greenfield.edu',
  '{{student.name}}': 'Kwame Asante',
  '{{student.id}}': 'STU-2024-0042',
  '{{student.class}}': 'Grade 10 - Science',
  '{{parent.name}}': 'Ama Asante',
  '{{parent.phone}}': '+233 24 567 8901',
  '{{receipt.number}}': 'RCP-2024-00187',
  '{{receipt.date}}': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
  '{{amount}}': 'GH₵ 2,500.00',
  '{{amount.words}}': 'Two Thousand Five Hundred Ghana Cedis',
  '{{payment.method}}': 'Mobile Money',
  '{{balance}}': 'GH₵ 0.00',
  '{{term}}': 'Term 2',
  '{{year}}': '2024/2025',
}

// --- Draggable Element on Canvas ---
function CanvasElement({
  element,
  isSelected,
  onSelect,
  isPreview,
}: {
  element: ReceiptElement
  isSelected: boolean
  onSelect: () => void
  isPreview: boolean
}) {
  const resolvedContent = isPreview
    ? (element.binding ? (PREVIEW_DATA[element.binding] || element.binding) : element.content)
    : (element.binding || element.content || `[${element.type}]`)

  return (
    <div
      className={`absolute cursor-pointer transition-shadow ${
        isSelected && !isPreview ? 'ring-2 ring-primary shadow-lg' : ''
      } ${!isPreview ? 'hover:ring-1 hover:ring-primary/50' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        textAlign: element.textAlign,
        color: element.color,
        backgroundColor: element.backgroundColor !== 'transparent' ? element.backgroundColor : undefined,
        borderWidth: element.borderWidth,
        borderColor: element.borderColor,
        borderStyle: element.borderWidth > 0 ? 'solid' : 'none',
        borderRadius: element.borderRadius,
        padding: element.padding,
        zIndex: element.zIndex,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      {element.type === 'divider' ? (
        <hr className="w-full border-t-2" style={{ borderColor: element.color }} />
      ) : element.type === 'image' ? (
        <div className="w-full h-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground rounded">
          <ImageIcon className="h-6 w-6 mr-1 opacity-40" />
          {isPreview ? 'Logo' : '[Image]'}
        </div>
      ) : element.type === 'table' ? (
        <div className="w-full h-full text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-1">Description</th>
                <th className="text-right p-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dashed">
                <td className="p-1">{isPreview ? 'Tuition Fee' : '{{fee.description}}'}</td>
                <td className="text-right p-1">{isPreview ? 'GH₵ 2,000.00' : '{{fee.amount}}'}</td>
              </tr>
              <tr className="border-b border-dashed">
                <td className="p-1">{isPreview ? 'Activity Fee' : '{{fee.description}}'}</td>
                <td className="text-right p-1">{isPreview ? 'GH₵ 500.00' : '{{fee.amount}}'}</td>
              </tr>
              <tr className="font-bold">
                <td className="p-1">Total</td>
                <td className="text-right p-1">{isPreview ? 'GH₵ 2,500.00' : '{{total}}'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <span className="whitespace-pre-wrap break-words">{resolvedContent}</span>
      )}
    </div>
  )
}

// --- Main Component ---
export function ReceiptBuilder({ tenantSlug, userId }: ReceiptBuilderProps) {
  const [template, setTemplate] = useState<ReceiptTemplate>({
    id: '',
    name: '',
    description: '',
    elements: [],
    canvasWidth: PAPER_SIZES.A4.width,
    canvasHeight: PAPER_SIZES.A4.height,
    paperSize: 'A4',
  })

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [history, setHistory] = useState<ReceiptTemplate[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedElement = template.elements.find(el => el.id === selectedElementId) || null

  // Load saved templates
  useEffect(() => {
    fetch(`/api/tenant/receipt-templates?tenant=${tenantSlug}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [tenantSlug])

  // History management
  const pushHistory = useCallback((t: ReceiptTemplate) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), t])
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setTemplate(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setTemplate(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  const addElement = useCallback((type: ReceiptElement['type'], binding?: string) => {
    const defaults: Record<string, Partial<ReceiptElement>> = {
      text: { width: 200, height: 30, content: 'Custom Text' },
      dynamic: { width: 200, height: 28 },
      image: { width: 100, height: 80 },
      divider: { width: template.canvasWidth - 60, height: 4 },
      table: { width: template.canvasWidth - 60, height: 120 },
    }
    const d = defaults[type] || {}
    const newEl: ReceiptElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: d.content || '',
      binding: binding || '',
      x: 30,
      y: 30 + template.elements.length * 40,
      width: d.width || 200,
      height: d.height || 30,
      fontSize: type === 'table' ? 11 : 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#1a1a1a',
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: '#e5e7eb',
      borderRadius: 0,
      padding: 4,
      zIndex: template.elements.length + 1,
    }
    const updated = { ...template, elements: [...template.elements, newEl] }
    setTemplate(updated)
    pushHistory(updated)
    setSelectedElementId(newEl.id)
  }, [template, pushHistory])

  const updateElement = useCallback((id: string, updates: Partial<ReceiptElement>) => {
    const updated = {
      ...template,
      elements: template.elements.map(el => el.id === id ? { ...el, ...updates } : el),
    }
    setTemplate(updated)
  }, [template])

  const commitUpdate = useCallback(() => {
    pushHistory(template)
  }, [template, pushHistory])

  const deleteElement = useCallback((id: string) => {
    const updated = { ...template, elements: template.elements.filter(el => el.id !== id) }
    setTemplate(updated)
    pushHistory(updated)
    if (selectedElementId === id) setSelectedElementId(null)
  }, [template, selectedElementId, pushHistory])

  const duplicateElement = useCallback((id: string) => {
    const el = template.elements.find(e => e.id === id)
    if (!el) return
    const dup: ReceiptElement = { ...el, id: `el-${Date.now()}`, x: el.x + 15, y: el.y + 15 }
    const updated = { ...template, elements: [...template.elements, dup] }
    setTemplate(updated)
    pushHistory(updated)
    setSelectedElementId(dup.id)
  }, [template, pushHistory])

  // Canvas mouse drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Find topmost element under cursor
    const hit = [...template.elements].reverse().find(el =>
      mx >= el.x && mx <= el.x + el.width && my >= el.y && my <= el.y + el.height
    )
    if (hit) {
      setSelectedElementId(hit.id)
      setDragOffset({ x: mx - hit.x, y: my - hit.y })
      setIsDragging(true)
    } else {
      setSelectedElementId(null)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId || !dragOffset || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const newX = Math.max(0, Math.min(template.canvasWidth - 20, mx - dragOffset.x))
    const newY = Math.max(0, Math.min(template.canvasHeight - 20, my - dragOffset.y))
    // Snap to grid
    const snappedX = showGrid ? Math.round(newX / 10) * 10 : newX
    const snappedY = showGrid ? Math.round(newY / 10) * 10 : newY
    updateElement(selectedElementId, { x: snappedX, y: snappedY })
  }

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      commitUpdate()
      setIsDragging(false)
      setDragOffset(null)
    }
  }

  const saveTemplate = async () => {
    if (!template.name.trim()) {
      toast.error('Please enter a template name')
      return
    }
    try {
      const payload = {
        id: template.id || undefined,
        name: template.name,
        description: template.description,
        templateData: { elements: template.elements, canvasWidth: template.canvasWidth, canvasHeight: template.canvasHeight, paperSize: template.paperSize },
        category: 'receipt',
      }
      const res = await fetch(`/api/tenant/receipt-templates?tenant=${tenantSlug}`, {
        method: template.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      setTemplate(prev => ({ ...prev, id: saved.id }))
      toast.success('Template saved!')
    } catch {
      toast.error('Failed to save template')
    }
  }

  const generatePDF = async () => {
    // Build HTML for print
    const html = buildPrintHTML(template, true)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => printWindow.print()
    }
  }

  const setPaperSize = (size: 'A4' | 'A5' | 'Letter' | 'Custom') => {
    const dims = PAPER_SIZES[size]
    setTemplate(prev => ({ ...prev, paperSize: size, canvasWidth: dims.width, canvasHeight: dims.height }))
  }

  const fieldCategories = [...new Set(DYNAMIC_FIELDS.map(f => f.category))]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Input
            value={template.name}
            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Template name..."
            className="w-56 h-9"
          />
          <Select value={template.paperSize} onValueChange={(v) => setPaperSize(v as any)}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A5">A5</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant={showGrid ? 'secondary' : 'ghost'} size="icon" onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant={isPreview ? 'default' : 'outline'} size="sm" onClick={() => setIsPreview(!isPreview)}>
            <Eye className="h-4 w-4 mr-1" />{isPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <FileDown className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button size="sm" onClick={saveTemplate}>
            <Save className="h-4 w-4 mr-1" />Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Element Palette + Dynamic Fields */}
        <div className="col-span-3 space-y-4 max-h-[75vh] overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {ELEMENT_PALETTE.map(({ type, label, icon: Icon }) => (
                <Button key={type} variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => addElement(type)}>
                  <Icon className="h-3.5 w-3.5 mr-2" />{label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dynamic Fields</CardTitle>
              <CardDescription className="text-xs">Click to add data-bound fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fieldCategories.map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                  <div className="space-y-0.5">
                    {DYNAMIC_FIELDS.filter(f => f.category === cat).map(f => (
                      <Button key={f.binding} variant="ghost" size="sm" className="w-full justify-start h-7 text-xs" onClick={() => addElement('dynamic', f.binding)}>
                        <f.icon className="h-3 w-3 mr-2 text-muted-foreground" />
                        {f.label}
                        <Badge variant="outline" className="ml-auto text-[9px] py-0 px-1">{f.binding}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center: Canvas */}
        <div className="col-span-6 flex justify-center overflow-auto">
          <div
            ref={canvasRef}
            className="relative border bg-white shadow-sm select-none"
            style={{
              width: template.canvasWidth,
              height: template.canvasHeight,
              minWidth: template.canvasWidth,
              backgroundImage: showGrid && !isPreview ? 'radial-gradient(circle, hsl(var(--border)) 0.5px, transparent 0.5px)' : 'none',
              backgroundSize: '10px 10px',
              cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseDown={!isPreview ? handleCanvasMouseDown : undefined}
            onMouseMove={!isPreview ? handleCanvasMouseMove : undefined}
            onMouseUp={!isPreview ? handleCanvasMouseUp : undefined}
            onMouseLeave={!isPreview ? handleCanvasMouseUp : undefined}
          >
            {template.elements.length === 0 && !isPreview && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                <div className="text-center">
                  <Move className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-sm">Add elements from the left panel</p>
                  <p className="text-xs">Drag to position on canvas</p>
                </div>
              </div>
            )}
            {template.elements.map(el => (
              <CanvasElement
                key={el.id}
                element={el}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElementId(el.id)}
                isPreview={isPreview}
              />
            ))}
          </div>
        </div>

        {/* Right: Properties */}
        <div className="col-span-3 max-h-[75vh] overflow-y-auto">
          {selectedElement && !isPreview ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Properties</CardTitle>
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteElement(selectedElement.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedElement.type === 'dynamic' && (
                  <div>
                    <Label className="text-xs">Data Binding</Label>
                    <Select value={selectedElement.binding} onValueChange={(v) => { updateElement(selectedElement.id, { binding: v }); commitUpdate() }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field..." /></SelectTrigger>
                      <SelectContent>
                        {DYNAMIC_FIELDS.map(f => (
                          <SelectItem key={f.binding} value={f.binding}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selectedElement.type === 'text') && (
                  <div>
                    <Label className="text-xs">Content</Label>
                    <Textarea value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} onBlur={commitUpdate} rows={2} className="text-xs" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">X</Label>
                    <Input type="number" value={selectedElement.x} onChange={(e) => updateElement(selectedElement.id, { x: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Y</Label>
                    <Input type="number" value={selectedElement.y} onChange={(e) => updateElement(selectedElement.id, { y: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Width</Label>
                    <Input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedElement.id, { width: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Height</Label>
                    <Input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedElement.id, { height: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                </div>

                <div className="flex gap-1">
                  <Button variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' }); commitUpdate() }}>
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' }); commitUpdate() }}>
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-px h-7 bg-border" />
                  <Button variant={selectedElement.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { updateElement(selectedElement.id, { textAlign: 'left' }); commitUpdate() }}>
                    <AlignLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { updateElement(selectedElement.id, { textAlign: 'center' }); commitUpdate() }}>
                    <AlignCenter className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { updateElement(selectedElement.id, { textAlign: 'right' }); commitUpdate() }}>
                    <AlignRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Text Color</Label>
                    <Input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} onBlur={commitUpdate} className="h-7 p-0.5" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Background</Label>
                    <Input type="color" value={selectedElement.backgroundColor === 'transparent' ? '#ffffff' : selectedElement.backgroundColor} onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })} onBlur={commitUpdate} className="h-7 p-0.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Border</Label>
                    <Input type="number" value={selectedElement.borderWidth} onChange={(e) => updateElement(selectedElement.id, { borderWidth: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Radius</Label>
                    <Input type="number" value={selectedElement.borderRadius} onChange={(e) => updateElement(selectedElement.id, { borderRadius: +e.target.value })} onBlur={commitUpdate} className="h-7 text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Move className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{isPreview ? 'Preview mode active' : 'Select an element to edit'}</p>
              </CardContent>
            </Card>
          )}

          {/* Saved Templates */}
          {templates.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saved Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {templates.map((t: any) => (
                  <Button key={t.id} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => {
                    const td = t.templateData || {}
                    setTemplate({
                      id: t.id,
                      name: t.name,
                      description: t.description || '',
                      elements: td.elements || [],
                      canvasWidth: td.canvasWidth || 595,
                      canvasHeight: td.canvasHeight || 842,
                      paperSize: td.paperSize || 'A4',
                    })
                  }}>
                    {t.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Print HTML Builder ---
function buildPrintHTML(template: ReceiptTemplate, withPreviewData: boolean): string {
  const elements = template.elements.map(el => {
    const content = withPreviewData
      ? (el.binding ? (PREVIEW_DATA[el.binding] || el.binding) : el.content)
      : (el.binding || el.content)

    if (el.type === 'divider') {
      return `<hr style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;border:none;border-top:2px solid ${el.color};" />`
    }
    if (el.type === 'table') {
      return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-size:${el.fontSize}px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid #333;"><th style="text-align:left;padding:4px;">Description</th><th style="text-align:right;padding:4px;">Amount</th></tr></thead>
          <tbody>
            <tr style="border-bottom:1px dashed #ccc;"><td style="padding:4px;">Tuition Fee</td><td style="text-align:right;padding:4px;">GH₵ 2,000.00</td></tr>
            <tr style="border-bottom:1px dashed #ccc;"><td style="padding:4px;">Activity Fee</td><td style="text-align:right;padding:4px;">GH₵ 500.00</td></tr>
            <tr style="font-weight:bold;"><td style="padding:4px;">Total</td><td style="text-align:right;padding:4px;">GH₵ 2,500.00</td></tr>
          </tbody>
        </table>
      </div>`
    }
    return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-size:${el.fontSize}px;font-weight:${el.fontWeight};font-style:${el.fontStyle};text-align:${el.textAlign};color:${el.color};background:${el.backgroundColor};border:${el.borderWidth}px solid ${el.borderColor};border-radius:${el.borderRadius}px;padding:${el.padding}px;box-sizing:border-box;">${content}</div>`
  }).join('\n')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.name || 'Receipt'}</title><style>@page{size:${template.paperSize === 'Custom' ? `${template.canvasWidth}px ${template.canvasHeight}px` : template.paperSize};margin:0;}body{margin:0;padding:0;font-family:system-ui,sans-serif;}</style></head><body><div style="position:relative;width:${template.canvasWidth}px;height:${template.canvasHeight}px;margin:0 auto;">${elements}</div></body></html>`
}
