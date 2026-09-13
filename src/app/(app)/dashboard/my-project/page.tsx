"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PdfUploader } from "@/components/documents/pdf-uploader";
import { format } from "date-fns";
import {
  BookOpen, Calendar, FileText, MessageSquare, Award, CheckCircle2,
  Clock, Upload, User, Building2, GraduationCap, AlertCircle, AlertTriangle,
  CheckCheck, ExternalLink, Copy, Check, Users, Crown, Loader2, Pencil,
  ShieldCheck, Sparkles, Printer, Presentation, ArrowRight, CheckSquare, FileCheck,
  Download, Layers, Video
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateProjectModal } from "@/components/workspace/create-project-modal";
import { JoinProjectModal } from "@/components/workspace/join-project-modal";
import { assignProjectAdviserAction, getApprovedFacultyListAction, updateProjectTeamNameAction } from "@/lib/projects/actions";
import { CertificateDialog } from "@/components/workspace/certificate-dialog";
import { downloadCertificatePdf } from "@/lib/certificates/pdf-generator";

interface ProjectData {
  id: string;
  title: string;
  team_name?: string | null;
  status: string;
  academic_year: string;
  created_at: string;
  current_stage_id: string | null;
  defense_stages: { id: string; name: string; sequence_order: number } | null;
  workflow_template_id: string | null;
  departments: { id: string; name: string } | null;
  students: { id: string; profiles: { first_name: string; last_name: string } | null } | null;
  // join_code is nullable — only returned if the auth user is the project owner
  join_code: string | null;
}

interface StageData {
  id: string;
  name: string;
  code: string;
  sequence_order: number;
  description: string | null;
  is_enabled: boolean;
}

interface DocumentVersion {
  id: string;
  version_number: number;
  file_name: string;
  file_size: number;
  created_at: string;
  is_current: boolean;
  checksum_sha256: string | null;
}

interface DocumentData {
  id: string;
  stage_id: string;
  title?: string;
  status?: string;
  adviser_approval_status?: string | null;
  approval_remarks?: string | null;
  document_versions: DocumentVersion[];
}

interface AdviserMember {
  profile_id: string;
  member_role: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
}

interface Schedule {
  id: string;
  scheduled_at: string;
  end_at: string;
  room: string | null;
  building: string | null;
  is_online: boolean;
  meeting_url: string | null;
  status: string;
  defense_stages: { name: string } | null;
}

interface Annotation {
  id: string;
  content: string;
  type: string;
  severity: string;
  status: string;
  page_number: number;
  created_at: string;
  profiles: { first_name: string; last_name: string } | null;
}

interface EvaluationResult {
  id: string;
  total_score: number;
  weighted_score?: number;
  verdict_code?: string;
  status: string;
  submitted_at: string;
  recommendations: string | null;
  certificate_serial?: string;
  signature_hash?: string;
  signature_image?: string | null;
  scores?: Record<string, number>;
  profiles: { first_name: string; last_name: string } | null;
  defense_stages: { name: string } | null;
}

interface ProjectMemberDisplay {
  profile_id: string;
  member_role: string;
  is_primary: boolean;
  profiles: { first_name: string; last_name: string; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  revision_required: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function MyProjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [stages, setStages] = useState<StageData[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [allMembers, setAllMembers] = useState<ProjectMemberDisplay[]>([]);
  const [adviser, setAdviser] = useState<AdviserMember | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "feedback" | "schedule" | "evaluations">("overview");

  // Feedback filter state — defaults to "open" so addressed comments are not openly displayed
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<"open" | "addressed" | "all">("open");
  const [feedbackSeverityFilter, setFeedbackSeverityFilter] = useState<string>("all");

  // Schedule filter state
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "upcoming" | "past">("all");

  const [joinCodeCopied, setJoinCodeCopied] = useState(false);
  const [adviserModalOpen, setAdviserModalOpen] = useState(false);
  const [facultyOptions, setFacultyOptions] = useState<Array<{ profile_id: string; name: string; email: string; department?: string }>>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [assigningAdviser, setAssigningAdviser] = useState(false);
  const [teamNameModalOpen, setTeamNameModalOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [endorsementSlipOpen, setEndorsementSlipOpen] = useState(false);
  const [defenseGuideOpen, setDefenseGuideOpen] = useState(false);
  const [selectedEvalForCert, setSelectedEvalForCert] = useState<EvaluationResult | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const openAdviserModal = async () => {
    setAdviserModalOpen(true);
    try {
      const list = await getApprovedFacultyListAction();
      setFacultyOptions(list);
    } catch (err) {
      console.error("Failed to load faculty options:", err);
    }
  };

  const handleAssignAdviser = async () => {
    if (!project?.id || !selectedFacultyId) return;
    setAssigningAdviser(true);
    try {
      const res = await assignProjectAdviserAction(project.id, selectedFacultyId);
      if (!res.success) {
        toast.error(res.error || "Failed to assign adviser.");
        return;
      }
      toast.success("Research Adviser assigned successfully!");
      setAdviserModalOpen(false);
      setSelectedFacultyId("");
      await loadProjectData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error assigning adviser";
      toast.error(msg);
    } finally {
      setAssigningAdviser(false);
    }
  };

  const handleSaveTeamName = async () => {
    if (!project?.id) return;
    setSavingTeamName(true);
    try {
      const res = await updateProjectTeamNameAction(project.id, teamNameInput);
      if (!res.success) {
        toast.error(res.error || "Failed to update team name.");
        return;
      }
      setProject((prev) => (prev ? { ...prev, team_name: res.team_name || null } : prev));
      toast.success(res.team_name ? `Team name set to "${res.team_name}"` : "Team name removed.");
      setTeamNameModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving team name";
      toast.error(msg);
    } finally {
      setSavingTeamName(false);
    }
  };

  const loadProjectData = useCallback(async function _loadProjectData() {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get or resolve student record.
      let { data: studentRecord } = await supabase
        .from("students")
        .select("id, profile_id, campus_id, college_id, department_id, program_id, major_id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!studentRecord) {
        const { data: newStudent } = await supabase
          .from("students")
          .insert({ profile_id: user.id })
          .select()
          .single();
        studentRecord = newStudent;
      }
      setStudent(studentRecord);

      // 2. Check if user is a member of any project in project_members
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("profile_id", user.id)
        .limit(1);

      const memberProjectId = memberRows?.[0]?.project_id;

      let projectQuery = supabase
        .from("projects")
        .select(`
          id, title, team_name, status, academic_year, created_at,
          current_stage_id, workflow_template_id, join_code, student_id,
          defense_stages ( id, name, sequence_order ),
          departments ( id, name ),
          students ( id, profiles ( first_name, last_name ) )
        `);

      if (memberProjectId) {
        projectQuery = projectQuery.eq("id", memberProjectId);
      } else if (studentRecord?.id) {
        projectQuery = projectQuery.eq("student_id", studentRecord.id);
      } else {
        setLoading(false);
        return;
      }

      const { data: proj } = await projectQuery.maybeSingle();

      if (!proj) {
        setLoading(false);
        return;
      }
      setProject(proj as any);

      // 3. Fetch workflow stages for progress timeline (with fallback to default stages)
      let fetchedStages: StageData[] = [];
      if (proj.workflow_template_id) {
        const { data: stageData } = await supabase
          .from("defense_stages")
          .select("id, name, code, sequence_order, description, is_enabled")
          .eq("workflow_template_id", proj.workflow_template_id)
          .eq("is_enabled", true)
          .order("sequence_order");
        if (stageData && stageData.length > 0) fetchedStages = stageData;
      }
      if (fetchedStages.length === 0) {
        const { data: defaultStages } = await supabase
          .from("defense_stages")
          .select("id, name, code, sequence_order, description, is_enabled")
          .eq("is_enabled", true)
          .order("sequence_order");
        if (defaultStages) fetchedStages = defaultStages;
      }
      setStages(fetchedStages);

      // 4. Fetch documents + versions for this project
      const { data: docs } = await supabase
        .from("documents")
        .select(`
          id, stage_id, title, status, adviser_approval_status, approval_remarks,
          document_versions (
            id, version_number, file_name, file_size, created_at, is_current, checksum_sha256
          )
        `)
        .eq("project_id", proj.id)
        .order("created_at", { ascending: false });
      if (docs) setDocuments(docs as any);

      // 5. Fetch ALL project members (students + adviser + panel roles)
      //    Display all to the student so they know who is on their project.
      const { data: members, error: memErr } = await supabase
        .from("project_members")
        .select("profile_id, member_role, is_primary, profiles:profiles!project_members_profile_id_fkey ( first_name, last_name, email )")
        .eq("project_id", proj.id)
        .order("assigned_at", { ascending: true });
      if (members) {
        setAllMembers(members as any);
        const adviserMember = members.find((m: any) => m.member_role === "adviser");
        setAdviser(adviserMember ? (adviserMember as any) : null);
      }

      // 6. Fetch defense schedules
      const { data: scheds } = await supabase
        .from("defense_schedules")
        .select("id, scheduled_at, end_at, room, building, is_online, meeting_url, status, defense_stages ( name )")
        .eq("project_id", proj.id)
        .order("scheduled_at", { ascending: true });
      if (scheds) setSchedules(scheds as any);

      // 7. Fetch annotations (from current version)
      const versionIds = (docs || [])
        .flatMap((d: any) => d.document_versions || [])
        .map((v: any) => v.id);

      if (versionIds.length > 0) {
        const { data: anns } = await supabase
          .from("annotations")
          .select(`
            id, content, type, severity, status, page_number, created_at,
            profiles:profiles!annotations_created_by_fkey ( first_name, last_name )
          `)
          .in("document_version_id", versionIds)
          .order("created_at", { ascending: false })
          .limit(20);
        if (anns) setAnnotations(anns as any);
      }

      // 8. Fetch evaluation results
      const { data: evals } = await supabase
        .from("evaluations")
        .select(`
          id, total_score, weighted_score, verdict_code, status, submitted_at, recommendations,
          certificate_serial, signature_hash, signature_image, scores,
          profiles ( first_name, last_name ),
          defense_stages ( name )
        `)
        .eq("project_id", proj.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });
      if (evals) setEvaluations(evals as any);

    } catch (err) {
      console.error("Error loading project data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const openAnnotations = useMemo(() => {
    return annotations.filter((a) => a.status === "open" || a.status === "in_progress");
  }, [annotations]);

  const addressedAnnotations = useMemo(() => {
    return annotations.filter(
      (a) =>
        a.status === "addressed" ||
        a.status === "resolved" ||
        a.status === "verified" ||
        a.status === "closed"
    );
  }, [annotations]);

  const filteredAnnotations = useMemo(() => {
    let list = annotations;

    if (feedbackStatusFilter === "open") {
      list = openAnnotations;
    } else if (feedbackStatusFilter === "addressed") {
      list = addressedAnnotations;
    }

    if (feedbackSeverityFilter !== "all") {
      list = list.filter((a) => a.severity === feedbackSeverityFilter);
    }

    return list;
  }, [annotations, feedbackStatusFilter, feedbackSeverityFilter, openAnnotations, addressedAnnotations]);

  const upcomingSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const sDate = new Date(s.scheduled_at);
      const eDate = s.end_at ? new Date(s.end_at) : new Date(sDate.getTime() + 60 * 60 * 1000);
      return eDate.getTime() >= Date.now() && s.status !== "cancelled";
    });
  }, [schedules]);

  const pastSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const sDate = new Date(s.scheduled_at);
      const eDate = s.end_at ? new Date(s.end_at) : new Date(sDate.getTime() + 60 * 60 * 1000);
      return eDate.getTime() < Date.now() || s.status === "completed";
    });
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    if (scheduleFilter === "upcoming") return upcomingSchedules;
    if (scheduleFilter === "past") return pastSchedules;
    return schedules;
  }, [schedules, scheduleFilter, upcomingSchedules, pastSchedules]);

  const tabs = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "documents", label: "Documents", icon: FileText, count: documents.length },
    { id: "feedback", label: "Feedback", icon: MessageSquare, count: openAnnotations.length },
    { id: "schedule", label: "Schedule", icon: Calendar, count: schedules.length },
    { id: "evaluations", label: "Evaluations", icon: Award, count: evaluations.length },
  ] as const;

  // Calculate progress based on current stage position
  const currentStageIndex = stages.findIndex(s => s.id === project?.current_stage_id);
  const progressPct = stages.length > 0
    ? Math.round(((currentStageIndex + 1) / stages.length) * 100)
    : 0;

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <RoleGuard allowedRoles={["student"]} fallback={<AccessDenied />}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">No Project Assigned</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed mb-6">
              You don't have an active research project yet. Create a new one or join an existing project using a join code.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mx-auto">
              <div className="flex-1 w-full">
                <CreateProjectModal onSuccess={loadProjectData} student={student} />
              </div>
              <div className="flex-1 w-full">
                <JoinProjectModal onSuccess={loadProjectData} studentId={student?.id} />
              </div>
            </div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const latestDoc = documents[0];
  const currentVersion = latestDoc?.document_versions?.find(v => v.is_current) ??
    latestDoc?.document_versions?.[0];
  const statusClass = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  const adviserName = adviser?.profiles
    ? `${adviser.profiles.first_name} ${adviser.profiles.last_name}`
    : "Not Assigned";
  const upcomingSchedule = schedules.find(s => s.status === "scheduled");
  const endorsedDoc = documents.find(d => d.adviser_approval_status === "approved");
  const endorsedVersion = endorsedDoc?.document_versions?.length
    ? [...endorsedDoc.document_versions].sort((a, b) => b.version_number - a.version_number)[0]
    : null;

  const hasEvaluations = evaluations.length > 0;
  const isRevisionRequired = project.status === "revision_required";
  const isPassed = project.status === "passed" || project.status === "approved" || project.status === "completed";
  const latestEval = evaluations[0];

  const openAnnotationsCount = openAnnotations.length;
  const nextVersionNumber = currentVersion ? currentVersion.version_number + 1 : 2;

  return (
    <RoleGuard allowedRoles={["student"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {project.academic_year} • {project.departments?.name || "General"}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {project.team_name ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  <Users className="h-3.5 w-3.5" />
                  <span>Team: {project.team_name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTeamNameInput(project.team_name || "");
                      setTeamNameModalOpen(true);
                    }}
                    className="ml-0.5 text-primary/70 hover:text-primary transition-colors cursor-pointer"
                    title="Edit Team Name"
                  >
                    <Pencil className="h-2.5 w-2.5 inline" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTeamNameInput("");
                    setTeamNameModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border hover:border-primary/50 bg-background hover:bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Users className="h-3 w-3" />
                  + Add Team Name
                </button>
              )}
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusClass)}>
                {project.status.replace(/_/g, " ")}
              </span>
              {project.defense_stages && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  {(project.defense_stages as any).name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <PdfUploader
              projectId={project.id}
              stageId={project.current_stage_id || undefined}
              buttonText="Upload Manuscript (PDF)"
              className="font-bold shadow-sm"
              onUploadCompleted={loadProjectData}
            />
          </div>
        </div>

        {/* Quick stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Adviser</p>
                  <p className="text-sm font-bold text-foreground truncate">{adviserName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Manuscript</p>
                  <p className="text-sm font-bold text-foreground">
                    {currentVersion ? `Version ${currentVersion.version_number}` : "Not uploaded"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Open Comments</p>
                  <p className="text-sm font-bold text-foreground">
                    {annotations.filter(a => a.status === "open").length} unresolved
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Next Defense</p>
                  <p className="text-sm font-bold text-foreground">
                    {upcomingSchedule
                      ? format(new Date(upcomingSchedule.scheduled_at), "MMM d, yyyy")
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Revision Required Alert Banner ─────────────────────── */}
        {documents.some((d) => d.adviser_approval_status === "rejected") && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/40 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                    Adviser Revision Required
                  </h3>
                  <Badge variant="warning" className="text-[9px] font-bold">
                    Action Required
                  </Badge>
                </div>
                {documents.filter((d) => d.adviser_approval_status === "rejected").map((d) => (
                  <div key={d.id} className="text-xs text-amber-900/90 dark:text-amber-200">
                    <p className="font-semibold">{d.title || "Manuscript"}:</p>
                    <p className="mt-1 italic font-medium bg-amber-100/70 dark:bg-amber-900/50 p-2.5 rounded-lg border border-amber-300/40">
                      &ldquo;{d.approval_remarks || "Revisions required. Please address adviser remarks and upload a revised draft."}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
              {documents.filter((d) => d.adviser_approval_status === "rejected").map((d) => (
                <Button
                  key={d.id}
                  size="sm"
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                  asChild
                >
                  <Link href={`/workspace/${project.id}/${d.stage_id}`}>
                    <FileText className="h-4 w-4" />
                    Open Feedback &amp; Annotations
                  </Link>
                </Button>
              ))}
              <PdfUploader
                projectId={project.id}
                stageId={project.current_stage_id || undefined}
                buttonText="Upload Revised PDF"
                buttonVariant="outline"
                className="font-bold text-xs border-amber-400 dark:border-amber-700"
                onUploadCompleted={loadProjectData}
              />
            </div>
          </div>
        )}

        {/* ── Endorsement Success & Next Steps Roadmap Banner ─────────────────────── */}
        {/* ── State 1: Post-Defense Revision Required Roadmap Banner ───────── */}
        {isRevisionRequired && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-50/90 via-background to-amber-50/30 dark:from-amber-950/40 dark:via-background dark:to-amber-950/20 p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base md:text-lg font-black text-amber-950 dark:text-amber-100 tracking-tight">
                      Oral Defense Evaluated — Revisions Required for Stage Clearance
                    </h2>
                    <Badge variant="warning" className="text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white shadow-xs">
                      Revisions Required
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {latestEval ? (
                      <>
                        The defense committee evaluated your manuscript with a score of{" "}
                        <strong className="text-foreground">{Number(latestEval.total_score).toFixed(1)} / 100 ({Number(latestEval.total_score) >= 75 ? "Passed Criteria" : "Needs Revision"})</strong>.{" "}
                        However, there {openAnnotationsCount === 1 ? "is" : "are"}{" "}
                        <span className="font-bold text-amber-700 dark:text-amber-400">{openAnnotationsCount} open panel comment{openAnnotationsCount === 1 ? "" : "s"}</span> that must be addressed before this stage receives final institutional clearance.
                      </>
                    ) : (
                      "Panel comments and revisions have been requested. Please address all feedback and upload a revised manuscript draft."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-xs font-bold cursor-pointer"
                  onClick={() => setActiveTab("evaluations")}
                >
                  <Award className="h-3.5 w-3.5" />
                  View Evaluation ({evaluations.length})
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  onClick={() => setActiveTab("feedback")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open Comments ({openAnnotationsCount})
                </Button>
              </div>
            </div>

            {/* Post-Defense Action Roadmap */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                AURORA Defense Process Roadmap — 3 Steps to Final Stage Clearance
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Step 1: Review Panelist Rubrics & Recommendations */}
                <div 
                  onClick={() => setActiveTab("evaluations")}
                  className="rounded-xl p-4 border border-amber-500/30 bg-card shadow-xs space-y-2.5 cursor-pointer hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-[11px] font-black text-white shadow-xs">
                      1
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold text-amber-700 dark:text-amber-300 border-amber-300">
                      Panel Scores
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Review Panelist Rubric &amp; Marks
                    </h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Examine the detailed criterion scoring, recommendations, and electronic certificate issued by your panel members.
                    </p>
                  </div>
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1 pt-0.5">
                    View evaluation details &rarr;
                  </p>
                </div>

                {/* Step 2: Address Panel Annotations & Matrix of Revisions */}
                <div 
                  onClick={() => setActiveTab("feedback")}
                  className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2.5 cursor-pointer hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white shadow-xs">
                      2
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30">
                      {openAnnotationsCount} Open Comments
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Prepare Matrix of Revisions
                    </h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Review all highlighted manuscript text, methodology questions, and panel suggestions. Update your draft to satisfy each point.
                    </p>
                  </div>
                  <p className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1 pt-0.5">
                    Open feedback &amp; annotations &rarr;
                  </p>
                </div>

                {/* Step 3: Upload Revised PDF Manuscript */}
                <div className="rounded-xl p-4 border border-emerald-500/40 bg-card shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white shadow-xs">
                      3
                    </span>
                    <Badge variant="success" className="text-[9px] font-black">
                      Ready for v{nextVersionNumber}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Upload Revised PDF (v{nextVersionNumber})
                    </h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Once revisions are completed, upload the revised draft for your adviser and panel to verify clearance.
                    </p>
                  </div>
                  <div className="pt-1">
                    <PdfUploader
                      projectId={project.id}
                      stageId={project.current_stage_id || undefined}
                      buttonText={`Upload Manuscript v${nextVersionNumber}`}
                      className="w-full text-xs font-bold h-8 shadow-xs"
                      onUploadCompleted={loadProjectData}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── State 2: Post-Defense Cleared / Passed Banner ──────────────────── */}
        {isPassed && (
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50/90 via-background to-emerald-50/30 dark:from-emerald-950/40 dark:via-background dark:to-emerald-950/20 p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base md:text-lg font-black text-emerald-950 dark:text-emerald-100 tracking-tight">
                      🎉 Defense Stage Passed &amp; Officially Cleared!
                    </h2>
                    <Badge variant="success" className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                      Stage Cleared
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Congratulations! The defense committee has approved your defense for{" "}
                    <strong className="text-foreground">{(project.defense_stages as any)?.name || "this stage"}</strong>. Your official evaluation records and verifiable digital certificates are available below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  onClick={() => setActiveTab("evaluations")}
                >
                  <Award className="h-3.5 w-3.5" />
                  View &amp; Download Certificates
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Stage Clearance Roadmap — Next Steps
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div 
                  onClick={() => setActiveTab("evaluations")}
                  className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white shadow-xs">1</span>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary">Download Official Certificates</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Download institutional PDF certificates signed electronically by each panel member for your research portfolio.
                  </p>
                </div>
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white shadow-xs">2</span>
                  <h4 className="text-xs font-bold text-foreground">Verify Cryptographic Signatures</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Every certificate features an immutable SHA-256 hash and verification QR code on the public verification portal.
                  </p>
                </div>
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[11px] font-black text-white shadow-xs">3</span>
                  <h4 className="text-xs font-bold text-foreground">Advance to Next Academic Milestone</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your coordinator can advance your team to the next defense stage or final graduation clearance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── State 3: Pre-Defense Scheduled & Endorsed Roadmap Banner ───────── */}
        {!isRevisionRequired && !isPassed && !hasEvaluations && endorsedDoc && (
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-background to-emerald-50/30 dark:from-emerald-950/40 dark:via-background dark:to-emerald-950/20 p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base md:text-lg font-black text-emerald-950 dark:text-emerald-100 tracking-tight">
                      🎉 Manuscript Endorsed for Defense!
                    </h2>
                    <Badge variant="success" className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-600 text-white shadow-xs">
                      Adviser Cleared
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your research adviser <strong className="text-foreground">{adviserName}</strong> has reviewed and officially endorsed{" "}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">&ldquo;{endorsedDoc.title || "Manuscript"}&rdquo;</span> for oral defense.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold cursor-pointer"
                  onClick={() => setEndorsementSlipOpen(true)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Endorsement Clearance Slip
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  onClick={() => setDefenseGuideOpen(true)}
                >
                  <Presentation className="h-3.5 w-3.5" />
                  Defense Prep Guide
                </Button>
              </div>
            </div>

            {/* Adviser Remarks / Commendation if provided */}
            {endorsedDoc.approval_remarks && (
              <div className="rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-300/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-200">
                <span className="font-black uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300 block mb-1">
                  Adviser Endorsement Remarks
                </span>
                <p className="italic font-medium">&ldquo;{endorsedDoc.approval_remarks}&rdquo;</p>
              </div>
            )}

            {/* 3-Step Next Steps Progression */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                What Happens Next? — Student Defense Roadmap
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Step 1: Defense Coordination & Scheduling */}
                <Link
                  href="/dashboard/defenses"
                  className={cn(
                    "rounded-xl p-4 border transition-all duration-200 space-y-2.5 block group hover:shadow-md hover:-translate-y-0.5 no-underline",
                    upcomingSchedule 
                      ? "border-emerald-500/40 bg-card hover:border-emerald-500 shadow-xs" 
                      : "border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white shadow-xs">
                      1
                    </span>
                    <Badge 
                      variant={upcomingSchedule ? "success" : "info"} 
                      className="text-[9px] font-black"
                    >
                      {upcomingSchedule ? "Defense Scheduled" : "In Coordinator Queue"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {upcomingSchedule ? "Defense Timeslot Confirmed" : "Defense Scheduling Queue"}
                    </h4>
                    {upcomingSchedule ? (
                      <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                          📅 {format(new Date(upcomingSchedule.scheduled_at), "MMMM d, yyyy • h:mm a")}
                        </p>
                        <p>
                          📍 {upcomingSchedule.is_online ? "Virtual Meeting" : `${upcomingSchedule.room || "TBA"}, ${upcomingSchedule.building || "Campus"}`}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Your manuscript is now in the Defense Coordinator&apos;s queue. The coordinator is assigning 3 panelists and booking your defense room.
                      </p>
                    )}
                  </div>
                  <p className={cn(
                    "text-[11px] font-bold group-hover:underline flex items-center gap-1 pt-0.5",
                    upcomingSchedule ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                  )}>
                    {upcomingSchedule ? "View in Defenses Pipeline" : "Track Defense Pipeline"} &rarr;
                  </p>
                </Link>

                {/* Step 2: Slide Deck & Rubrics Preparation */}
                <div 
                  onClick={() => setDefenseGuideOpen(true)}
                  className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2.5 cursor-pointer hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white shadow-xs">
                      2
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30">
                      15-Min Rubric
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Prepare Presentation Deck
                    </h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Prepare a 10-12 slide deck structured around your objectives, methodology, and demo. Keep presentation to exactly 15 minutes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefenseGuideOpen(true);
                    }}
                    className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    View slide breakdown &rarr;
                  </button>
                </div>

                {/* Step 3: Defense Day & Panel Verdict */}
                <Link
                  href={`/workspace/${project.id}/${endorsedDoc.stage_id}`}
                  className="rounded-xl p-4 border border-border bg-card shadow-xs space-y-2.5 block cursor-pointer hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group no-underline"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 dark:bg-slate-300 text-[11px] font-black text-white dark:text-slate-900 shadow-xs">
                      3
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground">
                      Panel Evaluation
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Oral Defense &amp; Rubric Scoring
                    </h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Panelists evaluate your research live across criteria weights (100 pts) and submit their consensus verdict and revision notes.
                    </p>
                  </div>
                  <p className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1 pt-0.5">
                    Review annotations workspace &rarr;
                  </p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-0.5 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {"count" in tab && tab.count > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Progress timeline — takes 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Defense Workflow Progress</CardTitle>
                  <CardDescription>
                    Stage {currentStageIndex + 1} of {stages.length} — {progressPct}% complete
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={progressPct} className="h-2" />
                  <div className="space-y-1">
                    {stages.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = stage.id === project.current_stage_id;
                      const isPending = idx > currentStageIndex;
                      return (
                        <div
                          key={stage.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
                            isCurrent && "bg-primary/5 border border-primary/20",
                            isCompleted && "opacity-70"
                          )}
                        >
                          <div className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                            isCompleted ? "bg-success text-white" : isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-bold",
                              isCurrent ? "text-primary" : isCompleted ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {stage.name}
                            </p>
                            {stage.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{stage.description}</p>
                            )}
                          </div>
                          {isCurrent && (
                            <Badge variant="info" className="text-[9px] shrink-0">Current</Badge>
                          )}
                          {isCompleted && (
                            <CheckCheck className="h-4 w-4 text-success shrink-0" />
                          )}
                          {isPending && (
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {stages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No workflow stages configured. Contact your coordinator.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar info */}
            <div className="space-y-4">
              {/* Project details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground font-semibold">Department</p>
                      <p className="font-bold text-foreground">{project.departments?.name || "Not assigned"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground font-semibold">Academic Year</p>
                      <p className="font-bold text-foreground">{project.academic_year || "2026-2027"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground font-semibold">Adviser</p>
                        <p className="font-bold text-foreground">{adviserName}</p>
                        {adviser?.profiles?.email && (
                          <p className="text-muted-foreground text-[10px]">{adviser.profiles.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] font-bold shrink-0"
                      onClick={openAdviserModal}
                    >
                      {adviser ? "Change" : "Select Adviser"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground font-semibold">Enrolled</p>
                      <p className="font-bold text-foreground">
                        {format(new Date(project.created_at), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Research Proponents & Adviser ─────────────────────── */}
              {allMembers.length > 0 && (
                <Card className="border border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Research Proponents &amp; Adviser
                        </CardTitle>
                        {project.team_name && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                            {project.team_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] font-semibold text-muted-foreground hover:text-primary px-2"
                          onClick={() => {
                            setTeamNameInput(project.team_name || "");
                            setTeamNameModalOpen(true);
                          }}
                        >
                          <Pencil className="h-2.5 w-2.5 mr-1" />
                          {project.team_name ? "Edit Team" : "Set Team Name"}
                        </Button>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {allMembers.filter(m => m.member_role !== "adviser").length} Proponents
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-[11px] text-muted-foreground leading-tight">
                      All group members linked via Join Code share real-time access to this project.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {allMembers.map((m) => {
                      const name = m.profiles
                        ? `${m.profiles.first_name} ${m.profiles.last_name}`
                        : "Unknown";
                      const isAdviser = m.member_role === "adviser";
                      const isLeader = !isAdviser && (m.member_role === "student_leader" || m.is_primary);
                      const roleBadgeVariant =
                        isAdviser ? "info" :
                        isLeader ? "warning" :
                        "secondary";
                      const roleLabel =
                        isAdviser ? "Research Adviser" :
                        isLeader ? "Team Lead" :
                        m.member_role === "panel_chair" ? "Chair" :
                        m.member_role === "panel_member" ? "Panelist" :
                        "Co-Author";
                      return (
                        <div key={m.profile_id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                              isLeader ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                              isAdviser ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                              "bg-primary/10 text-primary"
                            )}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isLeader && (
                                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                <p className="font-bold text-foreground truncate text-xs">{name}</p>
                              </div>
                              {m.profiles?.email && (
                                <p className="text-[10px] text-muted-foreground truncate">{m.profiles.email}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant={roleBadgeVariant} className="text-[9px] font-bold shrink-0">
                            {roleLabel}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* ── Join Code (visible to student members) ─── */}
              {project?.join_code && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Team Join Code
                      </CardTitle>
                      <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/10">
                        Share with Teammates
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px] text-muted-foreground leading-normal">
                      Share this code with your groupmates. When they sign up and enter this code, they will immediately be linked to this exact research project!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-background px-3 py-2 text-center text-lg font-mono font-black tracking-[0.25em] text-primary border border-primary/30 shadow-xs">
                        {project.join_code}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-10 px-3 gap-1.5 text-xs font-bold border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(project.join_code || "");
                          setJoinCodeCopied(true);
                          setTimeout(() => setJoinCodeCopied(false), 2000);
                        }}
                        title="Copy join code"
                      >
                        {joinCodeCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <PdfUploader
                    projectId={project.id}
                    stageId={project.current_stage_id || undefined}
                    buttonText="Upload New Version"
                    buttonVariant="default"
                    className="w-full justify-center text-xs h-9 font-bold"
                    onUploadCompleted={loadProjectData}
                  />
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9 font-semibold" asChild>
                    <Link href={`/workspace/${project.id}/${project.current_stage_id || ""}`}>
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      View Manuscript &amp; Feedback
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Manuscript Versions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">All uploaded manuscript files with version history</p>
              </div>
              <PdfUploader
                projectId={project.id}
                stageId={project.current_stage_id || undefined}
                buttonText="Upload PDF"
                onUploadCompleted={loadProjectData}
              />
            </div>

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold">No Documents Uploaded</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload your first manuscript to begin the defense workflow.
                </p>
                <div className="mt-4">
                  <PdfUploader
                    projectId={project.id}
                    stageId={project.current_stage_id || undefined}
                    buttonText="Upload First Manuscript (PDF)"
                    className="font-bold"
                    onUploadCompleted={loadProjectData}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => {
                  const versions = [...(doc.document_versions || [])].sort(
                    (a, b) => b.version_number - a.version_number
                  );
                  return (
                    <Card key={doc.id} className="rounded-2xl border border-border overflow-hidden">
                      {/* Document Header with Title & Adviser Status */}
                      <div className="px-5 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold text-sm text-foreground">{doc.title || "Manuscript"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.adviser_approval_status === "approved" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 font-bold cursor-pointer"
                                onClick={() => setEndorsementSlipOpen(true)}
                              >
                                <Printer className="h-3 w-3" />
                                Clearance Slip
                              </Button>
                              <Badge variant="success" className="text-[10px] font-bold">
                                Adviser Endorsed
                              </Badge>
                            </>
                          ) : doc.adviser_approval_status === "rejected" ? (
                            <Badge variant="warning" className="text-[10px] font-bold">
                              Revisions Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                              Under Review
                            </Badge>
                          )}
                        </div>
                      </div>

                      {doc.approval_remarks && (
                        <div className={cn(
                          "px-5 py-2.5 text-xs border-b border-border flex items-start gap-2",
                          doc.adviser_approval_status === "rejected"
                            ? "bg-amber-500/10 text-amber-950 dark:text-amber-200"
                            : "bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                        )}>
                          <span className="font-bold shrink-0">Adviser Remarks:</span>
                          <span className="font-medium">{doc.approval_remarks}</span>
                        </div>
                      )}

                      <CardContent className="p-0">
                        <div className="overflow-hidden rounded-2xl">
                          {versions.map((v, vi) => (
                            <div
                              key={v.id}
                              className={cn(
                                "flex items-center gap-4 px-5 py-3.5 transition-colors",
                                vi !== versions.length - 1 && "border-b border-border",
                                v.is_current && "bg-primary/3"
                              )}
                            >
                              <div className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                                v.is_current ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                              )}>
                                v{v.version_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{v.file_name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(new Date(v.created_at), "MMM d, yyyy h:mm a")} •{" "}
                                  {v.file_size ? `${(v.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {v.is_current && (
                                  <Badge variant="success" className="text-[9px]">Current</Badge>
                                )}
                                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 rounded-lg font-semibold" asChild>
                                  <Link href={`/workspace/${project.id}/${doc.stage_id}`}>
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    View &amp; Feedback
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Adviser &amp; Panel Feedback</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Annotations and comments from your adviser and panel members
                </p>
              </div>

              {project && (
                <Link href={`/workspace/${project.id}/${project.current_stage_id || ""}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Open Manuscript Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border/60">
              {/* Status Segmented Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFeedbackStatusFilter("open")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    feedbackStatusFilter === "open"
                      ? "bg-warning/20 text-warning-foreground border border-warning/40 shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Needs Action ({openAnnotations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackStatusFilter("addressed")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    feedbackStatusFilter === "addressed"
                      ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Addressed &amp; Resolved ({addressedAnnotations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackStatusFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    feedbackStatusFilter === "all"
                      ? "bg-card text-foreground border border-border shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  All Feedback ({annotations.length})
                </button>
              </div>

              {/* Severity Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">Severity:</span>
                <select
                  value={feedbackSeverityFilter}
                  onChange={(e) => setFeedbackSeverityFilter(e.target.value)}
                  className="h-7 rounded-md border border-border bg-card px-2 text-[11px] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>

            {/* Feedback List */}
            {filteredAnnotations.length === 0 ? (
              feedbackStatusFilter === "open" && addressedAnnotations.length > 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                  <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                    All Comments Addressed!
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                    You currently have 0 open annotations. Everything has been resolved on this manuscript version.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFeedbackStatusFilter("addressed")}
                    className="mt-4 text-xs font-bold gap-1.5 border-emerald-400 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    View Addressed Comments ({addressedAnnotations.length})
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-base font-bold text-foreground">No Feedback Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No comments match your current filter criteria.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {filteredAnnotations.map((ann) => {
                  const authorName = ann.profiles
                    ? `${ann.profiles.first_name} ${ann.profiles.last_name}`
                    : "Reviewer";
                  const isAddressed =
                    ann.status === "addressed" ||
                    ann.status === "resolved" ||
                    ann.status === "verified" ||
                    ann.status === "closed";

                  return (
                    <Card
                      key={ann.id}
                      className={cn(
                        "rounded-2xl border transition-all shadow-2xs hover:shadow-xs",
                        isAddressed
                          ? "opacity-75 bg-muted/15 border-border"
                          : "border-border bg-card"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                              !isAddressed
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {!isAddressed ? (
                              <AlertCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{authorName}</span>
                              <Badge variant="outline" className="text-[9px]">
                                Page {ann.page_number}
                              </Badge>
                              <Badge
                                variant={
                                  ann.severity === "critical"
                                    ? "danger"
                                    : ann.severity === "major"
                                    ? "warning"
                                    : "outline"
                                }
                                className="text-[9px]"
                              >
                                {ann.severity}
                              </Badge>
                              <Badge
                                variant={!isAddressed ? "warning" : "success"}
                                className="text-[9px] uppercase font-bold"
                              >
                                {ann.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed">{ann.content}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(ann.created_at), "MMM d, yyyy h:mm a")}
                              </span>
                              {project && (
                                <Link
                                  href={`/workspace/${project.id}/${project.current_stage_id || ""}?page=${ann.page_number}`}
                                  className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <span>Jump to Page {ann.page_number} in Workspace</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Defense Schedule</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your scheduled and past defense sessions</p>
              </div>

              {/* Schedule Filter Buttons */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
                <button
                  type="button"
                  onClick={() => setScheduleFilter("all")}
                  className={cn(
                    "text-[11px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer",
                    scheduleFilter === "all"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Defenses ({schedules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter("upcoming")}
                  className={cn(
                    "text-[11px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer",
                    scheduleFilter === "upcoming"
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Upcoming &amp; Live ({upcomingSchedules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter("past")}
                  className={cn(
                    "text-[11px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer",
                    scheduleFilter === "past"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Past Defenses ({pastSchedules.length})
                </button>
              </div>
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold text-foreground">
                  {scheduleFilter === "upcoming"
                    ? "No Upcoming Defenses"
                    : scheduleFilter === "past"
                    ? "No Past Defenses"
                    : "No Defense Scheduled"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {scheduleFilter === "upcoming"
                    ? "You do not have any upcoming defense sessions scheduled at this time."
                    : scheduleFilter === "past"
                    ? "You have not completed any defense sessions yet."
                    : "Your coordinator will schedule your defense once your manuscript is approved."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map((sched) => {
                  const sDate = new Date(sched.scheduled_at);
                  const eDate = sched.end_at
                    ? new Date(sched.end_at)
                    : new Date(sDate.getTime() + 60 * 60 * 1000);
                  const isPast = eDate.getTime() < Date.now() || sched.status === "completed";
                  const isLive = Date.now() >= sDate.getTime() && Date.now() <= eDate.getTime();
                  const isToday =
                    !isNaN(sDate.getTime()) && new Date().toDateString() === sDate.toDateString();

                  return (
                    <Card
                      key={sched.id}
                      className={cn(
                        "rounded-2xl border transition-all shadow-2xs hover:shadow-xs",
                        isLive
                          ? "border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-500/20"
                          : isPast
                          ? "border-border bg-card opacity-90"
                          : "border-primary/30 bg-primary/3 shadow-xs"
                      )}
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {(sched.defense_stages as any)?.name || "Defense Stage"}
                              </p>

                              {/* Real-time Status Badge */}
                              <Badge
                                variant={
                                  sched.status === "cancelled"
                                    ? "danger"
                                    : isLive
                                    ? "warning"
                                    : isPast
                                    ? "outline"
                                    : isToday
                                    ? "warning"
                                    : "info"
                                }
                                className={cn(
                                  "text-[9px] uppercase font-bold",
                                  isPast && !isLive && sched.status !== "cancelled"
                                    ? "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                    : ""
                                )}
                              >
                                {sched.status === "cancelled"
                                  ? "Cancelled"
                                  : isLive
                                  ? "In Session (Live)"
                                  : isPast
                                  ? "Past Defense"
                                  : isToday
                                  ? "Happening Today"
                                  : "Scheduled"}
                              </Badge>

                              {isPast && evaluations.length > 0 && (
                                <Badge
                                  variant="success"
                                  className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                  Evaluated
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-semibold">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(sDate, "MMMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {format(sDate, "h:mm a")} – {format(eDate, "h:mm a")}
                              </span>
                              {sched.is_online ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <Video className="h-3.5 w-3.5" />
                                  Online Conference
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {sched.room || "TBD"}, {sched.building || "Campus"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            {isPast && evaluations.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab("evaluations")}
                                className="h-8 text-xs font-bold gap-1 text-emerald-700 border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                              >
                                <Award className="h-3.5 w-3.5 text-emerald-600" />
                                <span>View Results</span>
                              </Button>
                            )}

                            {project && (
                              <Link href={`/workspace/${project.id}/${project.current_stage_id || ""}`}>
                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 shadow-2xs">
                                  <span>Workspace</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}

                            {sched.is_online && sched.meeting_url && !isPast && (
                              <Button size="sm" className="h-8 text-xs font-bold gap-1" asChild>
                                <a href={sched.meeting_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Join Meeting</span>
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "evaluations" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold">Evaluation Results</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Panel evaluations and scores from your defenses</p>
            </div>

            {evaluations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <Award className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold">No Evaluations Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Evaluation results will appear here after your panel members submit their rubric scores.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {evaluations.map((evalItem) => {
                  const score = Number(evalItem.total_score || 0);
                  const verdict = score >= 75 ? "PASSED" : "NEEDS REVISION";
                  const panelistName = evalItem.profiles
                    ? `${evalItem.profiles.first_name} ${evalItem.profiles.last_name}`
                    : "Panelist";
                  return (
                    <Card key={evalItem.id} className="rounded-2xl border border-border">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{panelistName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(evalItem.defense_stages as any)?.name || "Defense"} •{" "}
                              {evalItem.submitted_at ? format(new Date(evalItem.submitted_at), "MMM d, yyyy") : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-xl font-black text-foreground">{score.toFixed(1)}</p>
                              <p className="text-[9px] text-muted-foreground">/100</p>
                            </div>
                            <Badge
                              variant={score >= 75 ? "success" : "warning"}
                              className="text-[9px]"
                            >
                              {verdict}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={score} className="h-1.5" />
                        {evalItem.recommendations && (
                          <div className="rounded-xl bg-muted/50 p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Recommendations</p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{evalItem.recommendations}</p>
                          </div>
                        )}

                        {/* Certificate Actions & Verification Bar */}
                        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {evalItem.certificate_serial && (
                              <Badge variant="outline" className="font-mono text-[9px] font-bold border-primary/30 text-primary bg-primary/5">
                                Cert #{evalItem.certificate_serial}
                              </Badge>
                            )}
                            {evalItem.signature_hash && (
                              <span className="text-[9px] font-mono text-muted-foreground hidden sm:inline" title={evalItem.signature_hash}>
                                SHA-256: {evalItem.signature_hash.substring(0, 12)}...
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEvalForCert(evalItem);
                                setCertDialogOpen(true);
                              }}
                              className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                            >
                              <Award className="h-3 w-3" />
                              View Certificate
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={downloadingCertId === evalItem.id}
                              onClick={async () => {
                                setDownloadingCertId(evalItem.id);
                                try {
                                  await downloadCertificatePdf({
                                    evaluationId: evalItem.id,
                                    certificateSerial: evalItem.certificate_serial || "AURORA-CERT",
                                    projectTitle: project.title,
                                    stageName: (evalItem.defense_stages as any)?.name || "Defense Stage",
                                    panelistName,
                                    totalScore: score,
                                    verdictCode: evalItem.verdict_code,
                                    signedAt: evalItem.submitted_at,
                                    signatureHash: evalItem.signature_hash,
                                    signatureImage: evalItem.signature_image,
                                    scores: evalItem.scores,
                                    recommendations: evalItem.recommendations,
                                    academicYear: project.academic_year,
                                  });
                                  toast.success("Defense Certificate PDF downloaded!");
                                } catch (err) {
                                  toast.error("Failed to generate certificate PDF.");
                                } finally {
                                  setDownloadingCertId(null);
                                }
                              }}
                              className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                            >
                              {downloadingCertId === evalItem.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              Download PDF
                            </Button>

                            {evalItem.certificate_serial && (
                              <Link
                                href={`/verify/${encodeURIComponent(evalItem.certificate_serial)}`}
                                target="_blank"
                                className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-0.5 ml-1"
                              >
                                Verify <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Certificate Dialog */}
        <CertificateDialog
          open={certDialogOpen}
          onOpenChange={setCertDialogOpen}
          evaluation={selectedEvalForCert}
          projectTitle={project.title}
          stageName={(selectedEvalForCert?.defense_stages as any)?.name || "Defense Stage"}
          panelistName={selectedEvalForCert?.profiles ? `${selectedEvalForCert.profiles.first_name} ${selectedEvalForCert.profiles.last_name}` : "Panelist"}
        />

        {/* Adviser Selection Modal */}
        <Dialog open={adviserModalOpen} onOpenChange={setAdviserModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {adviser ? "Change Research Adviser" : "Select Research Adviser"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Designate a verified faculty member to review and approve your defense manuscripts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Faculty Adviser *</label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">-- Choose Approved Faculty --</option>
                  {facultyOptions.map((f) => (
                    <option key={f.profile_id} value={f.profile_id}>
                      {f.name} {f.department ? `(${f.department})` : `(${f.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdviserModalOpen(false)}
                  disabled={assigningAdviser}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="font-bold"
                  disabled={!selectedFacultyId || assigningAdviser}
                  onClick={handleAssignAdviser}
                >
                  {assigningAdviser ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Confirm Adviser
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Team Name Modal */}
        <Dialog open={teamNameModalOpen} onOpenChange={setTeamNameModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {project.team_name ? "Edit Team Name" : "Set Team Name"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Designate an official group name for your research team to appear across defense schedules, rubrics, and deliberations.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTeamName();
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team / Group Name</Label>
                <Input
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="e.g. Team ByteCraft, SyntaxSquad, etc."
                  disabled={savingTeamName}
                  maxLength={60}
                />
                <p className="text-[10px] text-muted-foreground">
                  Visible to all group members, panelists, and your research adviser.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTeamNameModalOpen(false)}
                  disabled={savingTeamName}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="font-bold"
                  disabled={savingTeamName}
                >
                  {savingTeamName && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Save Team Name
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Endorsement Clearance Slip Modal ─────────────────────── */}
        <Dialog open={endorsementSlipOpen} onOpenChange={setEndorsementSlipOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black tracking-tight">
                      Adviser Endorsement Clearance Slip
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Official institutional clearance record for oral defense deliberations
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Slip
                </Button>
              </div>
            </DialogHeader>

            {/* Clearance Slip Document Body */}
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-card p-6 space-y-6 shadow-xs relative overflow-hidden">
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <ShieldCheck className="w-96 h-96 text-emerald-900" />
              </div>

              {/* Institutional Letterhead */}
              <div className="text-center space-y-1 border-b border-border/80 pb-4 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Republic of the Philippines
                </p>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Partido State University
                </h3>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {project.departments?.name || "College of Computing and Information Technology"}
                </p>
                <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  AURORA Paperless Defense &amp; Research Repository Management System
                </p>
              </div>

              {/* Slip Title */}
              <div className="text-center relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  Certificate of Adviser Endorsement
                </span>
                <h4 className="mt-2 text-sm font-bold text-foreground">
                  ELIGIBILITY FOR ORAL DEFENSE DELIBERATION
                </h4>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs relative z-10 bg-muted/30 p-4 rounded-xl border border-border/60">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Research Title</p>
                  <p className="font-bold text-foreground mt-0.5">{project.title}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Defense Stage</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {project.defense_stages?.name || "Current Defense Stage"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Research Proponents</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {allMembers
                      .filter((m) => m.member_role !== "adviser")
                      .map((m) => m.profiles ? `${m.profiles.first_name} ${m.profiles.last_name}` : "")
                      .filter(Boolean)
                      .join(", ") || (project.students?.profiles ? `${project.students.profiles.first_name} ${project.students.profiles.last_name}` : "Student Author")}
                  </p>
                  {project.team_name && (
                    <p className="text-[10px] font-semibold text-primary mt-0.5">
                      Team: {project.team_name}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Academic Year</p>
                  <p className="font-bold text-foreground mt-0.5">{project.academic_year || "2026-2027"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Endorsing Adviser</p>
                  <p className="font-bold text-foreground mt-0.5">{adviserName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Endorsed Manuscript</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {endorsedVersion ? `Version ${endorsedVersion.version_number} (${endorsedVersion.file_name})` : "Latest Upload"}
                  </p>
                </div>
              </div>

              {/* Certification Text */}
              <div className="relative z-10 text-xs text-muted-foreground leading-relaxed bg-card p-3 rounded-lg border border-border/50">
                <p>
                  This is to officially certify that the research manuscript entitled above has been thoroughly examined, mentored, and reviewed through the AURORA paperless research management system. The research group has satisfactorily addressed all consultation annotations and recommendations, and the manuscript is hereby <strong className="text-foreground font-bold">OFFICIALLY ENDORSED</strong> for defense scheduling before the appointed Examination Panel.
                </p>
              </div>

              {/* Adviser Remarks if any */}
              {endorsedDoc?.approval_remarks && (
                <div className="relative z-10 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-950 dark:text-emerald-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                    Adviser Endorsement Remarks
                  </p>
                  <p className="italic">&ldquo;{endorsedDoc.approval_remarks}&rdquo;</p>
                </div>
              )}

              {/* Official Clearance Stamp & Verification Footer */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-border/70">
                <div className="text-left space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Verification Serial</p>
                  <p className="font-mono text-xs font-black text-foreground">
                    AURORA-END-{project.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    System timestamped &amp; digitally recorded in Supabase audit log
                  </p>
                </div>

                {/* Digital Stamp */}
                <div className="border-2 border-dashed border-emerald-600 rounded-xl px-4 py-2 text-center bg-emerald-50/50 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-1.5 justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      ENDORSED FOR DEFENSE
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Certified by {adviserName}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Defense Preparation Guide Modal ─────────────────────── */}
        <Dialog open={defenseGuideOpen} onOpenChange={setDefenseGuideOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Presentation className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black tracking-tight">
                    Oral Defense Preparation &amp; Rubric Guide
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Official guidelines for candidate proponents preparing for oral defense deliberations
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 text-xs">
              {/* 1. Time Allocation Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">15-Minute Presentation</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Strict maximum for your oral presentation. Keep slides clear, visual, and concise. Practice timing beforehand.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-foreground">15-Minute Q&amp;A Defense</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Panelists will question methodology, architecture, and defense readiness. All proponents must participate.
                  </p>
                </div>
              </div>

              {/* 2. Recommended 10-12 Slide Deck Outline */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Recommended 15-Minute Slide Deck Structure
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      slides: "Slide 1",
                      title: "Title & Proponents",
                      time: "30 sec",
                      desc: "Project Title, Proponent Names, Research Adviser, and Department name.",
                    },
                    {
                      slides: "Slide 2-3",
                      title: "Problem Rationale & Significance",
                      time: "2.5 mins",
                      desc: "What real-world problem does this solve? Who is affected? Why is an automated solution necessary?",
                    },
                    {
                      slides: "Slide 4",
                      title: "Objectives & Scope",
                      time: "1.5 mins",
                      desc: "General and specific SMART objectives. Highlight system boundaries, delimitations, and target beneficiaries.",
                    },
                    {
                      slides: "Slide 5",
                      title: "Conceptual Framework & Literature",
                      time: "1.5 mins",
                      desc: "Input-Process-Output (IPO) model or conceptual diagram with key literature citations.",
                    },
                    {
                      slides: "Slide 6-7",
                      title: "Methodology & Architecture",
                      time: "3.5 mins",
                      desc: "System architecture, database schema (ERD), algorithm flowcharts, and hardware/software tech stack.",
                    },
                    {
                      slides: "Slide 8-10",
                      title: "Prototype Demo & Results",
                      time: "4 mins",
                      desc: "Showcase core working modules, test cases, and facial recognition or hardware outputs in action.",
                    },
                    {
                      slides: "Slide 11-12",
                      title: "Conclusions & Recommendations",
                      time: "1.5 mins",
                      desc: "Summary of accomplishments against objectives, current limitations, and future enhancement roadmap.",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <div className="flex flex-col items-center justify-center shrink-0 w-16 text-center">
                        <span className="text-[10px] font-black text-primary">{item.slides}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold">{item.time}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground text-xs">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 100-Point Institutional Rubric Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Institutional Evaluation Rubrics (100 Points Total)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex justify-between font-bold">
                      <span>Problem Formulation &amp; Literature</span>
                      <span className="text-primary font-black">20 pts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Clarity of problem, rationale, and cited literature</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex justify-between font-bold">
                      <span>Technical Rigor &amp; Architecture</span>
                      <span className="text-primary font-black">30 pts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Methodology, database design, system soundness</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex justify-between font-bold">
                      <span>System Output &amp; Prototype Demo</span>
                      <span className="text-primary font-black">25 pts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Working prototype, testing results, UI/UX execution</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex justify-between font-bold">
                      <span>Oral Defense Poise &amp; Q&amp;A Defense</span>
                      <span className="text-primary font-black">15 pts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Mastery, clarity of responses, equitable participation</p>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex justify-between font-bold">
                      <span>Manuscript Quality &amp; Citations</span>
                      <span className="text-primary font-black">10 pts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Grammar, IEEE/APA format, resolution of adviser annotations</p>
                  </div>
                </div>
              </div>

              {/* 4. Defense Day Pro Tips */}
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300/40 space-y-2">
                <h4 className="font-bold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Pro Tips for High Scores
                </h4>
                <ul className="text-[11px] text-amber-900/90 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                  <li><strong>Review all Adviser Annotations:</strong> Panelists can see your manuscript revision history. Be ready to explain how adviser feedback was incorporated.</li>
                  <li><strong>Offline Prototype Readiness:</strong> Have a screen recording or local offline fallback of your system demo in case venue WiFi is unstable.</li>
                  <li><strong>Equitable Participation:</strong> Each group member should present their assigned module so panelists see true teamwork.</li>
                  <li><strong>One Member on Notes:</strong> Appoint one group member specifically to record all panel recommendations during Q&amp;A for your post-defense revisions.</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

