"use client";

import { Construction, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function titleFromSegments(segments?: string[]) {
  const value = (segments || []).join(" / ").replace(/[-_]/g, " ").trim();
  return value ? value.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Dashboard";
}

export function PlaceholderDashboard({
  title,
  description,
  segments,
}: {
  title?: string;
  description?: string;
  segments?: string[];
}) {
  const resolvedTitle = title || titleFromSegments(segments);
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Construction className="size-6" />
            </div>
            <Badge variant="outline" className="rounded-full">Routed module</Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{resolvedTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {description || "This page is routed and ready for the dedicated production module implementation."}
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <ExternalLink className="mb-2 size-4 text-primary" />
            Navigation is active. The full feature UI will be implemented in its own dashboard pass.
          </div>
        </div>
      </section>
      <Card className="rounded-3xl border-border/80">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          {["Real API connection", "Role permissions", "Audit logging"].map((item) => (
            <div key={item} className="rounded-2xl border bg-background/70 p-4">
              <p className="font-semibold">{item}</p>
              <p className="mt-1 text-sm text-muted-foreground">Will be completed when this dashboard section is built.</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
