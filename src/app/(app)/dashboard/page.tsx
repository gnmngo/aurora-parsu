"use client";

import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DefensePipeline } from "@/components/dashboard/defense-pipeline";
import { ProjectTimelineAndHistory } from "@/components/dashboard/project-timeline-and-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Role-specific dashboards
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { AdviserDashboard } from "@/components/dashboard/adviser-dashboard";
import { PanelistDashboard } from "@/components/dashboard/panelist-dashboard";
import { CoordinatorDashboard } from "@/components/dashboard/coordinator-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function DashboardPage() {
  const { roles, user, isLoading: authLoading } = useAuth();
  const [activeRole, setActiveRole] = useState<string>("");

  useEffect(() => {
    if (roles && roles.length > 0 && !activeRole) {
      setActiveRole(roles[0]);
    }
  }, [roles, activeRole]);

  if (authLoading || !activeRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isManagementRole = ["coordinator", "sys_admin", "college_dean"].includes(activeRole);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header with role switcher for multi-role users */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your academic defense workflow
          </p>
        </div>

        {roles && roles.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-semibold">Dashboard view:</span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary capitalize cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Welcome card (personalized) */}
      <WelcomeCard />

      {/* Role-scoped KPI cards — each role sees only their relevant stats */}
      <KpiCards />

      {/* Role-specific dashboard panel */}
      {activeRole === "student" && <StudentDashboard userId={user?.id || ""} />}
      {activeRole === "adviser" && <AdviserDashboard userId={user?.id || ""} />}
      {activeRole === "panelist" && <PanelistDashboard userId={user?.id || ""} />}
      {activeRole === "coordinator" && <CoordinatorDashboard />}
      {/* B11: college_dean sees coordinator-level overview dashboard */}
      {activeRole === "college_dean" && <CoordinatorDashboard />}
      {activeRole === "sys_admin" && <AdminDashboard />}
      {/* Fallback for any unrecognized role — prevents blank screen */}
      {!["student", "adviser", "panelist", "coordinator", "college_dean", "sys_admin"].includes(activeRole) && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No dashboard configured for role: <span className="font-black text-foreground">{activeRole}</span>.
            Contact your system administrator.
          </p>
        </div>
      )}

      {/* Management-only secondary panels */}
      {isManagementRole && (
        <>
          <DefensePipeline />
          <ProjectTimelineAndHistory />
        </>
      )}
    </div>
  );
}
