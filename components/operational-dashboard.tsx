import {
  Activity,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  FileText,
  Shield,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OperationalDashboardProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string; note: string }>;
  workflows: Array<{ title: string; description: string }>;
};

const icons = [Activity, Users, ClipboardList, CalendarCheck, Shield, FileText, BarChart3];

export function OperationalDashboard({
  eyebrow,
  title,
  description,
  metrics,
  workflows,
}: OperationalDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Card key={metric.label} className="bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{metric.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {workflows.map((workflow, index) => {
          const Icon = icons[(index + 2) % icons.length];
          return (
            <Card key={workflow.title} className="bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{workflow.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{workflow.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
