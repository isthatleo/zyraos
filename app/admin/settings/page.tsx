"use client"

import { useState } from "react"
import {
  Bell,
  BookOpen,
  Building2,
  Bus,
  CalendarCheck,
  CreditCard,
  DatabaseBackup,
  FileText,
  GraduationCap,
  Home,
  LinkIcon,
  Lock,
  Palette,
  Settings,
  Shield,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const settingsSections = [
  { id: "school-name", label: "School Name", icon: Building2 },
  { id: "branding", label: "Branding & Appearance", icon: Palette },
  { id: "academic", label: "Academic Settings", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "examination", label: "Examination & Grading", icon: GraduationCap },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "payment-gateways", label: "Payment Gateways", icon: CreditCard },
  { id: "communication", label: "Communication", icon: Bell },
  { id: "security", label: "Security & Privacy", icon: Lock },
  { id: "integrations", label: "Integrations", icon: LinkIcon },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "hostel", label: "Hostel", icon: Home },
  { id: "documents", label: "Document & Compliance", icon: FileText },
  { id: "automation", label: "System Automation", icon: Settings },
  { id: "backup", label: "Backup & Data", icon: DatabaseBackup },
] as const

type SettingsSectionId = (typeof settingsSections)[number]["id"]

function SectionFields({ activeSection }: { activeSection: SettingsSectionId }) {
  switch (activeSection) {
    case "school-name":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name</Label>
            <Input id="school-name" defaultValue="Tuna Bay School" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-code">School Code</Label>
            <Input id="school-code" defaultValue="TBS-001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-email">School Email</Label>
            <Input id="school-email" type="email" defaultValue="admin@tunabayscool.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-phone">School Phone</Label>
            <Input id="school-phone" defaultValue="+233 24 123 4567" />
          </div>
        </div>
      )
    case "branding":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="school-logo">School Logo</Label>
            <Input id="school-logo" type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <Input id="primary-color" type="color" defaultValue="#ff7a1a" className="h-10" />
          </div>
        </div>
      )
    case "academic":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select defaultValue="2025-2026">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-2026">2025/2026</SelectItem>
                <SelectItem value="2026-2027">2026/2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term/Semester Structure</Label>
            <Select defaultValue="terms">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="terms">Three Terms</SelectItem>
                <SelectItem value="semesters">Two Semesters</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    case "attendance":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Attendance Mode</Label>
            <Select defaultValue="manual">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="biometric">Biometric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="late-threshold">Late Threshold</Label>
            <Input id="late-threshold" defaultValue="08:00" />
          </div>
        </div>
      )
    case "examination":
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Grading System</Label>
            <Select defaultValue="percentage">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="letter">Letter Grades</SelectItem>
                <SelectItem value="points">Points Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass-mark">Pass Mark</Label>
            <Input id="pass-mark" defaultValue="50" />
          </div>
        </div>
      )
    default:
      return (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${activeSection}-status`}>Status</Label>
            <Select defaultValue="enabled">
              <SelectTrigger id={`${activeSection}-status`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${activeSection}-owner`}>Responsible Office</Label>
            <Input id={`${activeSection}-owner`} placeholder="Assign department or owner" />
          </div>
        </div>
      )
  }
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("school-name")
  const currentSection = settingsSections.find((section) => section.id === activeSection) || settingsSections[0]
  const CurrentIcon = currentSection.icon

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">School Settings</h1>
        <p className="text-muted-foreground">
          Configure school identity, academic operations, finance, security, integrations, and data controls.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-2xl border bg-card p-3 lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-center gap-2 px-3 py-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-primary" />
            Settings Sections
          </div>
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon
              const active = section.id === activeSection
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{currentSection.label}</CardTitle>
                <CardDescription>Manage this school settings area.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <SectionFields activeSection={activeSection} />
            <div className="flex justify-end gap-3 border-t pt-6">
              <Button variant="outline">Reset</Button>
              <Button>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
