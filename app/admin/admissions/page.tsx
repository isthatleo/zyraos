"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  UserPlus, Search, GripVertical, Mail, Phone, Calendar,
  ArrowRight, ArrowLeft, CheckCircle, FileText, CreditCard, ClipboardList
} from "lucide-react"
import { toast } from "sonner"

type Stage = "applied" | "review" | "interview" | "tested" | "accepted" | "payment" | "enrolled"

interface Applicant {
  id: string
  name: string
  email: string
  phone: string
  grade: string
  stage: Stage
  appliedDate: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  notes: string
}

const STAGES: { id: Stage; label: string; color: string; icon: React.ElementType }[] = [
  { id: "applied", label: "Applied", color: "bg-blue-500", icon: ClipboardList },
  { id: "review", label: "Review", color: "bg-yellow-500", icon: FileText },
  { id: "interview", label: "Interview", color: "bg-purple-500", icon: UserPlus },
  { id: "tested", label: "Tested", color: "bg-cyan-500", icon: CheckCircle },
  { id: "accepted", label: "Accepted", color: "bg-green-500", icon: CheckCircle },
  { id: "payment", label: "Payment", color: "bg-orange-500", icon: CreditCard },
  { id: "enrolled", label: "Enrolled", color: "bg-emerald-600", icon: CheckCircle },
]

function ApplicantCard({ applicant, overlay }: { applicant: Applicant; overlay?: boolean }) {
  const initials = applicant.name.split(" ").map(n => n[0]).join("").toUpperCase()

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${overlay ? "shadow-xl rotate-2 opacity-90" : "hover:shadow-md"} transition-all`}>
      <div className="flex items-start gap-3">
        <div className="cursor-grab active:cursor-grabbing text-gray-300 mt-1">
          <GripVertical className="h-4 w-4" />
        </div>
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{applicant.name}</p>
          <p className="text-xs text-gray-500">{applicant.grade}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{applicant.email.split("@")[0]}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{applicant.appliedDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SortableApplicant({ applicant }: { applicant: Applicant }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: applicant.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ApplicantCard applicant={applicant} />
    </div>
  )
}

function StageColumn({ stage, applicants }: { stage: typeof STAGES[0]; applicants: Applicant[] }) {
  const Icon = stage.icon
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: "column" } })

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-[280px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
        <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">{applicants.length}</Badge>
      </div>
      <div className="bg-gray-50 rounded-2xl p-3 min-h-[400px] space-y-2 border border-gray-100">
        <SortableContext items={applicants.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {applicants.map((applicant) => (
            <SortableApplicant key={applicant.id} applicant={applicant} />
          ))}
        </SortableContext>
        {applicants.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400">
            Drop applicants here
          </div>
        )}
      </div>
    </div>
  )
}

// Multi-step enrollment wizard
function EnrollmentWizard({ onComplete }: { onComplete: (data: Partial<Applicant>) => void }) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", grade: "",
    guardianName: "", guardianPhone: "", guardianEmail: "",
    notes: "",
  })

  const steps = ["Basic Info", "Guardian Details", "Finance Setup", "Documents"]

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill in required fields")
      return
    }
    onComplete({
      ...formData,
      id: crypto.randomUUID(),
      stage: "applied" as Stage,
      appliedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })
    toast.success(`${formData.name} has been enrolled!`)
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400"}`}>
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? "text-gray-900" : "text-gray-400"} hidden sm:inline`}>{s}</span>
            {i < steps.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-orange-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={formData.name} onChange={e => updateField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Grade / Class *</Label>
              <Input value={formData.grade} onChange={e => updateField("grade", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={formData.email} onChange={e => updateField("email", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={e => updateField("phone", e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Guardian Name</Label>
            <Input value={formData.guardianName} onChange={e => updateField("guardianName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Guardian Phone</Label>
            <Input value={formData.guardianPhone} onChange={e => updateField("guardianPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Guardian Email</Label>
            <Input type="email" value={formData.guardianEmail} onChange={e => updateField("guardianEmail", e.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">Fee Structure</h3>
            <p className="text-sm text-gray-600">Fee assignment and payment setup will be configured after enrollment is complete. The school admin can assign fee items from the Finance module.</p>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => updateField("notes", e.target.value)} rows={3} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">Document Upload</h3>
            <p className="text-sm text-gray-600 mb-4">Upload required documents for enrollment verification.</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drag & drop files or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Birth certificate, transcripts, medical records</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="bg-orange-600 hover:bg-orange-700 text-white">
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="h-4 w-4 mr-1" /> Complete Enrollment
          </Button>
        )}
      </div>
    </div>
  )
}

export default function AdmissionsPipelinePage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [wizardOpen, setWizardOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const filteredApplicants = applicants.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getApplicantsByStage = (stage: Stage) =>
    filteredApplicants.filter(a => a.stage === stage)

  const findStageForApplicant = (id: string): Stage | undefined => {
    return applicants.find(a => a.id === id)?.stage
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeApplicant = applicants.find(a => a.id === active.id)
    if (!activeApplicant) return

    // Determine target stage
    const overApplicant = applicants.find(a => a.id === over.id)
    const targetStage = overApplicant?.stage ?? (STAGES.find(s => s.id === over.id)?.id)

    if (targetStage && activeApplicant.stage !== targetStage) {
      setApplicants(prev => prev.map(a =>
        a.id === active.id ? { ...a, stage: targetStage } : a
      ))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeApplicant = applicants.find(a => a.id === active.id)
    if (!activeApplicant) return

    const overApplicant = applicants.find(a => a.id === over.id)
    const targetStage = overApplicant?.stage ?? (STAGES.find(s => s.id === over.id)?.id)

    if (targetStage) {
      setApplicants(prev => prev.map(a =>
        a.id === active.id ? { ...a, stage: targetStage } : a
      ))
    }
  }

  const handleEnrollmentComplete = (data: Partial<Applicant>) => {
    setApplicants(prev => [...prev, data as Applicant])
    setWizardOpen(false)
  }

  const activeApplicant = applicants.find(a => a.id === activeId)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">{applicants.length} total applicants</p>
        </div>
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> New Applicant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enrollment Wizard</DialogTitle>
            </DialogHeader>
            <EnrollmentWizard onComplete={handleEnrollmentComplete} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search applicants..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                applicants={getApplicantsByStage(stage.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeApplicant ? <ApplicantCard applicant={activeApplicant} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
