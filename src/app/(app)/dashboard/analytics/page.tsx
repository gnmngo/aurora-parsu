"use client";

import { useState } from "react";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { ResearchObjectivesDashboard } from "@/components/research/research-objectives-dashboard";
import { BarChart3, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<"operational" | "research">("operational");

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin", "college_dean"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header with View Mode Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {activeView === "operational" ? "Analytics & Institutional Insights" : "Research Objectives Instrumentation"}
              </h1>
              {activeView === "research" && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-200">
                  RO2 &amp; RO3
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeView === "operational"
                ? "Program-wide metrics, defense progression rates, and operational turnaround"
                : "Empirical technical performance benchmarks (RO2) and ISO/IEC 25010 software quality evaluation (RO3)"}
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView("operational")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                activeView === "operational"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Operational Insights
            </button>
            <button
              type="button"
              onClick={() => setActiveView("research")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                activeView === "research"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <FlaskConical className="h-4 w-4 text-indigo-600" />
              Research Objectives (RO2 &amp; RO3)
            </button>
          </div>
        </div>

        {/* Content Section */}
        {activeView === "operational" ? (
          <div className="space-y-6">
            <KpiCards />
            <AnalyticsCharts />
          </div>
        ) : (
          <ResearchObjectivesDashboard />
        )}
      </div>
    </RoleGuard>
  );
}

