"use client"

import { ReactNode } from "react"

interface ParentPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export function ParentPageLayout({ title, description, children }: ParentPageLayoutProps) {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}