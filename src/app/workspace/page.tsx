"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Sparkles,
  UserCheck,
  Shield,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Layers,
  Building2,
  Award,
  RotateCw,
  FileCheck2,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { AppShell } from "@/components/layout/app-shell";
import { WorkflowHierarchyBanner } from "@/components/dashboard/workflow-hierarchy-banner";
import { AuroraLoader } from "@/components/ui/aurora-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const { user, roles, activeRole, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [adviserProjectIds, setAdviserProjectIds] = useState<Set<string>>(new Set());
  const [panelProjectIds, setPanelProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "endorsed" | "concluded">("all");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const supabase = useMemo(() => createClient(), []);

  const loadWorkspaceList = useCallback(
    async (isBackground = false) => {
      if (authLoading) return;

      try {
        if (!isBackground) setLoading(true);
        else setRefreshing(true);

        // Fetch default stages
        const { data: dbStages } = await supabase
          .from("defense_stages")
          .select("id, name, sequence_order")
          .order("sequence_order");

        const stageList = dbStages || [];
        // Deduplicate stage names for the filter pills
        setStages(stageList);
        const defaultStageId = stageList[0]?.id || "";

        if (user) {
          const effectiveRole = activeRole || roles[0] || "student";
          const isManagement = ["coordinator", "sys_admin", "college_dean"].includes(effectiveRole);
          const isStudent = effectiveRole === "student";
          const isPanelist = effectiveRole === "panelist";
          const isAdviser = effectiveRole === "adviser";

          let query = supabase
            .from("projects")
            .select(`
              id,
              title,
              status,
              current_stage_id,
              created_at,
              academic_year,
              departments ( name, code ),
              programs ( name, code ),
              defense_stages ( id, name, sequence_order ),
              students (
                student_number,
                profiles ( first_name, last_name, email )
              ),
              documents (
                id,
                status,
                adviser_approval_status,
                updated_at
              ),
              defense_schedules (
                id,
                scheduled_at,
                room,
                building,
                is_online,
                status
              )
            `)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!isManagement) {
            if (isStudent) {
              const [{ data: studentRecord }, { data: memberRows }] = await Promise.all([
                supabase
                  .from("students")
                  .select("id")
                  .eq("profile_id", user.id)
                  .maybeSingle(),
                supabase
                  .from("project_members")
                  .select("project_id")
                  .eq("profile_id", user.id),
              ]);

              const sIds = new Set<string>();
              if (studentRecord?.id) {
                const { data: ownProjs } = await supabase
                  .from("projects")
                  .select("id")
                  .eq("student_id", studentRecord.id);
                ownProjs?.forEach((p) => sIds.add(p.id));
              }
              memberRows?.forEach((m) => sIds.add(m.project_id));
              const studentProjIds = Array.from(sIds);

              if (studentProjIds.length === 0) {
                setProjects([]);
                setLoading(false);
                setRefreshing(false);
                return;
              }
              query = query.in("id", studentProjIds);
            } else {
              const shouldQueryAdviser = roles.includes("adviser") || isAdviser;
              const shouldQueryPanelist = roles.includes("panelist") || isPanelist;

              const [{ data: memberProjects }, { data: panelProjects }] = await Promise.all([
                shouldQueryAdviser
                  ? supabase
                      .from("project_members")
                      .select("project_id")
                      .eq("profile_id", user.id)
                      .eq("member_role", "adviser")
                  : Promise.resolve({ data: [] }),
                shouldQueryPanelist
                  ? supabase
                      .from("defense_panels")
                      .select("project_id")
                      .eq("profile_id", user.id)
                  : Promise.resolve({ data: [] }),
              ]);

              const advSet = new Set<string>();
              const panSet = new Set<string>();
              const idSet = new Set<string>();

              (memberProjects || []).forEach((m: { project_id: string }) => {
                advSet.add(m.project_id);
                idSet.add(m.project_id);
              });
              (panelProjects || []).forEach((p: { project_id: string }) => {
                panSet.add(p.project_id);
                idSet.add(p.project_id);
              });

              setAdviserProjectIds(advSet);
              setPanelProjectIds(panSet);

              const allowedProjIds = Array.from(idSet);
              if (allowedProjIds.length === 0) {
                setProjects([]);
                setLoading(false);
                setRefreshing(false);
                return;
              }
              query = query.in("id", allowedProjIds);
            }
          }

          const { data: projData } = await query;

          if (projData && projData.length > 0) {
            setProjects(projData);

            // If student only has 1 active project, auto-navigate directly to that workspace
            if (isStudent && projData.length === 1) {
              const p = projData[0] as any;
              const stageObj = Array.isArray(p.defense_stages)
                ? p.defense_stages[0]
                : p.defense_stages;
              const targetStage = p.current_stage_id || stageObj?.id || defaultStageId;
              if (targetStage) {
                router.replace(`/workspace/${p.id}/${targetStage}`);
                return;
              }
            }
          } else {
            setProjects([]);
          }
        }
      } catch (err) {
        console.error("Error loading workspace index:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, roles, activeRole, authLoading, router, supabase]
  );

  useEffect(() => {
    loadWorkspaceList(false);
  }, [loadWorkspaceList]);

  useLiveRefresh(() => loadWorkspaceList(true));

  const effectiveRole = activeRole || roles[0] || "student";
  const defaultStageId = stages[0]?.id || "";

  // Unique stage names for filtering
  const uniqueStageNames = useMemo(() => {
    const names = new Set<string>();
    projects.forEach((p) => {
      const stageObj = Array.isArray(p.defense_stages) ? p.defense_stages[0] : p.defense_stages;
      if (stageObj?.name) names.add(stageObj.name);
    });
    return Array.from(names);
  }, [projects]);

  // Enrich projects with latest document & schedule info
  const enrichedProjects = useMemo(() => {
    return projects.map((proj) => {
      const studentObj = Array.isArray(proj.students) ? proj.students[0] : proj.students;
      const studentProfile =
        studentObj && Array.isArray(studentObj.profiles)
          ? studentObj.profiles[0]
          : studentObj?.profiles;
      const studentName = studentProfile
        ? `${studentProfile.first_name} ${studentProfile.last_name}`.trim()
        : "Student Author";
      const stageObj = Array.isArray(proj.defense_stages)
        ? proj.defense_stages[0]
        : proj.defense_stages;
      const stageId = proj.current_stage_id || stageObj?.id || defaultStageId;
      const stageName = stageObj?.name || "Defense Stage";

      const docs = Array.isArray(proj.documents) ? proj.documents : [];
      const latestDoc = docs[0] || null;
      const isEndorsed = latestDoc?.adviser_approval_status === "approved";
      const isRevisionsReq =
        latestDoc?.adviser_approval_status === "rejected" ||
        proj.status === "revision_required";

      const scheds = Array.isArray(proj.defense_schedules) ? proj.defense_schedules : [];
      const activeSched =
        scheds.find((s: any) => s.status !== "cancelled") || scheds[0] || null;

      const isConcluded =
        proj.status === "passed" ||
        proj.status === "completed" ||
        proj.status === "failed" ||
        activeSched?.status === "completed";

      return {
        ...proj,
        studentName,
        stageId,
        stageName,
        latestDoc,
        isEndorsed,
        isRevisionsReq,
        activeSched,
        isConcluded,
      };
    });
  }, [projects, defaultStageId]);

  // Summary metrics
  const stats = useMemo(() => {
    const total = enrichedProjects.length;
    const endorsed = enrichedProjects.filter((p) => p.isEndorsed).length;
    const inReview = enrichedProjects.filter(
      (p) => !p.isConcluded && (p.status === "submitted" || p.status === "under_review" || p.status === "in_progress" || p.isRevisionsReq)
    ).length;
    const concluded = enrichedProjects.filter((p) => p.isConcluded).length;
    return { total, endorsed, inReview, concluded };
  }, [enrichedProjects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return enrichedProjects.filter((proj) => {
      if (stageFilter !== "all" && proj.stageName !== stageFilter) {
        return false;
      }

      if (statusFilter === "active" && proj.isConcluded) return false;
      if (statusFilter === "endorsed" && !proj.isEndorsed) return false;
      if (statusFilter === "concluded" && !proj.isConcluded) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const deptName = proj.departments?.name?.toLowerCase() || "";
        const progName = proj.programs?.name?.toLowerCase() || "";
        const matches =
          proj.title?.toLowerCase().includes(q) ||
          proj.studentName.toLowerCase().includes(q) ||
          deptName.includes(q) ||
          progName.includes(q) ||
          proj.stageName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [enrichedProjects, stageFilter, statusFilter, searchQuery]);

  if (loading || authLoading) {
    return (
      <AppShell title="Review & Grading Workspace">
        <AuroraLoader fullscreen={false} message="Loading Defense Evaluation Dockets..." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Review & Grading Workspace">
      <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800 dark:text-slate-200">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] font-black uppercase text-primary border-primary/30 bg-primary/5"
              >
                Split-Screen PDF &amp; Rubric Deliberation Engine
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold capitalize">
                Role: {effectiveRole.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Defense Evaluation &amp; Review Workspace
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
              Select an assigned research manuscript to open the interactive split-screen PDF viewer, inline markup ribbon, adviser endorsement gate, and 100-point rubric grading panel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadWorkspaceList(true)}
              disabled={refreshing}
              className="h-9 px-3 rounded-xl gap-1.5 font-bold cursor-pointer"
            >
              <RotateCw className={cn("h-3.5 w-3.5 text-primary", refreshing && "animate-spin")} />
              Refresh Dockets
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3.5 gap-1.5 text-xs font-bold rounded-xl border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs"
            >
              <Link href="/workspace/demo">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Open Interactive Demo Workspace
              </Link>
            </Button>
          </div>
        </div>

        {/* Institutional 5-Stage Defense Workflow Hierarchy Banner */}
        <WorkflowHierarchyBanner />

        {/* Live Summary KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 flex flex-row items-center gap-3.5 border border-border/80 shadow-xs">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Assigned Research Dockets
              </p>
            </div>
          </Card>

          <Card className="p-4 flex flex-row items-center gap-3.5 border border-border/80 shadow-xs">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.inReview}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Active Review / Revisions
              </p>
            </div>
          </Card>

          <Card className="p-4 flex flex-row items-center gap-3.5 border border-border/80 shadow-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.endorsed}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Endorsed for Defense
              </p>
            </div>
          </Card>

          <Card className="p-4 flex flex-row items-center gap-3.5 border border-border/80 shadow-xs">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{stats.concluded}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Evaluated &amp; Concluded
              </p>
            </div>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-4 border border-border/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by manuscript title, student author, or department..."
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" /> Status:
              </span>
              {(
                [
                  { id: "all", label: `All Dockets (${stats.total})` },
                  { id: "active", label: `Active Review (${stats.total - stats.concluded})` },
                  { id: "endorsed", label: `Endorsed (${stats.endorsed})` },
                  { id: "concluded", label: `Concluded (${stats.concluded})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer",
                    statusFilter === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage filter pills */}
          {uniqueStageNames.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Stage:
              </span>
              <button
                type="button"
                onClick={() => setStageFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                  stageFilter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                All Defense Stages
              </button>
              {uniqueStageNames.map((stName) => (
                <button
                  key={stName}
                  type="button"
                  onClick={() => setStageFilter(stName)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                    stageFilter === stName
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {stName}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Project Selection Docket Cards */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} Assigned Defense Projects
              </span>
            </div>

            <div className="grid gap-3.5">
              {filteredProjects.map((proj) => {
                const isProjectAdviser = adviserProjectIds.has(proj.id);
                const isProjectPanelist = panelProjectIds.has(proj.id);

                const statusVariant =
                  proj.status === "passed" || proj.status === "completed"
                    ? "success"
                    : proj.status === "revision_required" || proj.status === "failed"
                      ? "warning"
                      : proj.status === "submitted" || proj.status === "under_review" || proj.status === "in_progress"
                        ? "info"
                        : "secondary";

                return (
                  <Card
                    key={proj.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md"
                  >
                    {/* Left status accent bar */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        proj.status === "passed" || proj.status === "completed"
                          ? "bg-emerald-500"
                          : proj.isEndorsed
                            ? "bg-blue-500"
                            : proj.isRevisionsReq
                              ? "bg-amber-500"
                              : "bg-slate-300 dark:bg-slate-700"
                      )}
                    />

                    <CardContent className="p-5 pl-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Top Badges Row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-black text-primary border-primary/30 bg-primary/5 gap-1"
                          >
                            <Layers className="h-3 w-3" />
                            {proj.stageName}
                          </Badge>

                          <Badge variant={statusVariant} className="text-[10px] font-bold capitalize">
                            {proj.status.replace(/_/g, " ")}
                          </Badge>

                          {proj.isEndorsed ? (
                            <Badge variant="success" className="text-[10px] font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Adviser Endorsed
                            </Badge>
                          ) : proj.isRevisionsReq ? (
                            <Badge variant="warning" className="text-[10px] font-bold gap-1">
                              <AlertCircle className="h-3 w-3" /> Revisions Requested
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                              <Clock className="h-3 w-3" /> Under Consultation
                            </Badge>
                          )}

                          {isProjectAdviser && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            >
                              Your Role: Research Adviser
                            </Badge>
                          )}
                          {isProjectPanelist && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                            >
                              Your Role: Defense Panelist
                            </Badge>
                          )}
                        </div>

                        {/* Project Title */}
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug group-hover:text-primary transition-colors">
                          {proj.title}
                        </h3>

                        {/* Metadata Row: Author, Department, Schedule */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              Proponent:{" "}
                              <strong className="text-foreground font-bold">{proj.studentName}</strong>
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {proj.departments?.name || proj.programs?.name || "Academic Department"}
                            </span>
                          </span>

                          {proj.activeSched?.scheduled_at && (
                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Defense:{" "}
                                {new Date(proj.activeSched.scheduled_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {proj.activeSched.room ? ` • Room ${proj.activeSched.room}` : ""}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl text-xs font-bold gap-1.5"
                        >
                          <Link href="/dashboard/grades">
                            <Award className="h-3.5 w-3.5 text-primary" />
                            Grades &amp; Verdict
                          </Link>
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          className="h-9 rounded-xl px-4 shrink-0 gap-1.5 font-bold text-xs shadow-xs"
                        >
                          <Link href={`/workspace/${proj.id}/${proj.stageId}`}>
                            Open Workspace
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="text-center p-12 bg-card border-dashed rounded-2xl">
            <CardHeader className="p-0 mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-bold">
                {projects.length > 0
                  ? "No Projects Match Your Filter"
                  : "No Active Defense Assigned"}
              </CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto mt-1">
                {projects.length > 0
                  ? "Try clearing your search query or switching the stage and status filters above."
                  : "You do not have any manuscripts currently pending defense evaluation. You can test the split-screen PDF viewer and rubric grading in the interactive demo workspace."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-center gap-2">
              {projects.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setStageFilter("all");
                  }}
                  className="rounded-xl font-bold text-xs cursor-pointer"
                >
                  Reset Filters
                </Button>
              ) : (
                <Button asChild className="rounded-xl gap-2 font-bold text-xs">
                  <Link href="/workspace/demo">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Launch Interactive Demo Workspace
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
