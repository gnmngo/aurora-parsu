"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Calendar,
  AlertCircle,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";

interface KpiStat {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
}

export function KpiCards() {
  const [stats, setStats] = useState<KpiStat[]>([]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuthReady();
  const { roles, user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!isReady || !user) return;

    async function fetchKpis() {
      try {
        const primaryRole = roles[0] || "student";

        if (primaryRole === "student") {
          // Student-centric KPIs
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user!.id)
            .maybeSingle();

          if (!studentRecord) {
            setStats([
              { label: "Project Status", value: "No Project", icon: BookOpen },
            ]);
            setLoading(false);
            return;
          }

          const { data: project } = await supabase
            .from("projects")
            .select(`
              id, status, current_stage_id,
              defense_stages ( name, sequence_order ),
              documents ( id, document_versions ( id, version_number, is_current ) ),
              defense_schedules ( scheduled_at, status )
            `)
            .eq("student_id", studentRecord.id)
            .maybeSingle();

          if (!project) {
            setStats([
              { label: "Project Status", value: "No Project", icon: BookOpen },
            ]);
            setLoading(false);
            return;
          }

          const latestVersion = project.documents?.flatMap((d: any) =>
            d.document_versions || []
          ).sort((a: any, b: any) => b.version_number - a.version_number)[0];

          const upcomingSchedule = (project.defense_schedules as any[])
            ?.filter((s: any) => s.status === "scheduled")
            .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

          const [annCount] = await Promise.all([
            supabase
              .from("annotations")
              .select("id", { count: "exact", head: true })
              .eq("status", "open"),
          ]);

          setStats([
            {
              label: "Current Stage",
              value: (project.defense_stages as any)?.name || "Not Assigned",
              icon: BookOpen,
              color: "text-primary",
            },
            {
              label: "Project Status",
              value: (project.status || "draft").replace(/_/g, " "),
              icon: Clock,
              color: "text-warning",
            },
            {
              label: "Manuscript Version",
              value: latestVersion ? `v${latestVersion.version_number}` : "None",
              icon: FileText,
              color: "text-info",
            },
            {
              label: "Open Comments",
              value: annCount.count ?? 0,
              icon: MessageSquare,
              color: "text-danger",
            },
            {
              label: "Next Defense",
              value: upcomingSchedule
                ? new Date(upcomingSchedule.scheduled_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })
                : "Not Scheduled",
              icon: Calendar,
              color: "text-success",
            },
          ]);
        } else if (primaryRole === "adviser") {
          // Adviser KPIs — scoped to assigned students
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id)
            .eq("member_role", "adviser");

          const projectIds = (memberProjects || []).map((m: any) => m.project_id);

          const [submittedRes, pendingRes, completedRes] = await Promise.all([
            supabase.from("projects").select("id", { count: "exact", head: true }).in("id", projectIds),
            supabase.from("projects").select("id", { count: "exact", head: true }).in("id", projectIds).eq("status", "under_review"),
            supabase.from("projects").select("id", { count: "exact", head: true }).in("id", projectIds).eq("status", "completed"),
          ]);

          setStats([
            { label: "Assigned Students", value: submittedRes.count ?? 0, icon: User },
            { label: "Pending Review", value: pendingRes.count ?? 0, icon: Clock, color: "text-warning" },
            { label: "Completed", value: completedRes.count ?? 0, icon: CheckCircle2, color: "text-success" },
          ]);
        } else if (primaryRole === "panelist") {
          // Panelist KPIs — assigned defenses
          const [assignedRes, submittedRes] = await Promise.all([
            supabase.from("defense_panels").select("id", { count: "exact", head: true }).eq("profile_id", user!.id),
            supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("profile_id", user!.id).eq("status", "submitted"),
          ]);

          setStats([
            { label: "Assigned Defenses", value: assignedRes.count ?? 0, icon: Calendar },
            { label: "Evaluations Submitted", value: submittedRes.count ?? 0, icon: CheckCircle2, color: "text-success" },
          ]);
        } else {
          // Coordinator / sys_admin — full global KPIs
          const [papers, pending, completed, annCount, schedCount] = await Promise.all([
            supabase.from("projects").select("*", { count: "exact", head: true }),
            supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "under_review"),
            supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
            supabase.from("annotations").select("*", { count: "exact", head: true }),
            supabase.from("defense_schedules").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
          ]);

          setStats([
            { label: "Total Projects", value: papers.count ?? 0, icon: FileText },
            { label: "Pending Reviews", value: pending.count ?? 0, icon: Clock, color: "text-warning" },
            { label: "Completed Defenses", value: completed.count ?? 0, icon: CheckCircle2, color: "text-success" },
            { label: "Scheduled Defenses", value: schedCount.count ?? 0, icon: Calendar, color: "text-info" },
            { label: "Total Annotations", value: annCount.count ?? 0, icon: MessageSquare },
          ]);
        }
      } catch (err) {
        logSupabaseError("KpiCards.fetchKpis", err);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, [isReady, user, roles, supabase]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${stats.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-5"}`}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <Card className="group cursor-default">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10 ${stat.color || ""}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground capitalize">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
