"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useParams } from "next/navigation"
import { StudentProgress } from "@/components/student-progress"
import { ReportCardManagement } from "@/components/report-card-management"
import { GradingScales } from "@/components/grading-scales"
import { AcademicOverview } from "@/components/academic-overview"

export default function ProgressTrackingPage() {
  const params = useParams()
  const tenantSlug = params?.tenant as string
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Student Progress Tracking</h1>
        <p className="text-muted-foreground">
          Track student performance, manage grades, and generate report cards
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Academic Overview</TabsTrigger>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
          <TabsTrigger value="grading">Grading Scales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AcademicOverview tenantSlug={tenantSlug} />
        </TabsContent>

        <TabsContent value="progress">
          <StudentProgress tenantSlug={tenantSlug} />
        </TabsContent>

        <TabsContent value="report-cards">
          <ReportCardManagement tenantSlug={tenantSlug} />
        </TabsContent>

        <TabsContent value="grading">
          <GradingScales tenantSlug={tenantSlug} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
