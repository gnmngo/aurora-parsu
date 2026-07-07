"use client";

import { useEffect, useState } from "react";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DefensePipeline } from "@/components/dashboard/defense-pipeline";
import { ProjectTimelineAndHistory } from "@/components/dashboard/project-timeline-and-history";
import { SubmissionCard } from "@/components/dashboard/submission-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useAuth } from "@/hooks/use-auth";
import { Inbox, Loader2 } from "lucide-react";
import {
  fetchSubmissions,
  type SubmissionRow,
} from "@/lib/projects/queries";

// Import role dashboards
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { AdviserDashboard } from "@/components/dashboard/adviser-dashboard";
import { PanelistDashboard } from "@/components/dashboard/panelist-dashboard";
import { CoordinatorDashboard } from "@/components/dashboard/coordinator-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function DashboardPage() {
  console.log("Dashboard Render Started");
  const [recentSubmissions, setRecentSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuthReady();
  const { roles, user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [activeRole, setActiveRole] = useState<string>("");

  useEffect(() => {
    if (roles && roles.length > 0 && !activeRole) {
      setActiveRole(roles[0]);
    }
  }, [roles, activeRole]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    async function loadRecent() {
      setLoading(true);
      try {
        const rows = await fetchSubmissions(supabase);
        setRecentSubmissions(rows.slice(0, 3));
      } catch (err: unknown) {
        logSupabaseError("Dashboard.loadRecent", err);
      } finally {
        setLoading(false);
      }
    }

    loadRecent();
  }, [isReady, supabase]);

  if (authLoading || !activeRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of defenses, submissions, and review activity
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

      <WelcomeCard />

      {/* Render Dynamic Role Specific Dashboard */}
      {activeRole === "student" && <StudentDashboard userId={user?.id || ""} />}
      {activeRole === "adviser" && <AdviserDashboard userId={user?.id || ""} />}
      {activeRole === "panelist" && <PanelistDashboard userId={user?.id || ""} />}
      {activeRole === "coordinator" && <CoordinatorDashboard />}
      {activeRole === "sys_admin" && <AdminDashboard />}

      {/* Secondary items */}
      <DefensePipeline />
      <ProjectTimelineAndHistory />

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isReady || loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          ) : recentSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No recent submissions found.
              </p>
            </div>
          ) : (
            recentSubmissions.map((sub) => (
              <SubmissionCard
                key={sub.projectId + "-" + sub.stageId}
                {...sub}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
