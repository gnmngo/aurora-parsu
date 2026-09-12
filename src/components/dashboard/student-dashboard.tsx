"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  FileText, 
  MessageSquare, 
  History, 
  Award,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Clock,
  UploadCloud,
  Plus,
  UserPlus,
  Users,
  Crown,
  MapPin,
  Video,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TimelineStepper } from "@/components/ui/timeline-stepper";
import { ConsensusDashboard } from "@/components/dashboard/consensus-dashboard";
import { PdfUploader } from "@/components/documents/pdf-uploader";

interface StudentDashboardProps {
  userId: string;
}

export function StudentDashboard({ userId }: StudentDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [adviser, setAdviser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [defensePanelists, setDefensePanelists] = useState<any[]>([]);
  const [stageRubric, setStageRubric] = useState<any>(null);
  const [rubricGuideOpen, setRubricGuideOpen] = useState(false);
  const [latestDoc, setLatestDoc] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]);
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [annotationsCount, setAnnotationsCount] = useState({ total: 0, unresolved: 0 });
  const [activeTab, setActiveTab] = useState<"submissions" | "revisions" | "evaluations">("submissions");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadStudentData = useCallback(async () => {
    try {
      // 1. Fetch student profile and associated project
      let { data: stdRecord } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!stdRecord) {
        const { data: newStd } = await supabase
          .from("students")
          .insert({ profile_id: userId })
          .select("id")
          .single();
        stdRecord = newStd;
      }

      // Check if member of any project
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("profile_id", userId)
        .limit(1);

      const memberProjId = memberRows?.[0]?.project_id;

      let projQuery = supabase
        .from("projects")
        .select("*, defense_stages ( id, name )")
        .is("archived_at", null);

      if (memberProjId) {
        projQuery = projQuery.eq("id", memberProjId);
      } else if (stdRecord?.id) {
        projQuery = projQuery.eq("student_id", stdRecord.id);
      } else {
        setLoading(false);
        return;
      }

      const { data: proj } = await projQuery.maybeSingle();

      if (proj) {
        setProject(proj);

        // Fetch workflow stages dynamically for this project
        let stagesQuery = supabase
          .from("defense_stages")
          .select("*")
          .order("sequence_order");

        if (proj.workflow_template_id) {
          stagesQuery = stagesQuery.eq("workflow_template_id", proj.workflow_template_id);
        }
        const { data: dbStages } = await stagesQuery;
        if (dbStages) {
          setStagesList(dbStages);
        }

        // 2. Fetch adviser and all team members
        const { data: membersData } = await supabase
          .from("project_members")
          .select("*, profiles:profiles!project_members_profile_id_fkey(first_name, last_name, email)")
          .eq("project_id", proj.id)
          .order("assigned_at", { ascending: true });

        if (membersData) {
          setTeamMembers(membersData);
          const advMem = membersData.find((m: any) => m.member_role === "adviser");
          setAdviser(advMem ? advMem : null);
        }

        // 3. Fetch latest schedule with defense stage join
        const { data: sched } = await supabase
          .from("defense_schedules")
          .select(`
            *,
            defense_stages ( id, name, code, sequence_order )
          `)
          .eq("project_id", proj.id)
          .order("scheduled_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sched) {
          setSchedule(sched);

          // Fetch assigned defense panelists with profile details
          const { data: panels } = await supabase
            .from("defense_panels")
            .select(`
              profile_id,
              panel_role,
              profiles:profiles!defense_panels_profile_id_fkey (
                id,
                first_name,
                last_name,
                email
              )
            `)
            .eq("project_id", proj.id)
            .eq("stage_id", sched.stage_id);

          if (panels) {
            setDefensePanelists(panels);
          }
        } else {
          setSchedule(null);
          setDefensePanelists([]);
        }

        // Fetch rubric template for this project/stage to guide the student
        const { data: projectRubric } = await supabase
          .from("rubric_templates")
          .select("*")
          .eq("project_id", proj.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (projectRubric) {
          setStageRubric(projectRubric);
        } else {
          const { data: defaultRubric } = await supabase
            .from("rubric_templates")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (defaultRubric) {
            setStageRubric(defaultRubric);
          }
        }

        // 4. Fetch latest manuscript document
        const { data: docs } = await supabase
          .from("documents")
          .select("*, adviser_approval_status, document_versions(*)")
          .eq("project_id", proj.id);

        if (docs && docs.length > 0) {
          const activeDoc =
            docs.find((d: any) => d.status === "submitted" || d.status === "under_review" || d.status === "approved") ||
            docs[0];
          setLatestDoc(activeDoc);

          // Compile submissions list
          const allVers: any[] = [];
          docs.forEach((doc: any) => {
            if (doc.document_versions) {
              doc.document_versions.forEach((ver: any) => {
                allVers.push({
                  ...ver,
                  document_title: doc.title,
                  stage_id: doc.stage_id,
                  approvalStatus: doc.adviser_approval_status
                });
              });
            }
          });
          setSubmissionsList(allVers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

          // Calculate annotations
          const versionIds = activeDoc.document_versions?.map((dv: any) => dv.id) || [];
          if (versionIds.length > 0) {
            const { data: anns } = await supabase
              .from("annotations")
              .select("*, profiles!created_by(first_name, last_name)")
              .in("document_version_id", versionIds);

            if (anns) {
              const total = anns.length;
              const unresolved = anns.filter((a: any) => a.status !== "verified" && a.status !== "resolved").length;
              setAnnotationsCount({ total, unresolved });
              setRevisionsList(anns.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            }
          }
        }

        // 5. Fetch evaluations history
        const { data: evals } = await supabase
          .from("evaluations")
          .select(`
            id,
            total_score,
            verdict_code,
            status,
            signed_at,
            panelist_id,
            profiles ( first_name, last_name ),
            defense_stages ( name )
          `)
          .eq("project_id", proj.id)
          .eq("status", "submitted");
        if (evals) setEvaluationsList(evals);
      }
    } catch (err) {
      console.error("Error loading student dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-8 text-center flex flex-col items-center">
        <AlertTriangle className="h-8 w-8 text-destructive opacity-60" />
        <h3 className="text-sm font-bold mt-3 text-foreground">Failed to Load Dashboard</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 text-xs"
          onClick={() => { setError(null); setLoading(true); }}
        >
          Try Again
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="border-dashed border-border p-12 text-center flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground">No Research Project Yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed mb-6">
          You are not currently linked to any active project. Create a new research project or join your group using a join code.
        </p>
        <Link href="/dashboard/my-project">
          <Button className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            Create or Join a Project
          </Button>
        </Link>
      </Card>
    );
  }

  // Calculate dynamic steps
  const currentStage = stagesList.find((s) => s.id === project.current_stage_id);
  const currentSeq = currentStage?.sequence_order || 1;

  const timelineSteps = stagesList.map((stage) => {
    let status: "completed" | "current" | "pending" = "pending";
    if (stage.sequence_order < currentSeq) {
      status = "completed";
    } else if (stage.sequence_order === currentSeq) {
      status = "current";
    }
    return {
      name: stage.name,
      status,
      description: stage.description || ""
    };
  });

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Welcome & Progress Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Active Research Details
              </CardTitle>
              <CardDescription className="text-[10px]">
                Current capstone registry mappings
              </CardDescription>
            </div>
            <PdfUploader
              projectId={project.id}
              stageId={project.current_stage_id || undefined}
              buttonText="Upload Manuscript (PDF)"
              className="font-bold shadow-sm"
              onUploadCompleted={loadStudentData}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Research Title</p>
              <h2 className="text-lg font-black text-slate-900 leading-snug">"{project.title}"</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Academic Stage</p>
                <Badge variant="info" className="text-[8px] font-extrabold uppercase mt-1">
                  {project.defense_stages?.name || "Concept Defense"}
                </Badge>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Assigned Adviser</p>
                  <Link href="/dashboard/my-project" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                    {adviser ? "Change" : "Choose"} &rarr;
                  </Link>
                </div>
                <p className="font-extrabold text-slate-900 mt-1 truncate">
                  {adviser?.profiles 
                    ? `${adviser.profiles.first_name} ${adviser.profiles.last_name}` 
                    : "No adviser assigned yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stepper Steppers timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Workflow Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stagesList.length === 0 ? (
              <span className="text-muted-foreground">Loading template timeline...</span>
            ) : (
              <TimelineStepper steps={timelineSteps} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. SCHEDULED DEFENSE CONFIRMED & ACTIONABLE HERO CARD */}
      {schedule && (schedule.status === "scheduled" || schedule.status === "in_progress") ? (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/10 shadow-md overflow-hidden">
          <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="success" className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5">
                Oral Defense Scheduled &amp; Confirmed
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">
                {schedule.defense_stages?.name || project.defense_stages?.name || "Defense Stage"}
              </Badge>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Duration: {schedule.duration_minutes || 60} Minutes
            </span>
          </div>

          <CardContent className="p-5 space-y-5">
            {/* Top Grid: Key Defense Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date & Time */}
              <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Calendar className="h-4 w-4" />
                  <span>Defense Date &amp; Time</span>
                </div>
                <p className="text-sm font-black text-foreground">
                  {new Date(schedule.scheduled_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs font-bold text-primary">
                  {new Date(schedule.scheduled_at).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {schedule.end_at && ` – ${new Date(schedule.end_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>

              {/* Venue / Online Link */}
              <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  {schedule.is_online ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  <span>Venue &amp; Format</span>
                </div>
                <p className="text-sm font-black text-foreground">
                  {schedule.is_online ? "Virtual Defense (Online)" : schedule.room || "Assigned Defense Room"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {schedule.is_online
                    ? "Conducted via institutional video conference"
                    : schedule.building || "Academic Hall / Building"}
                </p>
                {schedule.is_online && schedule.meeting_url && (
                  <a
                    href={schedule.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-0.5"
                  >
                    <span>Open Virtual Meeting Room</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Committee Panelists */}
              <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-primary font-bold text-xs uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Committee Panel
                  </span>
                  <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0">
                    {defensePanelists.length} Panelists
                  </Badge>
                </div>
                {defensePanelists.length > 0 ? (
                  <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                    {defensePanelists.map((p: any) => {
                      const name = p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : "Faculty Panelist";
                      const isChair = p.panel_role === "chair";
                      return (
                        <div key={p.profile_id} className="flex items-center justify-between gap-1 text-xs">
                          <span className="truncate font-semibold text-foreground flex items-center gap-1">
                            {isChair && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                            {name}
                          </span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0", isChair ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                            {isChair ? "Chairman" : "Member"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Committee panelists assigned by coordinator.</p>
                )}
              </div>
            </div>

            {/* Step-by-Step Defense Guide Checklist for Student */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <p className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                What To Do Next — Candidate Preparation Checklist
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">1. Review Defended Manuscript:</strong> Enter the Defense Workspace to verify the exact manuscript version and annotations the committee will inspect.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">2. Inspect Committee Rubric:</strong> Click "View Rubric Guide" below to check criteria weights calibrated by the Panel Chairman.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">3. Prepare Presentation Slides:</strong> Practice your presentation to comfortably fit the {schedule.duration_minutes || 60}-minute defense window.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">4. Live Deliberation:</strong> Arrive 15 minutes before start. Panelist scores and consensus verdicts will be recorded in the system.
                  </span>
                </div>
              </div>
            </div>

            {/* Clickable Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link href={`/workspace/${project.id}/${schedule.stage_id || project.current_stage_id || ""}`}>
                  <Button className="h-9 px-4 text-xs font-black gap-2 shadow-sm cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                    Open Defense Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRubricGuideOpen(true)}
                  className="h-9 px-3 text-xs font-bold gap-1.5 cursor-pointer hover:bg-muted"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  View Rubric &amp; Grading Guide
                </Button>
              </div>

              {schedule.is_online && schedule.meeting_url && (
                <a href={schedule.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="h-9 text-xs font-bold gap-1.5">
                    <Video className="h-3.5 w-3.5 text-emerald-600" />
                    Join Virtual Defense
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ) : latestDoc?.adviser_approval_status === "approved" ? (
        /* 2. ADVISER ENDORSED - AWAITING COORDINATOR SCHEDULING */
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-100">
                  Manuscript Endorsed for Defense!
                </p>
                <Badge variant="success" className="text-[9px] font-bold">
                  Cleared by Adviser
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your research adviser has cleared your manuscript. Your defense is now queued with the Defense Coordinator for panel assignment and timeslot scheduling.
              </p>
            </div>
          </div>
          <Link href="/dashboard/my-project" className="shrink-0 self-end sm:self-center">
            <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs">
              <span>View Defense Roadmap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Tabs list menu */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "submissions" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Uploaded Manuscripts
        </button>
        <button
          onClick={() => setActiveTab("revisions")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "revisions" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Revisions Notes ({annotationsCount.unresolved})
        </button>
        <button
          onClick={() => setActiveTab("evaluations")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === "evaluations" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"}`}
        >
          Panel Consensus Grades
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Tab Panels */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "submissions" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <FileText className="h-4 w-4 text-primary" /> Submission versions history
                </CardTitle>
                <PdfUploader
                  projectId={project.id}
                  stageId={project.current_stage_id || undefined}
                  buttonText="Upload PDF"
                  buttonSize="sm"
                  onUploadCompleted={loadStudentData}
                />
              </CardHeader>
              <CardContent className="p-0">
                {submissionsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center">
                    <p className="mb-3">No manuscripts uploaded yet.</p>
                    <PdfUploader
                      projectId={project.id}
                      stageId={project.current_stage_id || undefined}
                      buttonText="Upload Your First Manuscript (PDF)"
                      buttonSize="sm"
                      className="font-bold"
                      onUploadCompleted={loadStudentData}
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {submissionsList.map((sub, idx) => (
                      <div key={sub.id || idx} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{sub.file_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Uploaded {new Date(sub.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-1.5 pt-1.5">
                            <Badge 
                              variant={
                                sub.approvalStatus === "approved" 
                                  ? "success" 
                                  : sub.approvalStatus === "rejected" 
                                    ? "danger" 
                                    : "secondary"
                              }
                              className="text-[8px] font-extrabold uppercase"
                            >
                              Adviser Status: {sub.approvalStatus || "pending"}
                            </Badge>
                          </div>
                        </div>

                        <Link href={`/workspace/${project.id}/${sub.stage_id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 rounded-lg font-semibold">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            View Manuscript &amp; Feedback
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "revisions" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                  <MessageSquare className="h-4 w-4 text-primary" /> Active Revision Annotations
                </CardTitle>
                <Link href={`/workspace/${project.id}/${project.current_stage_id || ""}`}>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 font-semibold">
                    <FileText className="h-3 w-3 text-primary" />
                    Open Manuscript Viewer
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {revisionsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    All revision comments have been verified and closed!
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {revisionsList.map((rev) => (
                      <div key={rev.id} className="p-4 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {rev.profiles ? `${rev.profiles.first_name} ${rev.profiles.last_name}` : "Evaluator"}
                          </span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[8px] font-extrabold uppercase">
                              Page {rev.page_number}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] font-extrabold uppercase capitalize">
                              Status: {rev.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          "{rev.comment || rev.content}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "evaluations" && (
            <ConsensusDashboard projectId={project.id} />
          )}
        </div>

        {/* Side Panel: defense session calendar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <Calendar className="h-4 w-4 text-primary" /> Scheduled Defense Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                    <Badge variant="outline" className="text-[9px] font-extrabold uppercase text-primary border-primary/30">
                      {schedule.defense_stages?.name || project.defense_stages?.name || "Defense Stage"}
                    </Badge>
                    <Badge variant="success" className="text-[8px] font-bold">
                      {schedule.status === "scheduled" ? "Confirmed" : schedule.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Room / Venue</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {schedule.is_online ? "Virtual Room" : schedule.room || "Room TBD"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {schedule.is_online ? "Online via Meeting Link" : schedule.building || "Academic Hall"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Scheduled At</p>
                    <p className="text-sm font-black text-primary mt-0.5">
                      {new Date(schedule.scheduled_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {defensePanelists.length > 0 && (
                    <div className="pt-1.5 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Defense Committee</p>
                      <p className="text-xs text-foreground font-semibold">
                        {defensePanelists.length} Faculty Panelists
                        {defensePanelists.some((p: any) => p.panel_role === "chair") ? " (1 Chair)" : ""}
                      </p>
                    </div>
                  )}
                  <Link href={`/workspace/${project.id}/${schedule.stage_id || project.current_stage_id || ""}`}>
                    <Button size="sm" className="w-full text-xs font-bold gap-1.5 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Enter Defense Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ) : latestDoc?.adviser_approval_status === "approved" ? (
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    <Clock className="h-4 w-4" />
                    <span>In Coordinator Queue</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your manuscript is endorsed and queued with the Defense Coordinator for panel assignment and timeslot scheduling.
                  </p>
                  <Link href="/dashboard/my-project">
                    <Button variant="outline" size="sm" className="w-full text-[10px] h-7 font-bold mt-1 cursor-pointer">
                      Check Defense Roadmap &rarr;
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No defense timeslot scheduled for this stage yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Proponents & Adviser */}
          {teamMembers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800 dark:text-slate-200">
                    <Users className="h-4 w-4 text-primary" /> Research Proponents
                  </CardTitle>
                  <Badge variant="secondary" className="text-[9px] font-bold">
                    {teamMembers.filter((m: any) => m.member_role !== "adviser").length} Members
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamMembers.map((m: any) => {
                  const name = m.profiles
                    ? `${m.profiles.first_name} ${m.profiles.last_name}`
                    : "Unknown";
                  const isAdv = m.member_role === "adviser";
                  const isLeader = !isAdv && (m.member_role === "student_leader" || m.is_primary);
                  return (
                    <div key={m.profile_id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate text-xs flex items-center gap-1">
                            {name}
                            {isLeader && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                          </p>
                          {m.profiles?.email && (
                            <p className="text-[9px] text-muted-foreground truncate">{m.profiles.email}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={isAdv ? "info" : isLeader ? "warning" : "secondary"} className="text-[8px] font-bold shrink-0">
                        {isLeader ? "Lead" : isAdv ? "Adviser" : "Member"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Student Rubric Guide Dialog */}
      <Dialog open={rubricGuideOpen} onOpenChange={setRubricGuideOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              Official Defense Rubric &amp; Grading Guide
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional criteria configured for your {schedule?.defense_stages?.name || project?.defense_stages?.name || "Oral Defense"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Passing Score Threshold</p>
                <p className="text-[11px] text-muted-foreground">Minimum score required to receive a Passing verdict</p>
              </div>
              <Badge className="text-xs font-black px-2.5 py-1 bg-primary text-primary-foreground">
                {stageRubric?.passing_score ?? 75} / 100
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {stageRubric?.criteria && stageRubric.criteria.length > 0 ? (
                stageRubric.criteria.map((c: any, i: number) => (
                  <div key={c.id || i} className="p-3 rounded-xl border border-border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{c.name}</span>
                      <Badge variant="outline" className="text-[10px] font-bold text-primary shrink-0">
                        {c.weight}% Weight
                      </Badge>
                    </div>
                    {c.description ? (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.description}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Grading focus set by Defense Panel Chairman.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Standard institutional rubric applies.</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                How Grading Works
              </p>
              <p>
                Each appointed panelist evaluates your presentation and manuscript independently using these criteria weights. The Defense Panel Chairman calibrates these criteria, and the composite average of all panelists will form your final stage defense grade.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setRubricGuideOpen(false)} className="text-xs font-bold cursor-pointer">
              Close Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
