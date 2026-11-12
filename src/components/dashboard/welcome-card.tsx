"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap, Building2, Shield, BookOpen, Layers, Sparkles, Award } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IsoEvaluationDialog } from "@/components/research/iso-evaluation-dialog";

export function WelcomeCard() {
  const { profile, roles, activeRole, isLoading } = useAuth();
  const { isReady } = useAuthReady();
  const [projectInfo, setProjectInfo] = useState<{
    title?: string;
    stageName?: string;
    status?: string;
  } | null>(null);
  const [affiliation, setAffiliation] = useState<{
    collegeName?: string;
    departmentName?: string;
  }>({});
  const supabase = useMemo(() => createClient(), []);
  const effectiveRole = activeRole || roles[0] || "student";

  useEffect(() => {
    if (!isReady || !profile) return;

    async function fetchUserContext() {
      try {
        const isStudent = effectiveRole === "student" || roles.includes("student");

        // Load college & department affiliation
        const collegeId = (profile as any).college_id;
        const departmentId = (profile as any).department_id;
        let cName: string | undefined;
        let dName: string | undefined;

        if (collegeId) {
          const { data: c } = await supabase.from("colleges").select("code, name").eq("id", collegeId).maybeSingle();
          if (c) cName = c.code ? `${c.code} - ${c.name}` : c.name;
        }
        if (departmentId) {
          const { data: d } = await supabase.from("departments").select("code, name, college_id").eq("id", departmentId).maybeSingle();
          // Department of Computational Sciences (DCS) and other departments are exclusive to their parent college (e.g. CEC).
          // Only show department affiliation if it strictly matches the user's assigned college.
          if (d && (!collegeId || d.college_id === collegeId)) {
            dName = d.name;
          }
        }
        if (!dName && isStudent) {
          const { data: std } = await supabase
            .from("students")
            .select("programs(code, name), departments(name)")
            .eq("profile_id", profile!.id)
            .maybeSingle();
          if ((std as any)?.departments?.name) {
            dName = (std as any).departments.name;
          } else if ((std as any)?.programs?.name) {
            dName = (std as any).programs.code ? `[${(std as any).programs.code}] ${(std as any).programs.name}` : (std as any).programs.name;
          }
        }
        setAffiliation({ collegeName: cName, departmentName: dName });

        if (effectiveRole === "student") {
          const activeProjectId =
            typeof window !== "undefined"
              ? localStorage.getItem("aurora_active_project_id")
              : null;

          let proj: any = null;

          if (activeProjectId) {
            const { data: p } = await supabase
              .from("projects")
              .select("id, title, status, defense_stages ( name )")
              .eq("id", activeProjectId)
              .is("archived_at", null)
              .maybeSingle();
            if (p) proj = p;
          }

          if (!proj) {
            // Check project_members, owned, created
            const { data: memberRows } = await supabase
              .from("project_members")
              .select("project_id")
              .eq("profile_id", profile!.id);

            const memberProjIds = (memberRows || []).map((r) => r.project_id);

            const { data: std } = await supabase
              .from("students")
              .select("id")
              .eq("profile_id", profile!.id)
              .maybeSingle();

            let ownerProjIds: string[] = [];
            if (std?.id) {
              const { data: owned } = await supabase
                .from("projects")
                .select("id")
                .eq("student_id", std.id)
                .is("archived_at", null);
              ownerProjIds = (owned || []).map((o) => o.id);
            }

            const { data: created } = await supabase
              .from("projects")
              .select("id")
              .eq("created_by", profile!.id)
              .is("archived_at", null);
            const createdProjIds = (created || []).map((c) => c.id);

            const allIds = Array.from(new Set([...memberProjIds, ...ownerProjIds, ...createdProjIds]));

            if (allIds.length > 0) {
              const { data: pList } = await supabase
                .from("projects")
                .select("id, title, status, defense_stages ( name )")
                .in("id", allIds)
                .is("archived_at", null)
                .order("created_at", { ascending: false })
                .limit(1);

              if (pList && pList[0]) {
                proj = pList[0];
                if (typeof window !== "undefined") {
                  localStorage.setItem("aurora_active_project_id", proj.id);
                }
              }
            }
          }

          if (proj) {
            setProjectInfo({
              title: proj.title,
              stageName: (proj.defense_stages as any)?.name || "Not Assigned",
              status: (proj.status || "draft").replace(/_/g, " "),
            });
          } else {
            setProjectInfo(null);
          }
        } else {
          setProjectInfo(null);
        }
      } catch (err) {
        logSupabaseError("WelcomeCard.fetchUserContext", err);
      }
    }

    fetchUserContext();

    const handleProjectChanged = () => {
      fetchUserContext();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("aurora_project_changed", handleProjectChanged);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("aurora_project_changed", handleProjectChanged);
      }
    };
  }, [isReady, profile, roles, effectiveRole, supabase]);

  if (isLoading || !profile) {
    return (
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  const collegeName = affiliation.collegeName || (profile as any).colleges?.name;
  const departmentName = affiliation.departmentName || (profile as any).departments?.name;
  const roleNameMap: Record<string, string> = {
    college_dean: "College Dean",
    sys_admin: "System Administrator",
    coordinator: "Research Coordinator",
    panelist: "Defense Panelist",
    adviser: "Research Adviser",
    student: "Student Proponent",
  };
  const roleName = roleNameMap[effectiveRole] || effectiveRole.replace(/_/g, " ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden border border-border bg-card text-card-foreground shadow-xs">
        {/* Subtle geometric A watermark motif */}
        <div className="pointer-events-none absolute -right-6 -bottom-10 h-44 w-44 opacity-[0.03] dark:opacity-[0.06] select-none">
          <Image
            src="/aurora-symbol-transparent.png"
            alt=""
            width={176}
            height={176}
            className="h-full w-full object-contain dark:invert-0 invert"
          />
        </div>

        <CardContent className="relative p-6 sm:p-7">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Welcome back,
                </p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {profile.first_name} {profile.last_name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-muted/70 text-foreground border-border/80 hover:bg-muted capitalize font-bold text-xs gap-1.5 py-1 px-3 shadow-2xs">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  {roleName}
                </Badge>
                {collegeName && (
                  <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border/60 font-medium text-xs gap-1.5 py-1 px-3">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {collegeName}
                  </Badge>
                )}
                {departmentName && (
                  <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border/60 font-medium text-xs gap-1.5 py-1 px-3">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    {departmentName}
                  </Badge>
                )}
                <IsoEvaluationDialog
                  triggerButton={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      Take Survey (SUS &amp; UTAUT)
                    </button>
                  }
                />
              </div>
            </div>

            {effectiveRole === "student" && projectInfo ? (
              <Link
                href="/dashboard/my-project"
                className="group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/30 p-3 sm:items-end hover:bg-muted/60 hover:border-primary/40 transition-all no-underline"
              >
                <div className="sm:text-right">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center sm:justify-end gap-1 group-hover:text-primary transition-colors">
                    Active Stage &rarr;
                  </p>
                  <p className="text-base font-black flex items-center gap-1.5 sm:justify-end text-foreground group-hover:text-primary transition-colors">
                    <Layers className="h-4 w-4 text-primary" />
                    {projectInfo.stageName}
                  </p>
                </div>
                <div>
                  <Badge variant="outline" className="bg-muted/60 text-foreground border-border/80 font-bold capitalize text-xs px-2.5 py-0.5">
                    {projectInfo.status}
                  </Badge>
                </div>
              </Link>
            ) : effectiveRole === "college_dean" ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Executive Navigation</p>
                <Link
                  href="/dashboard/defenses"
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl border border-border transition-all shadow-xs no-underline hover:border-primary/40"
                >
                  <Shield className="h-3.5 w-3.5 text-primary" /> College Defense Oversight &rarr;
                </Link>
              </div>
            ) : effectiveRole === "adviser" ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Fast Navigation</p>
                <Link
                  href="/dashboard/submissions"
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl border border-border transition-all shadow-xs no-underline hover:border-primary/40"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Advisee Review Queue &rarr;
                </Link>
              </div>
            ) : effectiveRole === "panelist" ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Fast Navigation</p>
                <Link
                  href="/workspace"
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl border border-border transition-all shadow-xs no-underline hover:border-primary/40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Open Evaluation Workspace &rarr;
                </Link>
              </div>
            ) : effectiveRole === "coordinator" || effectiveRole === "sys_admin" ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Fast Navigation</p>
                <Link
                  href="/dashboard/defenses/schedule"
                  className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl border border-border transition-all shadow-xs no-underline hover:border-primary/40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Schedule Defense &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1 sm:items-end">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">System Status</p>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs px-2.5 py-0.5">
                  AURORA Online
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
