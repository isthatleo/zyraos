"use client";

import * as React from "react";
import { MoonStar, Sun, Sunrise, Sunset } from "lucide-react";

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreetingIcon(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 12 * 60) return { Icon: Sunrise, className: "text-amber-500" };
  if (minutes < 17 * 60) return { Icon: Sun, className: "text-orange-500" };
  if (minutes < 19 * 60 + 45) return { Icon: Sunset, className: "text-rose-500" };
  return { Icon: MoonStar, className: "text-indigo-500" };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function DashboardGreeting({
  displayName,
  roleLabel,
}: {
  displayName?: string | null;
  roleLabel: string;
}) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const greetingIcon = React.useMemo(() => getGreetingIcon(now || new Date(0)), [now]);
  const Icon = greetingIcon.Icon;
  const name = displayName?.trim() || roleLabel;

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className={`h-5 w-5 ${greetingIcon.className}`} />
        </div>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          {now ? getGreeting(now) : "Welcome back"}, {name}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {now ? `Today is ${formatDate(now)} - ${formatTime(now)}` : "Loading your local dashboard time..."}
      </p>
    </div>
  );
}
