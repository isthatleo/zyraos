"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  period?: string;
  features: string[];
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
}

interface PlanSelectionStepProps {
  selectedPlanId: string;
  onUpdate: (planId: string) => void;
}

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

export function PlanSelectionStep({ selectedPlanId, onUpdate }: PlanSelectionStepProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/master/plans", { cache: "no-store" });
        if (!response.ok) {
          setError("Failed to fetch subscription plans");
          return;
        }
        const result = await response.json();
        setPlans((result.plans || []).filter((plan: Plan) => plan.isActive));
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("An error occurred while loading plans");
      } finally {
        setLoading(false);
      }
    };

    void fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading subscription plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-2 font-medium text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary underline hover:text-primary/80"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-1 text-lg font-medium">Choose a Subscription Plan</h3>
        <p className="text-sm text-muted-foreground">This plan becomes the school&apos;s first pending invoice.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedPlanId === plan.id ? "bg-primary/5 ring-2 ring-primary" : "hover:border-primary/30"
            )}
            onClick={() => onUpdate(plan.id)}
          >
            <CardHeader className="pb-3 text-center">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-2xl font-bold">{money(plan.price, plan.currency)}</span>
                <span className="text-sm text-muted-foreground">/{plan.period || "month"}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0 text-primary" />
                <span>Students: {plan.maxStudents?.toLocaleString() ?? "Unlimited"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                <span>Staff: {plan.maxStaff?.toLocaleString() ?? "Unlimited"}</span>
              </div>
              {selectedPlanId === plan.id ? (
                <div className="flex justify-center pt-2">
                  <Badge>Selected</Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          No active subscription plans available.
        </div>
      ) : null}

      {selectedPlan ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          A pending invoice for <strong>{money(selectedPlan.price, selectedPlan.currency)}/{selectedPlan.period || "month"}</strong> will be created upon provisioning.
        </div>
      ) : null}
    </div>
  );
}
