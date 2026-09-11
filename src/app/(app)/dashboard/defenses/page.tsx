"use client";

import { useEffect, useState, useCallback } from "react";
import { DefensePipeline } from "@/components/dashboard/defense-pipeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { RescheduleDefenseModal } from "@/components/dashboard/reschedule-defense-modal";
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
  ExternalLink,
  Plus,
  Layers,
  ArrowRight,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { toast } from "sonner";
import { updateDefenseScheduleAction, cancelDefenseScheduleAction } from "@/lib/scheduler/actions";

export default function DefensesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stages" | "scheduled" | "calendar">("scheduled");

  // Scheduled defenses list state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedForReschedule, setSelectedForReschedule] = useState<any>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [settingToNowId, setSettingToNowId] = useState<string | null>(null);

  const { roles } = useAuth();
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
          setSelectedTemplateId((prev) => prev || data[0].id);
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

      if (selectedTemplateId) {
        query = query.eq("workflow_template_id", selectedTemplateId);
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
  }, [supabase, selectedTemplateId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // Fetch all scheduled defenses
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const { data, error } = await supabase
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
            student_id,
            students (
              profile_id,
              profiles ( first_name, last_name, email )
            )
          ),
          defense_stages ( id, name, code )
        `)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error("Error loading defense schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Quick "⚡ Set to Right Now (Live Demo / In the Moment)" action
  const handleQuickSetToNow = async (sched: any) => {
    const now = new Date();
    const demoTime = new Date(now.getTime() + 2 * 60 * 1000);
    const scheduledAt = demoTime.toISOString();

    setSettingToNowId(sched.id);
    try {
      // Fetch current panelists to preserve them
      const { data: panels } = await supabase
        .from("defense_panels")
        .select("profile_id")
        .eq("project_id", sched.project_id)
        .eq("stage_id", sched.stage_id);

      const panelistIds = panels?.map((p: any) => p.profile_id) || [];

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

  return (
    <RoleGuard allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "college_dean"]} fallback={<AccessDenied />}>
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
            {/* Workflow template selector */}
            <div className="flex items-center gap-1.5 mr-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                {templates.map((t) => {
                  const progCode = (t.programs as any)?.code;
                  const progName = (t.programs as any)?.name;
                  const label = progCode
                    ? `${progCode} — ${progName || t.name}`
                    : t.name;
                  return (
                    <option key={t.id} value={t.id}>{label}</option>
                  );
                })}
              </select>
            </div>

            {isCoordinator && (
              <Link href="/dashboard/defenses/schedule">
                <Button className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" />
                  Schedule Defense
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Switcher (3-Way: Scheduled Defenses | Defense Stages | Calendar) */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
          <button
            onClick={() => setActiveTab("scheduled")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "scheduled" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Scheduled Defenses ({schedules.filter((s) => s.status !== "cancelled").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("stages")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "stages" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Defense Stages</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "calendar" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendar View</span>
          </button>
        </div>

        {/* ── TAB 1: SCHEDULED DEFENSES MANAGEMENT TABLE & RESCHEDULE ─────── */}
        {activeTab === "scheduled" && (
          <div className="space-y-4">
            {loadingSchedules ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : schedules.length === 0 ? (
              <Card className="border-dashed border-border p-12 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No Defenses Scheduled Yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed mb-4">
                  There are no scheduled defense sessions for this department. Use the Defense Scheduler to assign committee panels and timeslots.
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
              <div className="grid gap-3">
                {schedules.map((sched) => {
                  const sDate = new Date(sched.scheduled_at);
                  const isToday = !isNaN(sDate.getTime()) && new Date().toDateString() === sDate.toDateString();
                  const isUpcoming = sDate.getTime() > Date.now();
                  const isCancelled = sched.status === "cancelled";
                  const studentProfile = sched.projects?.students?.profiles;
                  const studentName = studentProfile
                    ? `${studentProfile.first_name} ${studentProfile.last_name}`
                    : "Student Proponent";

                  return (
                    <Card
                      key={sched.id}
                      className={cn(
                        "border rounded-xl transition-all shadow-2xs hover:shadow-xs",
                        isCancelled
                          ? "opacity-60 bg-muted/20 border-border"
                          : isToday
                          ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/10"
                          : "border-border bg-card"
                      )}
                    >
                      <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Project & Defense Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="info" className="text-[9px] font-black uppercase">
                              {sched.defense_stages?.name || "Defense Stage"}
                            </Badge>
                            <Badge
                              variant={
                                isCancelled
                                  ? "danger"
                                  : sched.status === "completed"
                                  ? "success"
                                  : isToday
                                  ? "warning"
                                  : "outline"
                              }
                              className="text-[9px] font-bold uppercase"
                            >
                              {isCancelled ? "Cancelled" : isToday ? "Happening Today" : sched.status}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {sched.duration_minutes || 60} mins duration
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-foreground truncate">
                            &ldquo;{sched.projects?.title || "Research Manuscript"}&rdquo;
                          </h3>

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

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                          {/* ⚡ Set to Right Now (Demo shortcut) */}
                          {isCoordinator && !isCancelled && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={settingToNowId === sched.id}
                              onClick={() => handleQuickSetToNow(sched)}
                              className="h-8 text-xs font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                              title="Instantly shift schedule to right now for live demonstration / immediate defense hearing"
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-600" />
                              <span>{settingToNowId === sched.id ? "Setting..." : "Set to Now"}</span>
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
            <DefensePipeline templateId={selectedTemplateId} />

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
                      <Badge variant={stage.status === "completed" ? "success" : "info"} className="text-[9px] font-extrabold uppercase">
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
          <CalendarView userRole={roles[0] || "student"} />
        )}

        {/* Reschedule Defense Modal */}
        <RescheduleDefenseModal
          open={rescheduleModalOpen}
          onOpenChange={setRescheduleModalOpen}
          schedule={selectedForReschedule}
          onRescheduled={fetchSchedules}
        />
      </div>
    </RoleGuard>
  );
}
