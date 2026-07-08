"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PdfUploader } from "@/components/documents/pdf-uploader";
import { format } from "date-fns";
import {
  BookOpen, Calendar, FileText, MessageSquare, Award, CheckCircle2,
  Clock, Upload, History, User, Building2, GraduationCap, AlertCircle,
  Loader2, Inbox, ArrowRight, CheckCheck, XCircle, ChevronRight, Download,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CreateProjectModal } from "@/components/workspace/create-project-modal";
import { JoinProjectModal } from "@/components/workspace/join-project-modal";

interface ProjectData {
  id: string;
  title: string;
  status: string;
  academic_year: string;
  created_at: string;
  current_stage_id: string | null;
  defense_stages: { id: string; name: string; sequence_order: number } | null;
  workflow_template_id: string | null;
  departments: { id: string; name: string } | null;
  students: { id: string; profiles: { first_name: string; last_name: string } | null } | null;
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
  checksum: string | null;
}

interface DocumentData {
  id: string;
  stage_id: string;
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
  status: string;
  submitted_at: string;
  recommendations: string | null;
  profiles: { first_name: string; last_name: string } | null;
  defense_stages: { name: string } | null;
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
  const [adviser, setAdviser] = useState<AdviserMember | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "feedback" | "schedule" | "evaluations">("overview");

  async function loadProjectData() {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get student record
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id, campus_id, college_id, department_id, program_id, major_id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!studentRecord) {
        setLoading(false);
        return;
      }
      setStudent(studentRecord);

      // 2. Get project with all linked data
      const { data: proj } = await supabase
        .from("projects")
        .select(`
          id, title, status, academic_year, created_at,
          current_stage_id, workflow_template_id,
          defense_stages ( id, name, sequence_order ),
          departments ( id, name ),
          students ( id, profiles ( first_name, last_name ) )
        `)
        .eq("student_id", studentRecord.id)
        .maybeSingle();

      if (!proj) {
        setLoading(false);
        return;
      }
      setProject(proj as any);

      // 3. Fetch workflow stages for progress timeline
      if (proj.workflow_template_id) {
        const { data: stageData } = await supabase
          .from("defense_stages")
          .select("id, name, code, sequence_order, description, is_enabled")
          .eq("workflow_template_id", proj.workflow_template_id)
          .eq("is_enabled", true)
          .order("sequence_order");
        if (stageData) setStages(stageData);
      }

      // 4. Fetch documents + versions for this project
      const { data: docs } = await supabase
        .from("documents")
        .select(`
          id, stage_id,
          document_versions (
            id, version_number, file_name, file_size, created_at, is_current, checksum
          )
        `)
        .eq("project_id", proj.id)
        .order("created_at", { ascending: false });
      if (docs) setDocuments(docs as any);

      // 5. Fetch adviser from project_members
      const { data: members } = await supabase
        .from("project_members")
        .select("profile_id, member_role, profiles ( first_name, last_name, email )")
        .eq("project_id", proj.id)
        .eq("member_role", "adviser");
      if (members && members.length > 0) setAdviser(members[0] as any);

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
            profiles ( first_name, last_name )
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
          id, total_score, status, submitted_at, recommendations,
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
  }

  useEffect(() => {
    loadProjectData();
  }, [user]);

  const tabs = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "documents", label: "Documents", icon: FileText, count: documents.length },
    { id: "feedback", label: "Feedback", icon: MessageSquare, count: annotations.filter(a => a.status === "open").length },
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
            <PdfUploader onUploadCompleted={loadProjectData} />
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
                      <p className="font-bold text-foreground">{project.academic_year || "2025-2026"}</p>
                    </div>
                  </div>
                  <Separator />
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

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <PdfUploader onUploadCompleted={loadProjectData} />
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9" asChild>
                    <Link href="/dashboard/annotations">
                      <MessageSquare className="h-3.5 w-3.5" />
                      View All Feedback
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-9" asChild>
                    <Link href="/dashboard/grades">
                      <Award className="h-3.5 w-3.5" />
                      View Evaluations
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
              <PdfUploader onUploadCompleted={loadProjectData} />
            </div>

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold">No Documents Uploaded</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload your first manuscript to begin the defense workflow.
                </p>
                <div className="mt-4">
                  <PdfUploader onUploadCompleted={loadProjectData} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => {
                  const versions = [...(doc.document_versions || [])].sort(
                    (a, b) => b.version_number - a.version_number
                  );
                  return (
                    <Card key={doc.id} className="rounded-2xl border border-border">
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                  <Link href={`/workspace/${project.id}/${doc.stage_id}`}>
                                    <ExternalLink className="h-3.5 w-3.5" />
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
            <div>
              <h2 className="text-base font-bold">Adviser &amp; Panel Feedback</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Annotations and comments from your adviser and panel members</p>
            </div>

            {annotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold">No Feedback Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your adviser and panel members haven't added any comments yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {annotations.map((ann) => {
                  const authorName = ann.profiles
                    ? `${ann.profiles.first_name} ${ann.profiles.last_name}`
                    : "Reviewer";
                  return (
                    <Card key={ann.id} className="rounded-2xl border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                            ann.status === "open" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                          )}>
                            {ann.status === "open" ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{authorName}</span>
                              <Badge variant="outline" className="text-[9px]">Page {ann.page_number}</Badge>
                              <Badge
                                variant={ann.severity === "critical" ? "danger" : ann.severity === "major" ? "warning" : "outline"}
                                className="text-[9px]"
                              >
                                {ann.severity}
                              </Badge>
                              <Badge variant={ann.status === "open" ? "warning" : "success"} className="text-[9px]">
                                {ann.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">{ann.content}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {format(new Date(ann.created_at), "MMM d, yyyy h:mm a")}
                            </p>
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
            <div>
              <h2 className="text-base font-bold">Defense Schedule</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your scheduled and past defense sessions</p>
            </div>

            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-base font-bold">No Defense Scheduled</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your coordinator will schedule your defense once your manuscript is approved.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((sched) => {
                  const isPast = new Date(sched.scheduled_at) < new Date();
                  return (
                    <Card key={sched.id} className={cn(
                      "rounded-2xl border",
                      sched.status === "scheduled" && !isPast ? "border-primary/30 bg-primary/3" : "border-border"
                    )}>
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground">
                                {(sched.defense_stages as any)?.name || "Defense"}
                              </p>
                              <Badge
                                variant={sched.status === "scheduled" ? "info" : sched.status === "completed" ? "success" : "outline"}
                                className="text-[9px]"
                              >
                                {sched.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-semibold">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(sched.scheduled_at), "MMMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(sched.scheduled_at), "h:mm a")} – {format(new Date(sched.end_at), "h:mm a")}
                              </span>
                              {sched.is_online ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <ExternalLink className="h-3 w-3" />
                                  Online
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {sched.room || "TBD"}, {sched.building || ""}
                                </span>
                              )}
                            </div>
                          </div>
                          {sched.is_online && sched.meeting_url && sched.status === "scheduled" && (
                            <Button size="sm" className="shrink-0 text-xs" asChild>
                              <a href={sched.meeting_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Join Meeting
                              </a>
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

// Local stub for Layers icon (used inline)
function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
