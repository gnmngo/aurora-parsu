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
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
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
  href?: string;
  actionText?: string;
  description?: string;
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
          // 1. Resolve student project via project_members or students.id
          let { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user!.id)
            .maybeSingle();

          const { data: memberRows } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id)
            .limit(1);

          const memberProjId = memberRows?.[0]?.project_id;

          let projQuery = supabase
            .from("projects")
            .select(`
              id, status, current_stage_id,
              defense_stages ( name, sequence_order ),
              documents ( id, document_versions ( id, version_number, is_current ) ),
              defense_schedules ( scheduled_at, status )
            `);

          if (memberProjId) {
            projQuery = projQuery.eq("id", memberProjId);
          } else if (studentRecord?.id) {
            projQuery = projQuery.eq("student_id", studentRecord.id);
          } else {
            setStats([
              { label: "Project Status", value: "No Project", icon: BookOpen, href: "/dashboard/my-project", actionText: "Register", description: "Submit thesis proposal" },
              { label: "Manuscript Version", value: "None", icon: FileText, href: "/dashboard/submissions", actionText: "Upload", description: "Upload PDF manuscript" },
              { label: "Open Comments", value: 0, icon: MessageSquare, href: "/dashboard/annotations", actionText: "History", description: "Review adviser feedback" },
              { label: "Next Defense", value: "Not Scheduled", icon: Calendar, href: "/dashboard/defenses", actionText: "Calendar", description: "Defense schedule & queue" },
            ]);
            setLoading(false);
            return;
          }

          const { data: project } = await projQuery.maybeSingle();

          if (!project) {
            setStats([
              { label: "Project Status", value: "No Project", icon: BookOpen, href: "/dashboard/my-project", actionText: "Register", description: "Submit thesis proposal" },
              { label: "Manuscript Version", value: "None", icon: FileText, href: "/dashboard/submissions", actionText: "Upload", description: "Upload PDF manuscript" },
              { label: "Open Comments", value: 0, icon: MessageSquare, href: "/dashboard/annotations", actionText: "History", description: "Review adviser feedback" },
              { label: "Next Defense", value: "Not Scheduled", icon: Calendar, href: "/dashboard/defenses", actionText: "Calendar", description: "Defense schedule & queue" },
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

          // Scope open annotations to this project's document versions
          const versionIds = project.documents?.flatMap((d: any) =>
            d.document_versions?.map((v: any) => v.id) || []
          ) || [];

          let openCommentsCount = 0;
          if (versionIds.length > 0) {
            const { count } = await supabase
              .from("annotations")
              .select("id", { count: "exact", head: true })
              .in("document_version_id", versionIds)
              .eq("status", "open");
            openCommentsCount = count ?? 0;
          }

          setStats([
            {
              label: "Current Stage",
              value: (project.defense_stages as any)?.name || "Not Assigned",
              icon: BookOpen,
              color: "text-primary",
              href: "/dashboard/my-project",
              actionText: "Roadmap",
              description: "View stage requirements",
            },
            {
              label: "Project Status",
              value: (project.status || "draft").replace(/_/g, " "),
              icon: Clock,
              color: "text-warning",
              href: "/dashboard/my-project",
              actionText: "Details",
              description: "Track progress & clearance",
            },
            {
              label: "Manuscript Version",
              value: latestVersion ? `v${latestVersion.version_number}` : "None",
              icon: FileText,
              color: "text-info",
              href: "/dashboard/submissions",
              actionText: "Manage",
              description: "Compare versions & PDF",
            },
            {
              label: "Open Comments",
              value: openCommentsCount,
              icon: MessageSquare,
              color: "text-danger",
              href: "/dashboard/annotations",
              actionText: "Review",
              description: "Adviser & panel feedback",
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
              href: "/dashboard/defenses",
              actionText: "Pipeline",
              description: upcomingSchedule ? "Venue & panel appointed" : "Defense scheduling queue",
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
            {
              label: "Assigned Students",
              value: submittedRes.count ?? 0,
              icon: User,
              href: "/dashboard/submissions",
              actionText: "Advisees",
              description: "Mentored research groups",
            },
            {
              label: "Pending Review",
              value: pendingRes.count ?? 0,
              icon: Clock,
              color: "text-warning",
              href: "/dashboard/submissions",
              actionText: "Review",
              description: "Endorse or request revisions",
            },
            {
              label: "Completed",
              value: completedRes.count ?? 0,
              icon: CheckCircle2,
              color: "text-success",
              href: "/dashboard/grades",
              actionText: "Verdicts",
              description: "Graded defense outcomes",
            },
          ]);
        } else if (primaryRole === "panelist") {
          // Panelist KPIs — assigned defenses
          const [assignedRes, submittedRes] = await Promise.all([
            supabase.from("defense_panels").select("id", { count: "exact", head: true }).eq("profile_id", user!.id),
            supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("panelist_id", user!.id).eq("status", "submitted"),
          ]);

          setStats([
            {
              label: "Assigned Defenses",
              value: assignedRes.count ?? 0,
              icon: Calendar,
              href: "/dashboard/defenses",
              actionText: "Defenses",
              description: "Upcoming oral defense panels",
            },
            {
              label: "Evaluations Submitted",
              value: submittedRes.count ?? 0,
              icon: CheckCircle2,
              color: "text-success",
              href: "/dashboard/grades",
              actionText: "Rubrics",
              description: "Consensus scoring & verdicts",
            },
          ]);
        } else {
          // Coordinator / sys_admin — full global KPIs
          const [papers, pending, completed, annCount, schedCount] = await Promise.all([
            supabase.from("projects").select("*", { count: "exact", head: true }).is("archived_at", null),
            supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "under_review").is("archived_at", null),
            supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed").is("archived_at", null),
            supabase.from("annotations").select("*", { count: "exact", head: true }),
            supabase.from("defense_schedules").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
          ]);

          setStats([
            {
              label: "Total Projects",
              value: papers.count ?? 0,
              icon: FileText,
              href: "/dashboard/defenses",
              actionText: "Pipeline",
              description: "Active research projects",
            },
            {
              label: "Pending Reviews",
              value: pending.count ?? 0,
              icon: Clock,
              color: "text-warning",
              href: "/dashboard/defenses/schedule",
              actionText: "Schedule",
              description: "Awaiting defense scheduling",
            },
            {
              label: "Completed Defenses",
              value: completed.count ?? 0,
              icon: CheckCircle2,
              color: "text-success",
              href: "/dashboard/grades",
              actionText: "Grades",
              description: "Passed oral presentations",
            },
            {
              label: "Scheduled Defenses",
              value: schedCount.count ?? 0,
              icon: Calendar,
              color: "text-info",
              href: "/dashboard/defenses",
              actionText: "Calendar",
              description: "Scheduled slots & venues",
            },
            {
              label: "Total Annotations",
              value: annCount.count ?? 0,
              icon: MessageSquare,
              href: "/dashboard/annotations",
              actionText: "History",
              description: "Highlights & commentary",
            },
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
        const cardContent = (
          <Card
            className={`group border border-border/80 h-full flex flex-col justify-between transition-all duration-200 ${
              stat.href
                ? "cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                : "cursor-default"
            }`}
          >
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10 ${
                      stat.color || ""
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.href && (
                    <span className="text-[11px] font-semibold text-muted-foreground/60 group-hover:text-primary transition-colors flex items-center gap-0.5">
                      {stat.actionText || "View"}{" "}
                      <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  )}
                </div>
                <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground capitalize">
                  {stat.label}
                </p>
              </div>
              {stat.description && (
                <p className="mt-3 text-[10px] text-muted-foreground/80 line-clamp-1 border-t border-border/40 pt-2 font-normal">
                  {stat.description}
                </p>
              )}
            </CardContent>
          </Card>
        );

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            {stat.href ? (
              <Link href={stat.href} className="block h-full no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
                {cardContent}
              </Link>
            ) : (
              cardContent
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
