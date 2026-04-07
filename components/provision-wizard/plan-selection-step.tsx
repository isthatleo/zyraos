"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
}

interface PlanSelectionStepProps {
  selectedPlanId: string;
  onUpdate: (planId: string) => void;
}

export function PlanSelectionStep({ selectedPlanId, onUpdate }: PlanSelectionStepProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/master/plans');
        if (response.ok) {
          const result = await response.json();
          setPlans(result.plans || []);
        } else {
          setError('Failed to fetch subscription plans');
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError('An error occurred while loading plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
        <p className="text-gray-500">Loading subscription plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-orange-600 hover:text-orange-700 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Choose a Subscription Plan</h3>
        <p className="text-sm text-gray-600">This plan becomes the school&apos;s first pending invoice.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedPlanId === plan.id
                ? "ring-2 ring-orange-500 bg-orange-50/50"
                : "hover:border-orange-200"
            )}
            onClick={() => onUpdate(plan.id)}
          >
            <CardHeader className="pb-3 text-center">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">GH₵{plan.price.toLocaleString()}</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center text-sm text-gray-700 gap-2">
                <Users className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span>Students: {plan.maxStudents?.toLocaleString() ?? "Unlimited"}</span>
              </div>
              <div className="flex items-center text-sm text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span>Staff: {plan.maxStaff?.toLocaleString() ?? "Unlimited"}</span>
              </div>
              {selectedPlanId === plan.id && (
                <div className="flex justify-center pt-2">
                  <Badge className="bg-orange-600 text-white hover:bg-orange-600">Selected</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          No active subscription plans available.
        </div>
      )}

      {selectedPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          A pending invoice for <strong>GH₵{selectedPlan.price.toLocaleString()}/month</strong> will be created upon provisioning.
        </div>
      )}
    </div>
  );
}
