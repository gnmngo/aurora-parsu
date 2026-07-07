"use client";

import { motion } from "framer-motion";
import { Check, Circle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  name: string;
  status: "completed" | "current" | "pending";
  date?: string | null;
  description?: string;
}

interface TimelineStepperProps {
  steps: TimelineStep[];
}

export function TimelineStepper({ steps }: TimelineStepperProps) {
  if (!steps || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const completionPct = Math.round((completedCount / steps.length) * 100);

  // Compute estimated next activity
  const nextStep = steps.find((s) => s.status === "current" || s.status === "pending");
  const estimatedNext = nextStep ? nextStep.name : "Academic Defense Workflow Completed";

  return (
    <div className="space-y-4 text-xs font-semibold text-slate-800">
      {/* Progress header bar */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Workflow Progression</span>
        <span className="text-sm font-black text-primary">{completionPct}% Completed</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${completionPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-primary h-full rounded-full"
        />
      </div>

      {/* Estimated next activity warning */}
      <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between gap-2 mt-2">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Estimated Next Milestone</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{estimatedNext}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
      </div>

      {/* Stepper nodes list */}
      <div className="relative border-l-2 border-border pl-6 ml-3 space-y-6 pt-2">
        {steps.map((step, idx) => (
          <div key={idx} className="relative">
            {/* Dot Indicator */}
            <span className={cn(
              "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white",
              step.status === "completed" && "border-success bg-success text-white",
              step.status === "current" && "border-info bg-info text-white animate-pulse",
              step.status === "pending" && "border-border bg-slate-50"
            )}>
              {step.status === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
              {step.status === "current" && <Clock className="h-2.5 w-2.5 text-white" />}
              {step.status === "pending" && <Circle className="h-1.5 w-1.5 text-slate-300" />}
            </span>

            <div>
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "text-xs font-bold",
                  step.status === "completed" && "text-slate-900",
                  step.status === "current" && "text-info",
                  step.status === "pending" && "text-muted-foreground"
                )}>
                  {step.name}
                </h4>
                {step.date && (
                  <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-semibold">
                    {step.date}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
