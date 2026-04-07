"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Module {
  key: string;
  name: string;
  enabled: boolean;
}

interface ModulesStepProps {
  modules: Module[];
  onUpdate: (modules: Module[]) => void;
}

const MODULE_DETAILS = {
  student_portal: {
    description: "Student academic portal for assignments, grades, and communication",
    required: true,
  },
  parent_portal: {
    description: "Parent access to track their child's progress and communicate with teachers",
    required: false,
  },
  administrator_portal: {
    description: "Full school administration and management tools",
    required: true,
  },
  hr_portal: {
    description: "Staff management, payroll, and HR functions",
    required: false,
  },
  finance_portal: {
    description: "Fee management, invoicing, and financial reporting",
    required: false,
  },
  library_portal: {
    description: "Library management, book tracking, and resource management",
    required: false,
  },
};

export function ModulesStep({ modules, onUpdate }: ModulesStepProps) {
  const toggleModule = (moduleKey: string, enabled: boolean) => {
    const updatedModules = modules.map(module =>
      module.key === moduleKey ? { ...module, enabled } : module
    );
    onUpdate(updatedModules);
  };

  const enabledCount = modules.filter(m => m.enabled).length;
  const totalCount = modules.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Enabled Modules</h3>
        <p className="text-gray-600 mb-4">
          Choose which modules to enable for this school. Core modules are required for basic functionality.
        </p>
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
          {enabledCount} of {totalCount} modules enabled
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((module) => {
          const details = MODULE_DETAILS[module.key as keyof typeof MODULE_DETAILS];
          const isRequired = details?.required;

          return (
            <Card key={module.key} className={cn(
              "transition-all duration-200",
              module.enabled ? "border-orange-200 bg-orange-50" : "border-gray-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{module.name}</CardTitle>
                    {isRequired && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Required
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={module.enabled}
                    onCheckedChange={(checked) => toggleModule(module.key, checked)}
                    disabled={isRequired}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  {details?.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Module Information</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Required modules cannot be disabled as they provide core functionality</li>
          <li>• Additional modules can be enabled/disabled later from the school settings</li>
          <li>• Disabled modules won't be accessible to users and won't incur additional costs</li>
          <li>• Some advanced features may require specific modules to be enabled</li>
        </ul>
      </div>
    </div>
  );
}
