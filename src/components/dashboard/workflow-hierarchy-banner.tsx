"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileCheck2,
  CalendarClock,
  ClipboardCheck,
  Award,
  ArrowRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export interface WorkflowStepItem {
  step: number;
  title: string;
  subtitle: string;
  actor: string;
  href: string;
  matchPaths: string[];
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

export function WorkflowHierarchyBanner({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { roles, activeRole } = useAuth();
  const effectiveRole = activeRole || roles[0] || "student";
  const isStudent = effectiveRole === "student";
  const isStaff = ["coordinator", "sys_admin", "college_dean"].includes(effectiveRole);

  const steps: WorkflowStepItem[] = [
    {
      step: 1,
      title: "Topic & Manuscript",
      subtitle: "Register project, assign adviser & upload PDF",
      actor: "Student Proponents",
      href: isStudent ? "/dashboard/my-project" : "/dashboard/submissions",
      matchPaths: ["/dashboard/my-project", "/dashboard/submissions"],
      icon: BookOpen,
      accent: "from-blue-500/15 to-blue-600/5 border-blue-500/30 text-blue-700 dark:text-blue-300",
    },
    {
      step: 2,
      title: "Adviser Endorsement",
      subtitle: "Inline PDF review & defense readiness sign-off",
      actor: "Research Adviser",
      href: "/workspace",
      matchPaths: ["/workspace", "/dashboard/annotations"],
      icon: FileCheck2,
      accent: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      step: 3,
      title: "Defense Scheduling",
      subtitle: "Batch/Single slot allocation & panel assignment",
      actor: "Coordinator",
      href: isStaff ? "/dashboard/defenses/schedule" : "/dashboard/defenses",
      matchPaths: ["/dashboard/defenses", "/dashboard/defenses/schedule"],
      icon: CalendarClock,
      accent: "from-amber-500/15 to-amber-600/5 border-amber-500/30 text-amber-700 dark:text-amber-300",
    },
    {
      step: 4,
      title: "Panel Evaluation",
      subtitle: "100-pt rubric scoring & digital signature",
      actor: "Defense Panelists",
      href: "/workspace",
      matchPaths: ["/admin/rubrics"],
      icon: ClipboardCheck,
      accent: "from-violet-500/15 to-violet-600/5 border-violet-500/30 text-violet-700 dark:text-violet-300",
    },
    {
      step: 5,
      title: "Verdict & DCS Forms",
      subtitle: "Consensus grade, verdict & institutional forms",
      actor: "Coordinator / Dean",
      href: isStaff ? "/admin/reports" : "/dashboard/grades",
      matchPaths: ["/dashboard/grades", "/admin/reports"],
      icon: Award,
      accent: "from-rose-500/15 to-rose-600/5 border-rose-500/30 text-rose-700 dark:text-rose-300",
    },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
            Institutional Academic Defense Workflow Hierarchy
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          5-Stage End-to-End Governance Pipeline (College &rarr; Program &rarr; Milestone &rarr; Panel &rarr; Verdict)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          const isActive = item.matchPaths.some(
            (p) => pathname === p || pathname.startsWith(p + "/")
          );

          return (
            <Link
              key={item.step}
              href={item.href}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm no-underline",
                isActive
                  ? `bg-gradient-to-br ${item.accent} ring-1 ring-primary/30 shadow-xs`
                  : "border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                    )}
                  >
                    Step {item.step}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground">
                    {item.actor}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                </div>

                {!compact && (
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {idx < steps.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 z-10" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
