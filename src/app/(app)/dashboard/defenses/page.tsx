"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DefensePipeline } from "@/components/dashboard/defense-pipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { RescheduleDefenseModal } from "@/components/dashboard/reschedule-defense-modal";
import { ReviseStageModal } from "@/components/dashboard/revise-stage-modal";
import { CertificateDialog } from "@/components/workspace/certificate-dialog";
import { downloadCertificatePdf } from "@/lib/certificates/pdf-generator";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  ArrowRight,
  Award,
  CheckCheck,
  Download,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { toast } from "sonner";
import {
  updateDefenseScheduleAction,
  cancelDefenseScheduleAction,
  completeDefenseScheduleAction,
} from "@/lib/scheduler/actions";

// Helper to determine the actual defense operational status and time state
function getDefenseStatus(sched: any) {
  if (sched.status === "cancelled") {
    return {
      label: "Cancelled",
      badgeVariant: "danger" as const,
      isConcluded: true,
      color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40",
    };
  }

  const sDate = new Date(sched.scheduled_at);
  const now = new Date();
  const durationMs = (sched.duration_minutes || 60) * 60 * 1000;
  const endDate = sched.end_at ? new Date(sched.end_at) : new Date(sDate.getTime() + durationMs);
  const isPast = endDate.getTime() < now.getTime();
  const isLive = now.getTime() >= sDate.getTime() && now.getTime() <= endDate.getTime();
  const isToday = !isNaN(sDate.getTime()) && now.toDateString() === sDate.toDateString();

  const submittedEvals = sched.evaluations?.filter((e: any) => e.status === "submitted") || [];
  const hasSubmittedEvals = submittedEvals.length > 0;
  const totalPanels = sched.panels?.length || 0;
  const allPanelsSubmitted = totalPanels > 0 && submittedEvals.length >= totalPanels;

  if (sched.status === "completed" || allPanelsSubmitted) {
    return {
      label: "Concluded & Evaluated",
      badgeVariant: "success" as const,
      isConcluded: true,
      color: "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    };
  }

  if (hasSubmittedEvals) {
    return {
      label: isPast ? "Concluded • Evaluated" : "Evaluated",
      badgeVariant: "success" as const,
      isConcluded: isPast,
      color: "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    };
  }

  if (isPast) {
    return {
      label: "Concluded (Evaluation Pending)",
      badgeVariant: "warning" as const,
      isConcluded: true,
      color: "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    };
  }

  if (isLive) {
    return {
      label: "In Session (Live)",
      badgeVariant: "warning" as const,
      isLive: true,
      color: "text-blue-700 bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    };
  }

  if (isToday) {
    return {
      label: "Happening Today",
      badgeVariant: "warning" as const,
      isLive: false,
      color: "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    };
  }

  return {
    label: "Upcoming",
    badgeVariant: "outline" as const,
    isConcluded: false,
    color: "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  };
}

export default function DefensesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stages" | "scheduled" | "calendar">("scheduled");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "concluded" | "cancelled">("all");

  // Scheduled defenses list state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedForReschedule, setSelectedForReschedule] = useState<any>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedForReviseStage, setSelectedForReviseStage] = useState<any>(null);
  const [reviseStageModalOpen, setReviseStageModalOpen] = useState(false);
  const [settingToNowId, setSettingToNowId] = useState<string | null>(null);
  const [concludingScheduleId, setConcludingScheduleId] = useState<string | null>(null);

  // Certificate Modal State
  const [certificateData, setCertificateData] = useState<any>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);

  const { user, profile, roles } = useAuth();
  const supabase = createClient();
  const isCoordinator = roles.includes("coordinator") || roles.includes("sys_admin");

  // Fetch workflow templates list
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data } = await supabase
          .from("workflow_templates")
          .select("id, name, program_id, programs(code, name, departments(name, code))")
          .order("name");
        if (data && data.length > 0) {
          setTemplates(data);
        }
      } catch (err) {
        console.error("Error loading workflow templates:", err);
      }
    }
    fetchTemplates();
  }, [supabase]);

  // Fetch stages dynamically based on template filter
  const fetchStages = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("defense_stages")
        .select("*")
        .order("sequence_order");

      const activeTemplateId =
        selectedTemplateId && selectedTemplateId !== "all"
          ? selectedTemplateId
          : templates[0]?.id;

      if (activeTemplateId) {
        query = query.eq("workflow_template_id", activeTemplateId);
      }

      const { data: dbStages } = await query;
      if (!dbStages) return;

      const { data: docs } = await supabase
        .from("documents")
        .select("stage_id")
        .in("stage_id", dbStages.map((s) => s.id));

      const { data: evals } = await supabase
        .from("evaluations")
        .select("stage_id, status")
        .in("stage_id", dbStages.map((s) => s.id));

      const stagesData = dbStages.map((stage) => {
        const stageDocs = docs?.filter((d) => d.stage_id === stage.id) || [];
        const stageEvals = evals?.filter((e) => e.stage_id === stage.id && e.status === "submitted") || [];

        return {
          id: stage.id,
          code: stage.code,
          name: stage.name,
          sequence: stage.sequence_order,
          status: stageDocs.length > 0 ? "completed" : "current",
          completionPct: stageDocs.length > 0 ? 100 : 0,
          submissionCount: stageDocs.length,
          reviewCount: stageEvals.length,
        };
      });

      setStages(stagesData);
    } catch (err) {
      console.error("Error loading stages for defenses page:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedTemplateId, templates]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // Fetch all scheduled defenses with their evaluations and panels
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const { data: schedData, error } = await supabase
        .from("defense_schedules")
        .select(`
          id,
          project_id,
          stage_id,
          scheduled_at,
          end_at,
          duration_minutes,
          room,
          building,
          is_online,
          meeting_url,
          status,
          projects (
            id,
            title,
            status,
            program_id,
            student_id,
            students (
              profile_id,
              program_id,
              profiles ( first_name, last_name, email )
            )
          ),
          defense_stages (
            id,
            name,
            code,
            workflow_template_id
          )
        `)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;

      // Fetch evaluations for these defenses
      const { data: evalsData } = await supabase
        .from("evaluations")
        .select(`
          id,
          project_id,
          stage_id,
          panelist_id,
          total_score,
          verdict_code,
          status,
          certificate_serial,
          signature_hash,
          signature_image,
          submitted_at,
          profiles:panelist_id ( first_name, last_name, email )
        `);

      // Fetch panel members assigned to these defenses
      const { data: panelsData } = await supabase
        .from("defense_panels")
        .select(`
          id,
          project_id,
          stage_id,
          profile_id,
          role,
          profiles ( first_name, last_name, email )
        `);

      const enriched = (schedData || []).map((s: any) => {
        const matchingEvals = (evalsData || []).filter(
          (e: any) => e.project_id === s.project_id && e.stage_id === s.stage_id
        );
        const matchingPanels = (panelsData || []).filter(
          (p: any) => p.project_id === s.project_id && p.stage_id === s.stage_id
        );

        return {
          ...s,
          evaluations: matchingEvals,
          panels: matchingPanels,
        };
      });

      setSchedules(enriched);
    } catch (err) {
      console.error("Error loading defense schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Filter schedules by selected program/template
  const programSchedules = useMemo(() => {
    if (!selectedTemplateId || selectedTemplateId === "all") return schedules;
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    const targetProgramId = selectedTemplate?.program_id;

    return schedules.filter((sched) => {
      const stageTemplateId = sched.defense_stages?.workflow_template_id;
      const projectProgramId = sched.projects?.program_id;
      const studentProgramId = sched.projects?.students?.program_id;

      return (
        stageTemplateId === selectedTemplateId ||
        (targetProgramId && (projectProgramId === targetProgramId || studentProgramId === targetProgramId))
      );
    });
  }, [schedules, selectedTemplateId, templates]);

  // Sub-filter by operational status tab
  const filteredSchedules = useMemo(() => {
    if (statusFilter === "upcoming") {
      return programSchedules.filter((s) => {
        const st = getDefenseStatus(s);
        return !st.isConcluded && s.status !== "cancelled";
      });
    }
    if (statusFilter === "concluded") {
      return programSchedules.filter((s) => {
        const st = getDefenseStatus(s);
        return st.isConcluded && s.status !== "cancelled";
      });
    }
    if (statusFilter === "cancelled") {
      return programSchedules.filter((s) => s.status === "cancelled");
    }
    return programSchedules;
  }, [programSchedules, statusFilter]);

  // Counts for status tabs
  const upcomingCount = programSchedules.filter((s) => {
    const st = getDefenseStatus(s);
    return !st.isConcluded && s.status !== "cancelled";
  }).length;

  const concludedCount = programSchedules.filter((s) => {
    const st = getDefenseStatus(s);
    return st.isConcluded && s.status !== "cancelled";
  }).length;

  const cancelledCount = programSchedules.filter((s) => s.status === "cancelled").length;

  // Quick "⚡ Set to Right Now (Live Demo / In the Moment)" action
  const handleQuickSetToNow = async (sched: any) => {
    const now = new Date();
    const demoTime = new Date(now.getTime() + 2 * 60 * 1000);
    const scheduledAt = demoTime.toISOString();

    setSettingToNowId(sched.id);
    try {
      const panelistIds = sched.panels?.map((p: any) => p.profile_id) || [];

      await updateDefenseScheduleAction({
        scheduleId: sched.id,
        projectId: sched.project_id,
        stageId: sched.stage_id,
        scheduledAt,
        durationMinutes: sched.duration_minutes || 60,
        room: sched.room,
        building: sched.building,
        isOnline: sched.is_online,
        meetingUrl: sched.meeting_url,
        panelistIds,
      });

      toast.success(`Defense for "${sched.projects?.title}" set to right now for live demonstration!`);
      await fetchSchedules();
    } catch (err: any) {
      console.error("Quick set to now error:", err);
      toast.error(err?.message || "Failed to reschedule defense.");
    } finally {
      setSettingToNowId(null);
    }
  };

  // Mark Defense as Officially Concluded & Completed
  const handleMarkConcluded = async (sched: any) => {
    setConcludingScheduleId(sched.id);
    try {
      await completeDefenseScheduleAction(
        sched.id,
        sched.project_id,
        sched.stage_id,
        "Marked completed from Defenses Management"
      );
      toast.success(`Defense schedule for "${sched.projects?.title}" officially marked as Concluded & Completed.`);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark defense as completed.");
    } finally {
      setConcludingScheduleId(null);
    }
  };

  const handleCancelDefense = async (sched: any) => {
    if (!confirm(`Cancel defense for "${sched.projects?.title}"? This cannot be undone.`)) return;
    try {
      await cancelDefenseScheduleAction(
        sched.id,
        sched.project_id,
        sched.stage_id,
        "Cancelled by coordinator"
      );
      toast.success("Defense schedule cancelled.");
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel defense.");
    }
  };

  const handleOpenCertificate = (evalRecord: any, sched: any) => {
    const prof = evalRecord.profiles;
    const panelistName = prof
      ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim()
      : `${profile?.first_name || "Pablo"} ${profile?.last_name || "Job"}`.trim();

    setCertificateData({
      evaluation: evalRecord,
      projectTitle: sched.projects?.title || "Research Manuscript",
      stageName: sched.defense_stages?.name || "Oral Defense",
      panelistName,
    });
    setCertificateModalOpen(true);
  };

  return (
    <RoleGuard
      allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "college_dean"]}
      fallback={<AccessDenied />}
    >
      <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Defenses Management</h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Manage oral defense schedules, live deliberation panels, and workflow progression.
            </p>
          </div>

          <div className="flex gap-2 items-center print:hidden">
            {/* Academic Program & Workflow Selector */}
            <div className="flex items-center gap-1.5 mr-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs"
                title="Filter defense schedules and workflows by Academic Program"
              >
                <option value="all">All Academic Programs &amp; Workflows</option>
                {templates.map((t) => {
                  const progCode = (t.programs as any)?.code;
                  const progName = (t.programs as any)?.name;
                  const label = progCode
                    ? `${progCode} — ${progName || t.name}`
                    : t.name;
                  return (
                    <option key={t.id} value={t.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {isCoordinator && (
              <div className="flex items-center gap-2">
                <Link href="/admin/stages">
                  <Button variant="outline" className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-xs border-border">
                    <Layers className="h-4 w-4 text-primary" />
                    Manage Stages
                  </Button>
                </Link>
                <Link href="/dashboard/defenses/schedule">
                  <Button className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-xs">
                    <Plus className="h-4 w-4" />
                    Schedule Defense
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher (3-Way: Scheduled Defenses | Defense Stages | Calendar) */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
          <button
            onClick={() => setActiveTab("scheduled")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "scheduled"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Oral Defenses ({programSchedules.filter((s) => s.status !== "cancelled").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("stages")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "stages"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Defense Stages</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "calendar"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendar View</span>
          </button>
        </div>

        {/* ── TAB 1: DEFENSES MANAGEMENT & EVALUATION UPDATES ─────────────── */}
        {activeTab === "scheduled" && (
          <div className="space-y-4">
            {/* Quick Status Sub-Filters */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Filter Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All Defenses ({programSchedules.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("upcoming")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                  statusFilter === "upcoming"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Upcoming &amp; Live ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("concluded")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                  statusFilter === "concluded"
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Concluded &amp; Evaluated ({concludedCount})
              </button>
              {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("cancelled")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                    statusFilter === "cancelled"
                      ? "bg-rose-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cancelled ({cancelledCount})
                </button>
              )}
            </div>

            {loadingSchedules ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredSchedules.length === 0 ? (
              <Card className="border-dashed border-border p-12 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No Defenses Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed mb-4">
                  There are no defenses matching the selected program and status filter.
                </p>
                {isCoordinator && (
                  <Link href="/dashboard/defenses/schedule">
                    <Button size="sm" className="gap-1.5 font-bold">
                      <Plus className="h-4 w-4" />
                      Schedule a Defense
                    </Button>
                  </Link>
                )}
              </Card>
            ) : (
              <div className="grid gap-3.5">
                {filteredSchedules.map((sched) => {
                  const sDate = new Date(sched.scheduled_at);
                  const statusInfo = getDefenseStatus(sched);
                  const isCancelled = sched.status === "cancelled";
                  const studentProfile = sched.projects?.students?.profiles;
                  const studentName = studentProfile
                    ? `${studentProfile.first_name} ${studentProfile.last_name}`
                    : "Student Proponent";

                  // Check if current user is an evaluator or has an evaluation for this defense
                  const currentUserId = user?.id || profile?.id;
                  const myEval = sched.evaluations?.find(
                    (e: any) => e.panelist_id === currentUserId
                  );
                  const isAssignedPanelist = sched.panels?.some(
                    (p: any) => p.profile_id === currentUserId
                  );

                  return (
                    <Card
                      key={sched.id}
                      className={cn(
                        "border rounded-xl transition-all shadow-2xs hover:shadow-xs",
                        isCancelled
                          ? "opacity-60 bg-muted/20 border-border"
                          : statusInfo.isLive
                          ? "border-blue-500/60 bg-blue-500/5 dark:bg-blue-950/15 ring-1 ring-blue-500/30"
                          : statusInfo.isConcluded
                          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                          : "border-border bg-card"
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Top Row: Badges, Duration, Project Title & Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Badges Bar */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="info" className="text-[9px] font-black uppercase">
                                {sched.defense_stages?.name || "Defense Stage"}
                              </Badge>

                              {/* Real-time Defense Status Badge */}
                              <Badge
                                variant={statusInfo.badgeVariant}
                                className={cn("text-[9px] font-bold uppercase", statusInfo.color)}
                              >
                                {statusInfo.label}
                              </Badge>

                              {/* Project Workflow Status Badge */}
                              {sched.projects?.status === "revision_required" && (
                                <Badge
                                  variant="warning"
                                  className="text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                >
                                  Project: Revisions Required
                                </Badge>
                              )}
                              {(sched.projects?.status === "passed" || sched.projects?.status === "completed") && (
                                <Badge
                                  variant="success"
                                  className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                  Project: Stage Cleared
                                </Badge>
                              )}
                              {sched.projects?.status === "under_review" && (
                                <Badge variant="info" className="text-[9px] font-bold uppercase">
                                  Project: In Review
                                </Badge>
                              )}

                              <span className="text-[10px] font-bold text-muted-foreground">
                                {sched.duration_minutes || 60} mins duration
                              </span>
                            </div>

                            {/* Project Title */}
                            <h3 className="text-sm font-bold text-foreground truncate pt-0.5">
                              &ldquo;{sched.projects?.title || "Research Manuscript"}&rdquo;
                            </h3>

                            {/* Defense Metadata: Proponent, Date, Venue */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <User className="h-3.5 w-3.5 text-primary" /> {studentName}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                                <Calendar className="h-3.5 w-3.5" />
                                {isNaN(sDate.getTime())
                                  ? "Date TBA"
                                  : sDate.toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                {sched.is_online ? (
                                  <>
                                    <Video className="h-3.5 w-3.5 text-primary" />
                                    <span className="truncate max-w-[180px]">
                                      {sched.meeting_url || "Online Video Conference"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span>
                                      {sched.room || "Room TBA"} ({sched.building || "Campus"})
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Top Right Actions Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                            {/* ⚡ Set to Right Now (Demo shortcut for Coordinators) */}
                            {isCoordinator && !isCancelled && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={settingToNowId === sched.id}
                                onClick={() => handleQuickSetToNow(sched)}
                                className="h-8 text-xs font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                title="Instantly shift schedule to right now for live demonstration"
                              >
                                <Zap className="h-3.5 w-3.5 text-amber-600" />
                                <span>{settingToNowId === sched.id ? "Setting..." : "Set to Now"}</span>
                              </Button>
                            )}

                            {/* Mark Concluded & Completed button for Coordinators */}
                            {isCoordinator && !isCancelled && sched.status !== "completed" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={concludingScheduleId === sched.id}
                                onClick={() => handleMarkConcluded(sched)}
                                className="h-8 text-xs font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                title="Officially mark this defense as concluded and completed"
                              >
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{concludingScheduleId === sched.id ? "Finalizing..." : "Mark Concluded"}</span>
                              </Button>
                            )}

                            {/* Reschedule button */}
                            {isCoordinator && !isCancelled && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedForReschedule(sched);
                                  setRescheduleModalOpen(true);
                                }}
                                className="h-8 text-xs font-bold gap-1 cursor-pointer"
                              >
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>Reschedule</span>
                              </Button>
                            )}

                            {/* Revise Stage button for Coordinators */}
                            {isCoordinator && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedForReviseStage(
                                    sched.projects
                                      ? {
                                          id: sched.projects.id,
                                          title: sched.projects.title,
                                          current_stage_id: sched.stage_id,
                                          status: sched.status,
                                        }
                                      : null
                                  );
                                  setReviseStageModalOpen(true);
                                }}
                                className="h-8 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                                title="Flexibly change or revise the defense stage for this project"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                <span>Revise Stage</span>
                              </Button>
                            )}

                            {/* Deliberation Workspace link */}
                            <Link href={`/workspace/${sched.project_id}/${sched.stage_id}`}>
                              <Button size="sm" className="h-8 text-xs font-bold gap-1 shadow-2xs">
                                <span>Workspace</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            {/* Cancel defense button */}
                            {isCoordinator && !isCancelled && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelDefense(sched)}
                                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer px-2"
                                title="Cancel this defense schedule"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Live Evaluation Updates & Current User Evaluation Callout */}
                        {/* 1. If current user (e.g. Pablo Job) submitted an evaluation */}
                        {myEval && myEval.status === "submitted" && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[11px] text-emerald-900 dark:text-emerald-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>
                                <strong>Your Evaluation Submitted:</strong> Score{" "}
                                <strong className="text-emerald-700 dark:text-emerald-300">
                                  {myEval.total_score} / 100
                                </strong>{" "}
                                • Verdict:{" "}
                                <strong className="capitalize">
                                  {myEval.verdict_code === "passed"
                                    ? "Passed"
                                    : myEval.verdict_code === "passed_minor"
                                    ? "Passed with Minor Revisions"
                                    : myEval.verdict_code}
                                </strong>
                              </span>
                              {myEval.certificate_serial && (
                                <span className="text-[10px] font-mono text-muted-foreground ml-1">
                                  (Serial: {myEval.certificate_serial})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCertificate(myEval, sched)}
                                className="h-7 text-[10px] font-bold gap-1 border-emerald-400 text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950"
                              >
                                <Award className="h-3 w-3" />
                                View Certificate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  downloadCertificatePdf({
                                    evaluationId: myEval.id,
                                    certificateSerial: myEval.certificate_serial || "AURORA-CERT",
                                    projectTitle: sched.projects?.title || "Research Manuscript",
                                    stageName: sched.defense_stages?.name || "Oral Defense",
                                    panelistName: `${profile?.first_name || "Pablo"} ${profile?.last_name || "Job"}`.trim(),
                                    panelistRole: "Committee Panelist",
                                    verdictCode: myEval.verdict_code,
                                    totalScore: myEval.total_score || 0,
                                    signatureHash: myEval.signature_hash,
                                    signatureImage: myEval.signature_image,
                                    academicYear: "AY 2026-2027",
                                    signedAt: myEval.submitted_at || new Date().toISOString(),
                                  });
                                }}
                                className="h-7 text-[10px] font-bold gap-1 border-emerald-400 text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* 2. If current user has a draft evaluation */}
                        {myEval && myEval.status === "draft" && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Your Evaluation Draft Saved:</strong> Current Score:{" "}
                                <strong>{myEval.total_score}</strong> — Final digital signature &amp; submission pending.
                              </span>
                            </div>
                            <Link href={`/workspace/${sched.project_id}/${sched.stage_id}`} className="ml-auto">
                              <Button size="sm" className="h-7 text-[10px] font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white">
                                Complete Evaluation
                              </Button>
                            </Link>
                          </div>
                        )}

                        {/* 3. If current user is assigned panelist and hasn't evaluated yet */}
                        {isAssignedPanelist && !myEval && !isCancelled && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 text-[11px] text-indigo-900 dark:text-indigo-200">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                              <span>
                                <strong>Action Required:</strong> You are an appointed panelist for this defense. Ready to submit your evaluation?
                              </span>
                            </div>
                            <Link href={`/workspace/${sched.project_id}/${sched.stage_id}`} className="ml-auto">
                              <Button size="sm" className="h-7 text-[10px] font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                                Evaluate Now
                              </Button>
                            </Link>
                          </div>
                        )}

                        {/* Bottom Row: Committee Deliberation Status */}
                        {sched.evaluations && sched.evaluations.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px] border-t border-border/40">
                            <span className="font-bold text-muted-foreground uppercase text-[9px]">
                              Deliberation Panel ({sched.evaluations.length} evaluation{sched.evaluations.length > 1 ? "s" : ""}):
                            </span>
                            {sched.evaluations.map((ev: any) => {
                              const pName = ev.profiles
                                ? `${ev.profiles.first_name} ${ev.profiles.last_name}`
                                : "Panelist";
                              const isSub = ev.status === "submitted";
                              return (
                                <Badge
                                  key={ev.id}
                                  variant={isSub ? "success" : "outline"}
                                  className={cn(
                                    "text-[9px] font-semibold gap-1",
                                    isSub
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  <span>{pName}:</span>
                                  <strong>{ev.total_score || "—"} pts</strong>
                                  <span className="opacity-75 uppercase text-[8px]">
                                    ({isSub ? ev.verdict_code || "Submitted" : "Draft"})
                                  </span>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DEFENSE STAGES ───────────────────────────────────────── */}
        {activeTab === "stages" && (
          <>
            <DefensePipeline
              templateId={selectedTemplateId && selectedTemplateId !== "all" ? selectedTemplateId : templates[0]?.id}
            />

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : stages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                No stages configured for this academic workflow template.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stages.map((stage) => (
                  <Card key={stage.id} className="border border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                        {stage.name}
                      </CardTitle>
                      <Badge
                        variant={stage.status === "completed" ? "success" : "info"}
                        className="text-[9px] font-extrabold uppercase"
                      >
                        {stage.status}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-600">
                        <div>
                          <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Progress</dt>
                          <dd className="text-sm font-black text-slate-800">{stage.completionPct}%</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Uploads</dt>
                          <dd className="text-sm font-black text-slate-800">{stage.submissionCount}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Reviews</dt>
                          <dd className="text-sm font-black text-slate-800">{stage.reviewCount}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB 3: CALENDAR VIEW ────────────────────────────────────────── */}
        {activeTab === "calendar" && (
          <CalendarView userRole={roles[0] || "student"} externalSchedules={programSchedules} />
        )}

        {/* Reschedule Defense Modal */}
        <RescheduleDefenseModal
          open={rescheduleModalOpen}
          onOpenChange={setRescheduleModalOpen}
          schedule={selectedForReschedule}
          onRescheduled={fetchSchedules}
        />

        {/* Revise Stage Modal */}
        <ReviseStageModal
          open={reviseStageModalOpen}
          onOpenChange={setReviseStageModalOpen}
          project={selectedForReviseStage}
          onSuccess={() => {
            fetchSchedules();
            fetchStages();
          }}
        />

        {/* Certificate Dialog */}
        {certificateData && (
          <CertificateDialog
            open={certificateModalOpen}
            onOpenChange={setCertificateModalOpen}
            evaluation={certificateData.evaluation}
            projectTitle={certificateData.projectTitle}
            stageName={certificateData.stageName}
            panelistName={certificateData.panelistName}
          />
        )}
      </div>
    </RoleGuard>
  );
}
