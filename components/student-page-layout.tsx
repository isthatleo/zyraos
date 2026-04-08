"use client"

import { ReactNode } from "react"

interface StudentPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export function StudentPageLayout({ title, description, children }: StudentPageLayoutProps) {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}