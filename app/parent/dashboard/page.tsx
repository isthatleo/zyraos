"use client"

import { ParentPageLayout } from "@/components/parent-page-layout"
import { ParentKPICards } from "@/components/parent-kpi-cards"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bell, Calendar, User } from "lucide-react"
import Link from "next/link"

export default function ParentDashboardPage() {
  return (
    <ParentPageLayout 
      title="Parent Dashboard" 
      description="Welcome back! Here is a quick overview of your children's school activities."
    >
      <ParentKPICards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Children Overview</CardTitle>
            <CardDescription>Quick links to track each child's performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Liam Smith", class: "Grade 10 - Science", status: "Active", avatar: "LS" },
              { name: "Sophia Smith", class: "Grade 7 - Arts", status: "Active", avatar: "SS" },
            ].map((child) => (
              <div key={child.name} className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {child.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-sm text-muted-foreground">{child.class}</p>
                  </div>
                </div>
                <Link href="/parent/progress">
                  <Button variant="ghost" size="sm">
                    View Progress <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start text-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
              <p>The annual science fair has been rescheduled to next Friday. Please check the communication portal for details.</p>
            </div>
            <Button variant="outline" className="w-full" asChild><Link href="/parent/communication">Go to Communication</Link></Button>
          </CardContent>
        </Card>
      </div>
    </ParentPageLayout>
  )
}