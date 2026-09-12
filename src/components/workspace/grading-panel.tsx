"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  Save, 
  Send, 
  MessageSquare, 
  Check, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  Users,
  CornerDownRight,
  Loader2,
  Sliders,
  CheckCircle2,
  Plus,
  Award,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Crown,
  Calendar,
  GraduationCap,
  Building2,
  ArrowRight,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RubricBuilder, RubricEditorDialog } from "@/components/grading/rubric-builder";
import { computeWeightedScore, deriveScoreLabel } from "@/lib/rubric/scoring";
import { SignatureDialog } from "@/components/workspace/signature-dialog";
import { CertificateDialog } from "@/components/workspace/certificate-dialog";
import { 
  signEvaluationAction, 
  createNewEvaluationVersionAction,
  saveEvaluationDraftAction 
} from "@/lib/evaluations/actions";
import { adviserApproveDocumentAction } from "@/lib/workflow/actions";
import { 
  updateAnnotationStatusAction, 
  createAnnotationReplyAction,
  deleteAnnotationAction 
} from "@/lib/annotations/actions";
import { updateDefenseChairmanRubricAction } from "@/lib/rubrics/actions";
import { useAuth } from "@/hooks/use-auth";
import { ConsensusDashboard } from "@/components/dashboard/consensus-dashboard";

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="shadow-none border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/10 transition-colors"
      >
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function DefenseStageDetailsCard({ projectInfo }: { projectInfo: any }) {
  if (!projectInfo) return null;

  return (
    <div className="space-y-3 pt-1">
      {/* 1. Header: Team Name & Defense Stage */}
      <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {projectInfo.teamName ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-md">
                <Users className="h-3 w-3" />
                {projectInfo.teamName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                <Users className="h-3 w-3" />
                Individual Proponents
              </span>
            )}
            <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
              {projectInfo.academicYear || "AY 2026-2027"}
            </Badge>
          </div>
          <h4 className="text-xs font-bold text-foreground leading-snug">
            {projectInfo.title}
          </h4>
        </div>

        <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
          Stage {projectInfo.stageOrder || 1}: {projectInfo.stageName}
        </Badge>
      </div>

      {/* 2. Research Proponents (All Members) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3 text-primary" />
            Research Proponents ({projectInfo.proponents?.length || 1})
          </span>
        </div>
        <div className="space-y-1">
          {projectInfo.proponents && projectInfo.proponents.length > 0 ? (
            projectInfo.proponents.map((p: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {p.isLeader ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                  <span className="font-bold text-foreground truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.isLeader ? (
                    <Badge variant="warning" className="text-[9px] font-bold px-1.5 py-0">
                      Leader
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] font-semibold text-muted-foreground px-1.5 py-0">
                      Co-Author
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic px-2 py-1">
              {projectInfo.studentName || "No proponents linked"}
            </div>
          )}
        </div>
      </div>

      {/* 3. Research Adviser */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block leading-tight">
              Official Research Adviser
            </span>
            <span className="font-bold text-foreground truncate block">
              {projectInfo.adviser?.name || "Pending Adviser Endorsement"}
            </span>
          </div>
        </div>
        {projectInfo.adviser?.email && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {projectInfo.adviser.email}
          </span>
        )}
      </div>

      {/* 4. Academic Details & Manuscript Status */}
      <dl className="grid gap-2 text-xs pt-1.5 border-t border-border/50">
        <div className="flex justify-between items-center py-0.5">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            Program
          </dt>
          <dd className="font-semibold text-foreground text-right text-[11px] max-w-[65%] truncate">
            {projectInfo.programCode ? `[${projectInfo.programCode}] ` : ""}{projectInfo.program}
          </dd>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Department / College
          </dt>
          <dd className="font-semibold text-foreground text-right text-[11px] max-w-[65%] truncate">
            {projectInfo.department} • {projectInfo.college}
          </dd>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Manuscript Version
          </dt>
          <dd className="font-semibold text-foreground text-right text-[11px]">
            v{projectInfo.versionNumber || 1} ({projectInfo.submittedAt})
          </dd>
        </div>

        <div className="flex justify-between items-center py-0.5">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Defense Schedule
          </dt>
          <dd className="font-semibold text-foreground text-right text-[11px]">
            {projectInfo.schedule ? (
              <span className="text-primary font-bold">
                {projectInfo.schedule.room ? `${projectInfo.schedule.room} • ` : ""}
                {new Date(projectInfo.schedule.scheduledAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">
                Pending Scheduling
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface GradingPanelProps {
  projectId: string;
  stageId: string;
  documentVersionId: string | null;
  annotationRefreshKey?: number;
}

export function GradingPanel({
  projectId,
  stageId,
  documentVersionId,
  annotationRefreshKey = 0,
}: GradingPanelProps) {
  const { user, roles, isLoading: authLoading } = useAuth();
  const isStudent = roles.includes("student") && !roles.some((r) => ["panelist", "adviser", "coordinator", "sys_admin", "college_dean"].includes(r));

  // Role detection state for this project
  const [isProjectAdviser, setIsProjectAdviser] = useState(false);
  const [isProjectPanelist, setIsProjectPanelist] = useState(false);
  const [isCoordinatorObserver, setIsCoordinatorObserver] = useState(false);
  const [isChairman, setIsChairman] = useState(false);

  // Chairman Rubric Customization state
  const [chairmanModalOpen, setChairmanModalOpen] = useState(false);
  const [customCriteria, setCustomCriteria] = useState<any[]>([]);
  const [customPassingScore, setCustomPassingScore] = useState<number>(75);
  const [saveAsDefaultRubric, setSaveAsDefaultRubric] = useState(false);
  const [savingRubric, setSavingRubric] = useState(false);

  // Annotation Scope state (Current Defense Version vs All History)
  const [annotationScope, setAnnotationScope] = useState<"current" | "all">("current");

  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [rubricTemplate, setRubricTemplate] = useState<any>(null);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [verdict, setVerdict] = useState("passed_minor");
  const [notes, setNotes] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const [evalId, setEvalId] = useState<string | null>(null);
  const [evalVersion, setEvalVersion] = useState<number>(1);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [panelistProfile, setPanelistProfile] = useState<any>(null);
  const [signatureDisplayUrl, setSignatureDisplayUrl] = useState<string | null>(null);

  // Adviser Endorsement state
  const [documentData, setDocumentData] = useState<any>(null);
  const [endorsing, setEndorsing] = useState(false);
  const [adviserRemarks, setAdviserRemarks] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function resolveSignatureUrl() {
      if (!evaluationData?.signature_image) {
        setSignatureDisplayUrl(null);
        return;
      }
      const sig = evaluationData.signature_image as string;
      if (sig.startsWith("data:image") || sig.startsWith("http")) {
        setSignatureDisplayUrl(sig);
        return;
      }
      try {
        const cleanPath = sig.replace(/^signatures\//, "").replace(/^\/+/, "");
        const { data } = await supabase.storage.from("signatures").createSignedUrl(cleanPath, 7200);
        if (data?.signedUrl) {
          setSignatureDisplayUrl(data.signedUrl);
        } else {
          setSignatureDisplayUrl(null);
        }
      } catch {
        setSignatureDisplayUrl(null);
      }
    }
    resolveSignatureUrl();
  }, [evaluationData?.signature_image, supabase]);

  const loadData = async () => {
    try {
      setLoading(true);

      const isUUID = (val: unknown) =>
        typeof val === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      const validProjectId = isUUID(projectId) ? projectId : null;
      const validStageId = isUUID(stageId) ? stageId : null;

      if (!validProjectId) {
        setLoading(false);
        return;
      }

      // 1. Fetch project, stage, members, schedule, version, and rubric in parallel
      const stagePromise = validStageId
        ? supabase.from("defense_stages").select("id, name, sequence_order").eq("id", validStageId).maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const membersPromise = supabase
        .from("project_members")
        .select(`
          profile_id,
          member_role,
          is_primary,
          assigned_at,
          profiles:profiles!project_members_profile_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq("project_id", validProjectId)
        .order("assigned_at", { ascending: true });

      const schedulePromise = supabase
        .from("defense_schedules")
        .select("id, scheduled_at, end_at, room, building, is_online, meeting_url, status")
        .eq("project_id", validProjectId)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const versionPromise = documentVersionId
        ? supabase.from("document_versions").select("id, version_number, file_name, created_at").eq("id", documentVersionId).maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [projResult, stageResult, rubricResult, membersResult, scheduleResult, verResult] = await Promise.all([
        supabase
          .from("projects")
          .select(`
            id,
            title,
            team_name,
            academic_year,
            workflow_template_id,
            departments (
              name,
              colleges ( name, code )
            ),
            students (
              program_id,
              programs ( name, code ),
              profiles ( first_name, last_name, email )
            )
          `)
          .eq("id", validProjectId)
          .maybeSingle(),
        stagePromise,
        supabase
          .from("rubric_templates")
          .select("*")
          .eq("project_id", validProjectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        membersPromise,
        schedulePromise,
        versionPromise,
      ]);

      const projData = projResult.data;
      const stageData = stageResult.data;
      let rubricData = rubricResult.data;

      // Resilient fallback: If no project-specific rubric exists, auto-load standard university rubric
      if (!rubricData || !rubricData.criteria || rubricData.criteria.length === 0) {
        const { data: standardTemplate } = await supabase
          .from("rubric_templates")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (standardTemplate && standardTemplate.criteria && standardTemplate.criteria.length > 0) {
          rubricData = standardTemplate;
        } else {
          rubricData = {
            id: "00000000-0000-0000-0000-000000000001",
            title: "Partido State University Academic Defense Rubric",
            passing_score: 75,
            excellent_score: 90,
            criteria: [
              { id: "c1", name: "Technical Rigor & Architecture", weight: 35 },
              { id: "c2", name: "Research Methodology & Execution", weight: 30 },
              { id: "c3", name: "Presentation & Manuscript Quality", weight: 20 },
              { id: "c4", name: "Defense Mastery & Response to Inquiries", weight: 15 },
            ],
          };
        }
      }

      let submittedDate = null;
      let versionNumber = 1;
      if (verResult?.data) {
        submittedDate = new Date(verResult.data.created_at).toLocaleDateString();
        versionNumber = verResult.data.version_number ?? 1;
      }

      if (projData) {
        const rawProj = projData as any;
        const membersList = (membersResult?.data || []) as any[];

        // Extract adviser from project_members
        const adviserMember = membersList.find((m) => m.member_role === "adviser");
        const adviserObj = adviserMember?.profiles
          ? {
              name: `${adviserMember.profiles.first_name} ${adviserMember.profiles.last_name}`,
              email: adviserMember.profiles.email,
            }
          : null;

        // Extract student proponents (exclude advisers and defense panel members)
        const studentMembers = membersList.filter(
          (m) => m.member_role !== "adviser" && !m.member_role?.startsWith("panel_")
        );

        let proponents: Array<{ name: string; email?: string; isLeader: boolean }> = [];
        if (studentMembers.length > 0) {
          proponents = studentMembers.map((m) => ({
            name: m.profiles
              ? `${m.profiles.first_name} ${m.profiles.last_name}`
              : "Group Member",
            email: m.profiles?.email,
            isLeader: m.member_role === "student_leader" || m.is_primary,
          }));
        } else {
          const studentObj = Array.isArray(rawProj.students) ? rawProj.students[0] : rawProj.students;
          const profileObj = studentObj && Array.isArray(studentObj.profiles) ? studentObj.profiles[0] : studentObj?.profiles;
          if (profileObj) {
            proponents = [{
              name: `${profileObj.first_name} ${profileObj.last_name}`,
              email: profileObj.email,
              isLeader: true,
            }];
          }
        }

        const studentObj = Array.isArray(rawProj.students) ? rawProj.students[0] : rawProj.students;
        const programObj = Array.isArray(studentObj?.programs) ? studentObj.programs[0] : studentObj?.programs;
        const deptObj = Array.isArray(rawProj.departments) ? rawProj.departments[0] : rawProj.departments;
        const collegeObj = deptObj && Array.isArray(deptObj.colleges) ? deptObj.colleges[0] : deptObj?.colleges;

        const studentName = proponents.length > 0
          ? proponents[0].name
          : "Unknown Student";

        setProjectInfo({
          title: rawProj.title,
          teamName: rawProj.team_name || null,
          proponents,
          adviser: adviserObj,
          studentName,
          program: programObj?.name || "Information Technology",
          programCode: programObj?.code || "BSIT",
          department: deptObj?.name || "Department of Computational Sciences",
          college: collegeObj?.code || collegeObj?.name || "CEC",
          stageName: stageData?.name || "Defense Stage",
          stageOrder: (stageData as any)?.sequence_order ?? 1,
          academicYear: rawProj.academic_year || "2026-2027",
          submittedAt: submittedDate || "No manuscript uploaded yet",
          versionNumber,
          schedule: scheduleResult?.data ? {
            scheduledAt: scheduleResult.data.scheduled_at,
            room: scheduleResult.data.room,
            building: scheduleResult.data.building,
            isOnline: scheduleResult.data.is_online,
            status: scheduleResult.data.status,
          } : null,
        });
      }

      setRubricTemplate(rubricData);

      // 2. Fetch authenticated user details and project roles
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id;

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .maybeSingle();
        if (profile) {
          setPanelistProfile(profile);
        }

        // Check project-specific role assignments
        const [adviserCheck, panelistCheck] = await Promise.all([
          supabase
            .from("project_members")
            .select("id")
            .eq("project_id", validProjectId)
            .eq("profile_id", userId)
            .eq("member_role", "adviser")
            .maybeSingle(),
          supabase
            .from("defense_panels")
            .select("id, panel_role")
            .eq("project_id", validProjectId)
            .eq("profile_id", userId)
            .maybeSingle(),
        ]);

        if (adviserCheck.data) {
          // Explicitly assigned as Adviser for this project
          // Academic integrity: The adviser cannot evaluate their own advisee
          setIsProjectAdviser(true);
          setIsProjectPanelist(false);
          setIsCoordinatorObserver(false);
          setIsChairman(false);
        } else if (panelistCheck.data) {
          // Explicitly appointed as Panelist for this project/stage
          setIsProjectAdviser(false);
          setIsProjectPanelist(true);
          setIsCoordinatorObserver(false);
          setIsChairman(panelistCheck.data.panel_role === "chair");
        } else {
          // User is neither appointed panelist nor project adviser
          const isCoordinator = roles.includes("coordinator") || roles.includes("sys_admin") || roles.includes("college_dean");
          const isGlobalAdv = roles.includes("adviser") && !isCoordinator;
          setIsProjectAdviser(isGlobalAdv);
          setIsProjectPanelist(false);
          setIsCoordinatorObserver(isCoordinator);
          setIsChairman(false);
        }

        // 3. Fetch active document details for endorsement status
        let docObj: any = null;
        if (documentVersionId) {
          const { data: ver } = await supabase
            .from("document_versions")
            .select("document_id")
            .eq("id", documentVersionId)
            .maybeSingle();
          if (ver?.document_id) {
            const { data: d } = await supabase
              .from("documents")
              .select("*")
              .eq("id", ver.document_id)
              .maybeSingle();
            docObj = d;
          }
        }
        if (!docObj && validProjectId) {
          let docQuery = supabase
            .from("documents")
            .select("*")
            .eq("project_id", validProjectId);
          if (validStageId) {
            docQuery = docQuery.eq("stage_id", validStageId);
          }
          const { data: d } = await docQuery
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          docObj = d;
        }

        if (docObj) {
          setDocumentData(docObj);
          if (docObj.approval_remarks) {
            setAdviserRemarks(docObj.approval_remarks);
          }
        }

        // 4. Fetch existing evaluation for current panelist
        let evalQuery = supabase
          .from("evaluations")
          .select("*")
          .eq("project_id", validProjectId)
          .eq("panelist_id", userId);

        if (validStageId) {
          evalQuery = evalQuery.eq("stage_id", validStageId);
        }

        const { data: evalData } = await evalQuery
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        const initialScores: Record<string, number> = {};
        if (rubricData?.criteria) {
          rubricData.criteria.forEach((c: any) => {
            const key = c.id || c.name;
            initialScores[key] = 75;
          });
        }

        if (evalData) {
          setEvalId(evalData.id);
          setEvalVersion(evalData.version || 1);
          setEvalStatus(evalData.status);
          setVerdict(evalData.verdict_code || "passed_minor");
          setNotes(evalData.panel_notes || "");
          setRecommendations(evalData.recommendations || "");
          setEvaluationData(evalData);

          if (evalData.rubric_template_id && evalData.rubric_template_id !== rubricData?.id) {
            const { data: histRubric } = await supabase
              .from("rubric_templates")
              .select("*")
              .eq("id", evalData.rubric_template_id)
              .maybeSingle();
            if (histRubric) {
              setRubricTemplate(histRubric);
            }
          }
          
          if (evalData.scores) {
            setScores({ ...initialScores, ...evalData.scores });
          } else {
            setScores(initialScores);
          }
        } else {
          setEvalId(null);
          setEvalVersion(1);
          setEvalStatus(null);
          setEvaluationData(null);
          setScores(initialScores);
        }
      }
    } catch (err) {
      console.error("Error loading workspace details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    try {
      const targetVersionIds: string[] = [];
      const verMap: Record<string, number> = {};

      if (documentVersionId) {
        targetVersionIds.push(documentVersionId);
      }

      // If scope is "all", resolve all document versions for this project/stage so historical comments are included
      if (annotationScope === "all") {
        let docId = documentData?.id;
        if (!docId && projectId) {
          const isUUID = (val: unknown) =>
            typeof val === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
          const validProjId = isUUID(projectId) ? projectId : null;
          if (validProjId) {
            const { data: docRes } = await supabase
              .from("documents")
              .select("id")
              .eq("project_id", validProjId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            docId = docRes?.id;
          }
        }

        if (docId) {
          const { data: verList } = await supabase
            .from("document_versions")
            .select("id, version_number")
            .eq("document_id", docId)
            .order("version_number", { ascending: true });

          if (verList && verList.length > 0) {
            verList.forEach((v: any) => {
              verMap[v.id] = v.version_number;
              if (!targetVersionIds.includes(v.id)) {
                targetVersionIds.push(v.id);
              }
            });
          }
        }
      }

      if (targetVersionIds.length === 0) {
        setAnnotations([]);
        return;
      }

      const { data, error } = await supabase
        .from("annotations")
        .select(`
          id,
          document_version_id,
          page_number,
          type,
          coordinates,
          selected_text,
          content,
          severity,
          status,
          created_by,
          created_at,
          profiles:profiles!annotations_created_by_fkey ( first_name, last_name ),
          annotation_replies (
            id,
            annotation_id,
            content,
            created_by,
            created_at,
            profiles:profiles!annotation_replies_created_by_fkey ( first_name, last_name )
          ),
          annotation_history (
            id,
            from_status,
            to_status,
            notes,
            changed_at,
            profiles:profiles!annotation_history_changed_by_fkey ( first_name, last_name )
          )
        `)
        .in("document_version_id", targetVersionIds)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        const sorted = data.map((ann: any) => {
          const profileObj = Array.isArray(ann.profiles) ? ann.profiles[0] : ann.profiles;
          if (ann.annotation_replies) {
            ann.annotation_replies.sort(
              (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          if (ann.annotation_history) {
            ann.annotation_history.sort(
              (a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
            );
          }
          return {
            ...ann,
            version_number: verMap[ann.document_version_id] || 1,
            profiles: profileObj,
          };
        });
        setAnnotations(sorted);
      }
    } catch (err: any) {
      console.error("Error loading annotations detailed:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        error: err
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, stageId, documentVersionId]);

  useEffect(() => {
    loadAnnotations();

    let channel: any = null;
    try {
      const channelUnique = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const channelName = `workspace-annotations-grading-${documentVersionId || projectId}-${channelUnique}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "annotations",
          },
          () => {
            loadAnnotations();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "annotation_replies",
          },
          () => {
            loadAnnotations();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "documents",
          },
          (payload: any) => {
            if (payload.new && (payload.new.id === documentData?.id || payload.new.project_id === projectId)) {
              setDocumentData(payload.new);
              loadAnnotations();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "document_versions",
          },
          () => {
            loadAnnotations();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
          },
          (payload: any) => {
            if (payload.new && payload.new.profile_id === user?.id) {
              const notif = payload.new;
              if (notif.type === "revision_requested" || notif.metadata?.event_type === "revision_required") {
                toast.error(notif.title || "Revisions Requested", {
                  description: notif.message,
                  duration: 8000,
                });
              } else if (notif.type === "document_approved") {
                toast.success(notif.title || "Manuscript Approved", {
                  description: notif.message,
                  duration: 8000,
                });
              } else {
                toast.info(notif.title || "New Notification", {
                  description: notif.message,
                  duration: 6000,
                });
              }
              loadData();
            }
          }
        );

      channel.subscribe();
    } catch (err) {
      console.warn("[GradingPanel] Realtime subscription init error:", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [documentVersionId, annotationRefreshKey, annotationScope]);

  const weightedScore = useMemo(() => {
    if (!rubricTemplate?.criteria) return 0;
    return computeWeightedScore(rubricTemplate.criteria, scores);
  }, [rubricTemplate, scores]);

  const scoreLabel = useMemo(() => {
    if (!rubricTemplate) return "failing" as const;
    return deriveScoreLabel(weightedScore, {
      passing_score: rubricTemplate.passing_score,
      excellent_score: rubricTemplate.excellent_score,
    });
  }, [rubricTemplate, weightedScore]);

  const handleUpdateAnnotationStatus = async (annotationId: string, newStatus: string) => {
    try {
      setSaving(true);
      await updateAnnotationStatusAction({
        annotationId,
        newStatus: newStatus as any,
      });

      const eventType = newStatus === "verified" ? "annotation_verified" : "annotation_updated";
      
      await supabase.from("evaluation_events").insert({
        project_id: projectId,
        stage_id: stageId,
        event_type: eventType,
        payload: {
          annotation_id: annotationId,
          status: newStatus,
        },
      });

      toast.success(`Comment status set to "${newStatus}"`);
      await loadAnnotations();
    } catch (err: any) {
      console.error("Error updating annotation status:", err);
      toast.error(err.message || "Error updating status");
    } finally {
      setSaving(false);
    }
  };

  const handleAddReply = async (annotationId: string) => {
    const text = replyTexts[annotationId]?.trim();
    if (!text) return;

    setReplyingId(annotationId);
    try {
      await createAnnotationReplyAction(annotationId, text);
      setReplyTexts(prev => ({ ...prev, [annotationId]: "" }));
      setActiveReplyId(null);
      toast.success("Reply added successfully!");
      loadAnnotations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add reply";
      console.error("Error adding reply:", err);
      toast.error(`Failed to add reply: ${msg}`);
    } finally {
      setReplyingId(null);
    }
  };

  const handleAdviserEndorsement = async (status: "approved" | "rejected") => {
    if (!documentData?.id) {
      toast.error("No manuscript document found for this project stage.");
      return;
    }

    try {
      setEndorsing(true);
      await adviserApproveDocumentAction(
        documentData.id,
        status,
        adviserRemarks || (status === "approved" ? "Endorsed for defense by research adviser." : "Revisions required.")
      );

      toast.success(
        status === "approved"
          ? "Manuscript endorsed for defense! Project is now eligible for defense scheduling."
          : "Revisions requested. Student authors have been notified."
      );

      const { data: updatedDoc } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentData.id)
        .maybeSingle();

      if (updatedDoc) {
        setDocumentData(updatedDoc);
      }
    } catch (err: any) {
      console.error("Error submitting adviser endorsement:", err);
      toast.error(err?.message || "Failed to submit adviser endorsement.");
    } finally {
      setEndorsing(false);
    }
  };

  const handleSaveEvaluation = async (submitStatus: "draft" | "submitted") => {
    if (!rubricTemplate) {
      toast.error("No rubric template loaded.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id;
      if (!userId) {
        toast.error("You must be logged in to evaluate.");
        return;
      }

      let targetRubricId = rubricTemplate.id;
      if (targetRubricId === "00000000-0000-0000-0000-000000000001") {
        const { data: createdRubric, error: rubErr } = await supabase
          .from("rubric_templates")
          .insert({
            project_id: projectId,
            title: rubricTemplate.title,
            passing_score: rubricTemplate.passing_score || 75,
            excellent_score: rubricTemplate.excellent_score || 90,
            criteria: rubricTemplate.criteria,
          })
          .select()
          .maybeSingle();

        if (!rubErr && createdRubric) {
          targetRubricId = createdRubric.id;
          setRubricTemplate(createdRubric);
        } else {
          targetRubricId = null;
        }
      }

      const evalData = await saveEvaluationDraftAction({
        projectId,
        stageId,
        rubricTemplateId: targetRubricId,
        scores,
        totalScore: weightedScore,
        verdictCode: verdict,
        panelNotes: notes,
        recommendations,
        version: evalVersion,
      });

      setEvalId(evalData.id);
      setEvalStatus(evalData.status);
      setEvaluationData(evalData);

      if (submitStatus === "submitted") {
        setSignatureDialogOpen(true);
      } else {
        toast.success("Evaluation draft saved successfully!");
      }
    } catch (err: any) {
      console.error("Error saving evaluation:", err);
      toast.error(`Error saving evaluation: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignComplete = async (sig: {
    signatureType: "drawn" | "typed" | "uploaded";
    signatureImage: string;
    printedName: string;
    positionRole: string;
    password: string;
  }) => {
    if (!evalId) {
      toast.error("Save your draft evaluation first.");
      return;
    }

    try {
      toast.loading("Verifying credentials & securing signature under RA 8792...");
      const updated = await signEvaluationAction({
        evaluationId: evalId,
        signatureType: sig.signatureType,
        signatureImage: sig.signatureImage,
        printedName: sig.printedName,
        positionRole: sig.positionRole,
        password: sig.password,
        scores,
        totalScore: weightedScore,
        verdictCode: verdict,
        panelNotes: notes,
        recommendations,
      });

      toast.dismiss();
      toast.success("Verified electronic signature applied successfully!");
      setEvalStatus(updated.status);
      setEvaluationData(updated);
      setEvalVersion(updated.version);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to submit signature.");
    }
  };

  const handleCreateNewVersion = async () => {
    try {
      setSaving(true);
      toast.loading("Creating new evaluation version...");
      const newEval = await createNewEvaluationVersionAction(projectId, stageId);
      
      toast.dismiss();
      toast.success(`Evaluation version v${newEval.version} created!`);
      setEvalId(newEval.id);
      setEvalVersion(newEval.version);
      setEvalStatus(newEval.status);
      setVerdict(newEval.verdict_code || "passed_minor");
      setNotes(newEval.panel_notes || "");
      setRecommendations(newEval.recommendations || "");
      setEvaluationData(newEval);
      if (newEval.scores) {
        setScores(newEval.scores);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to create new version.");
    } finally {
      setSaving(false);
    }
  };

  const verdicts = [
    { value: "passed", label: "Passed" },
    { value: "passed_minor", label: "Passed with Minor Revisions" },
    { value: "passed_major", label: "Passed with Major Revisions" },
    { value: "failed", label: "Failed" },
  ];

  const renderAnnotationsList = (canVerify: boolean) => {
    const rawRemarks = documentData?.approval_remarks?.trim() || "";
    const isEndorsementBoilerplate = 
      rawRemarks.toLowerCase().includes("endorsed for defense") || 
      rawRemarks.toLowerCase().includes("adviser validation review") ||
      rawRemarks.toLowerCase() === "endorsed for defense by research adviser.";
    const hasAdviserRemarks = Boolean(rawRemarks) && !isEndorsementBoilerplate;

    if (!hasAdviserRemarks && annotations.length === 0) {
      return (
        <div className="space-y-3">
          {/* Annotation Version Scoping Filter */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50 text-[11px]">
            <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
              Scope: {annotationScope === "current" ? `Version ${projectInfo?.versionNumber || 1} (Active Defense)` : "All Version History"}
            </span>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 text-[10px]">
              <button
                type="button"
                onClick={() => setAnnotationScope("current")}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  annotationScope === "current" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Current Version
              </button>
              <button
                type="button"
                onClick={() => setAnnotationScope("all")}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  annotationScope === "all" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All History
              </button>
            </div>
          </div>

          <div className="text-center py-6 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border p-4">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/60" />
            <p className="font-semibold text-foreground">No open comments on this version</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No revision notes or annotations have been left on this manuscript version yet.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Annotation Version Scoping Filter */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50 text-[11px]">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
            Scope: {annotationScope === "current" ? `Version ${projectInfo?.versionNumber || 1} (Active Defense)` : "All Version History"}
          </span>
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 text-[10px]">
            <button
              type="button"
              onClick={() => setAnnotationScope("current")}
              className={cn(
                "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                annotationScope === "current" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Current Version
            </button>
            <button
              type="button"
              onClick={() => setAnnotationScope("all")}
              className={cn(
                "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                annotationScope === "all" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All History
            </button>
          </div>
        </div>

        {/* Pinned Official Adviser Revision Directives */}
        {hasAdviserRemarks && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/25 p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center shrink-0">
                  {projectInfo?.adviser?.first_name?.[0] || "A"}{projectInfo?.adviser?.last_name?.[0] || "D"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">
                      {projectInfo?.adviser ? `${projectInfo.adviser.first_name} ${projectInfo.adviser.last_name}` : "Faculty Adviser"}
                    </span>
                    <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold">
                      Adviser Directives
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {documentData?.adviser_approval_status === "rejected" ? "Mandatory Revision Requirements" : "Adviser Review Feedback"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                {documentData?.updated_at ? new Date(documentData.updated_at).toLocaleDateString() : "Latest"}
              </span>
            </div>

            <div className="bg-card/90 dark:bg-card/70 rounded-lg p-2.5 border border-border/60">
              <p className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                {documentData.approval_remarks}
              </p>
            </div>
          </div>
        )}

        {/* Subheader when remarks and annotations both exist */}
        {hasAdviserRemarks && annotations.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Inline Manuscript Annotations ({annotations.length})
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
        )}

        {/* Notice when there are remarks but no inline highlights */}
        {hasAdviserRemarks && annotations.length === 0 && (
          <div className="text-center py-3.5 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/70 p-3">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500/70" />
            <p className="font-semibold text-foreground text-[11px]">No page-specific inline text highlights</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              The adviser provided overarching revision requirements above. Authors should review and address these directives.
            </p>
          </div>
        )}

        {/* Annotations List */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className="rounded-xl border border-border p-3.5 space-y-3 bg-card shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant={
                    ann.severity === "critical"
                      ? "danger"
                      : ann.severity === "major"
                        ? "warning"
                        : ann.severity === "minor"
                          ? "info"
                          : "outline"
                  }
                  className="capitalize text-[10px] px-2 py-0.5 font-bold"
                >
                  Page {ann.page_number} • {ann.severity}
                </Badge>
                {ann.version_number && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-muted/40 border-border">
                    Draft v{ann.version_number}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={ann.status}
                  onChange={(e) => handleUpdateAnnotationStatus(ann.id, e.target.value)}
                  className={cn(
                    "text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-1 focus:outline-none transition-colors cursor-pointer",
                    ann.status === "verified" && "text-emerald-700 bg-emerald-50 border-emerald-200",
                    ann.status === "addressed" && "text-teal-700 bg-teal-50 border-teal-200",
                    ann.status === "in_progress" && "text-amber-700 bg-amber-50 border-amber-200",
                    ann.status === "open" && "text-rose-700 bg-rose-50 border-rose-200",
                    ann.status === "resolved" && "text-sky-700 bg-sky-50 border-sky-200",
                    ann.status === "closed" && "text-slate-700 bg-slate-50 border-slate-200"
                  )}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="addressed">Addressed</option>
                  {canVerify && (
                    <>
                      <option value="verified">Verified</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  )}
                </select>

                {(ann.created_by === user?.id || roles.includes("coordinator") || roles.includes("sys_admin") || isProjectPanelist || isProjectAdviser) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this comment?")) return;
                      try {
                        await deleteAnnotationAction(ann.id);
                        toast.success("Comment deleted");
                        loadAnnotations();
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to delete comment");
                      }
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                    title="Delete Comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                <span className="text-foreground font-bold">
                  {ann.profiles ? `${ann.profiles.first_name} ${ann.profiles.last_name}` : "Reviewer"}
                </span>
                <span>{new Date(ann.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed font-medium">
                {ann.content}
              </p>
            </div>

            {/* Replies List */}
            {ann.annotation_replies && ann.annotation_replies.length > 0 && (
              <div className="pl-3 border-l-2 border-border/80 space-y-2 mt-2">
                {ann.annotation_replies.map((reply: any) => (
                  <div key={reply.id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                      <span className="text-foreground flex items-center gap-1 font-bold">
                        <CornerDownRight className="h-3 w-3 inline text-muted-foreground" />
                        {reply.profiles ? `${reply.profiles.first_name} ${reply.profiles.last_name}` : "User"}
                      </span>
                      <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-4 bg-muted/10 rounded-lg py-1 px-2.5 font-medium leading-relaxed">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Status History */}
            {ann.annotation_history && ann.annotation_history.length > 0 && (
              <div className="pl-3 border-l-2 border-primary/20 space-y-1.5 mt-2 bg-primary/5 p-2 rounded-r-lg border-y border-r border-primary/10">
                <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Status History</p>
                {ann.annotation_history.map((hist: any) => {
                  const changerName = hist.profiles
                    ? Array.isArray(hist.profiles)
                      ? `${hist.profiles[0]?.first_name} ${hist.profiles[0]?.last_name}`
                      : `${hist.profiles.first_name} ${hist.profiles.last_name}`
                    : "User";
                  return (
                    <div key={hist.id} className="text-[10px] text-slate-700 leading-relaxed font-sans">
                      <span className="font-bold text-slate-900">{changerName}</span> marked as{" "}
                      <span className="font-extrabold capitalize text-primary">{hist.to_status}</span>
                      <span className="text-[9px] text-muted-foreground ml-1.5">
                        ({new Date(hist.changed_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })})
                      </span>
                      {hist.notes && (
                        <p className="text-[9px] text-muted-foreground italic pl-2 mt-0.5">"{hist.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply Textarea */}
            <div className="pt-1">
              {activeReplyId === ann.id ? (
                <div className="space-y-2">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyTexts[ann.id] || ""}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({
                        ...prev,
                        [ann.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                    rows={2}
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] px-2.5 rounded-lg text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        setActiveReplyId(null);
                        setReplyTexts((prev) => ({ ...prev, [ann.id]: "" }));
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[10px] px-3 rounded-lg"
                      onClick={() => handleAddReply(ann.id)}
                      disabled={replyingId === ann.id || !replyTexts[ann.id]?.trim()}
                    >
                      {replyingId === ann.id ? "Adding..." : "Reply"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveReplyId(ann.id)}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  Reply to feedback
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card p-6 text-sm text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span>Loading evaluation workspace...</span>
      </div>
    );
  }

  // ========================================================
  // VIEW 0: INSTITUTIONAL COORDINATOR / DEAN OVERSIGHT PANEL
  // ========================================================
  if (isCoordinatorObserver && !isProjectPanelist && !isProjectAdviser) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {/* Institutional Coordinator Banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Institutional Coordinator Oversight Mode
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You are viewing this review workspace with institutional monitoring and oversight privileges. Under academic defense guidelines, evaluation scoring is strictly reserved for appointed panel members. You can review all manuscript annotations, deliberation consensus, and adviser endorsement below.
            </p>
          </div>

          {/* Adviser Endorsement Status */}
          <Card className="border border-border bg-card shadow-xs rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Adviser Endorsement Gate
              </span>
              {documentData?.adviser_approval_status === "approved" ? (
                <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Endorsed for Defense
                </Badge>
              ) : documentData?.adviser_approval_status === "rejected" ? (
                <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <AlertCircle className="h-3 w-3" /> Revisions Requested
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Under Consultation
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {documentData?.adviser_approval_status === "approved"
                ? "The research adviser has endorsed this manuscript for defense."
                : documentData?.adviser_approval_status === "rejected"
                  ? `Revisions requested by adviser: ${documentData.approval_remarks || "Awaiting student address."}`
                  : "Manuscript is undergoing adviser consultation and has not been endorsed yet."}
            </p>
          </Card>

          {/* Panel Consensus & Discrepancy Analytics */}
          {projectId && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Panel Deliberation &amp; Consensus Metrics</span>
              </div>
              <ConsensusDashboard projectId={projectId} />
            </div>
          )}

          {/* Rubric Criteria Overview (Read-Only) */}
          {rubricTemplate && (
            <Card className="border border-border bg-card shadow-xs rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{rubricTemplate.title}</h4>
                  <p className="text-[10px] text-muted-foreground">Passing threshold: {rubricTemplate.passing_score ?? 75}%</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Evaluation Rubric</Badge>
              </div>
              <div className="space-y-2">
                {(rubricTemplate.criteria || []).map((c: any) => (
                  <div key={c.id || c.name} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-b-0">
                    <span className="text-foreground font-medium">{c.name}</span>
                    <span className="text-muted-foreground font-bold">{c.weight}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Review Annotations Summary */}
          <CollapsibleSection title={`Reviewer Annotations & Remarks (${annotations.length})`}>
            {annotations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No annotations recorded on this manuscript version yet.</p>
            ) : (
              <div className="space-y-2.5">
                {annotations.map((ann) => (
                  <div key={ann.id} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {ann.profiles ? `${ann.profiles.first_name} ${ann.profiles.last_name}` : "Reviewer"}
                      </span>
                      <Badge variant={ann.severity === "critical" ? "danger" : ann.severity === "major" ? "warning" : "outline"} className="text-[9px]">
                        {ann.severity}
                      </Badge>
                    </div>
                    {ann.selected_text && (
                      <p className="text-[11px] italic text-foreground bg-muted/40 p-1 rounded font-semibold">&ldquo;{ann.selected_text}&rdquo;</p>
                    )}
                    <p className="text-foreground text-xs leading-relaxed">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>
      </ScrollArea>
    );
  }

  // ==========================================
  // VIEW 1: RESEARCH ADVISER CONSULTATION PANEL
  // ==========================================
  if (isProjectAdviser && !isProjectPanelist) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {/* Paperless Consultation Banner */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Paperless Manuscript Consultation
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              As the Research Adviser, you mentor advisees paperlessly. Review and annotate drafts directly in this split-screen workspace without printing manuscripts. When ready, endorse the manuscript for defense.
            </p>
          </div>

          {/* Adviser Defense Endorsement Gate Card */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Defense Endorsement Gate</span>
                </div>
                {documentData?.adviser_approval_status === "approved" ? (
                  <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" /> Endorsed for Defense
                  </Badge>
                ) : documentData?.adviser_approval_status === "rejected" ? (
                  <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px]">
                    <AlertCircle className="h-3 w-3" /> Revisions Requested
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Under Consultation
                  </Badge>
                )}
              </div>

              {/* Status Alert Banner */}
              {documentData?.adviser_approval_status === "rejected" ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">Revisions Actively Pending from Authors</p>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      You requested revisions on this manuscript. Student authors have been notified and must resolve your inline comments before submitting an updated revision. <strong>Endorsement for defense is locked</strong> until authors upload a revised manuscript.
                    </p>
                  </div>
                </div>
              ) : documentData?.adviser_approval_status === "approved" ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">Manuscript Officially Endorsed</p>
                    <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                      This manuscript has been approved and endorsed for defense. The defense coordinator is authorized to schedule oral defense deliberations.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Review the manuscript annotations and student responses below. When satisfied with the quality, endorse the manuscript to unlock defense scheduling.
                </p>
              )}

              <div className="space-y-1.5 pt-1">
                <label htmlFor="adviser-remarks" className="text-xs font-semibold text-foreground">
                  Adviser Consultation Remarks / Endorsement Notes
                </label>
                <textarea
                  id="adviser-remarks"
                  placeholder="Provide guidance notes, revision instructions, or endorsement commendations..."
                  value={adviserRemarks}
                  onChange={(e) => setAdviserRemarks(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-1">
                {documentData?.adviser_approval_status === "rejected" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={endorsing || !documentData?.id}
                      onClick={() => handleAdviserEndorsement("rejected")}
                      className="flex-1 text-xs h-9 rounded-xl border-amber-300 text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      {endorsing ? "Saving..." : "Update Revision Notes"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={true}
                      className="flex-1 text-xs h-9 rounded-xl bg-muted text-muted-foreground border border-border/70 cursor-not-allowed opacity-60"
                      title="Endorsement is locked because revisions are currently requested. Authors must upload a revised manuscript."
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Endorsement Locked
                    </Button>
                  </>
                ) : documentData?.adviser_approval_status === "approved" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={endorsing || !documentData?.id}
                      onClick={() => {
                        if (confirm("Are you sure you want to withdraw defense endorsement and request revisions on this manuscript?")) {
                          handleAdviserEndorsement("rejected");
                        }
                      }}
                      className="flex-1 text-xs h-9 rounded-xl border-border text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      Withdraw Endorsement
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={true}
                      className="flex-1 text-xs h-9 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Endorsed for Defense
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={endorsing || !documentData?.id}
                      onClick={() => handleAdviserEndorsement("rejected")}
                      className="flex-1 text-xs h-9 rounded-xl border-border text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      {endorsing ? "Submitting..." : "Request Revisions"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={endorsing || !documentData?.id}
                      onClick={() => handleAdviserEndorsement("approved")}
                      className="flex-1 text-xs h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {endorsing ? "Endorsing..." : "Endorse for Defense"}
                    </Button>
                  </>
                )}
              </div>

              {documentData?.adviser_approval_status === "rejected" && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to bypass the revision requirement and endorse this manuscript for defense now?")) {
                        handleAdviserEndorsement("approved");
                      }
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
                  >
                    Override &amp; endorse now anyway
                  </button>
                </div>
              )}
            </div>

            {/* Institutional separation note */}
            <div className="bg-muted/40 border-t border-border/60 p-3 flex items-start gap-2 text-[10px] text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Academic Separation of Duties:</strong> As the research adviser, your role is mentorship, manuscript refinement, and defense readiness endorsement. Formal 100-point rubric scoring, criteria weight evaluation, and defense verdicts are independently conducted by assigned defense panelists during the scheduled defense.
              </span>
            </div>
          </Card>

          {/* Defense Stage Details */}
          {projectInfo && (
            <CollapsibleSection title="Defense Stage Details" defaultOpen={true}>
              <DefenseStageDetailsCard projectInfo={projectInfo} />
            </CollapsibleSection>
          )}

          {/* Inline Annotations & Discussions */}
          <CollapsibleSection title={`Manuscript Comments & Revision Discussions (${annotations.length + (documentData?.approval_remarks?.trim() ? 1 : 0)})`} defaultOpen={true}>
            <div className="pt-1">
              {renderAnnotationsList(true)}
            </div>
          </CollapsibleSection>
        </div>
      </ScrollArea>
    );
  }

  // ==========================================
  // VIEW 2: STUDENT FEEDBACK & CONSULTATION PANEL
  // ==========================================
  if (isStudent) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {/* Header Banner for Student */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="h-4 w-4" />
              Reviewer Suggestions &amp; Feedback
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Review highlighted annotations and comments from your defense panel and adviser. You can track progress, view requested revisions, and reply directly to feedback items.
            </p>
          </div>

          {/* Adviser Endorsement Status Card */}
          <Card className="border border-border bg-card shadow-none rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Adviser Endorsement
              </span>
              {documentData?.adviser_approval_status === "approved" ? (
                <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Endorsed for Defense
                </Badge>
              ) : documentData?.adviser_approval_status === "rejected" ? (
                <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px]">
                  <AlertCircle className="h-3 w-3" /> Revisions Requested
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Under Consultation
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {documentData?.adviser_approval_status === "approved"
                ? "Your adviser has endorsed this manuscript for defense. It is eligible for defense scheduling."
                : documentData?.adviser_approval_status === "rejected"
                  ? `Revisions requested: ${documentData.approval_remarks || "Please review comments and update your draft."}`
                  : "Your manuscript is currently under paperless consultation review with your adviser."}
            </p>
            {documentData?.approval_remarks && documentData?.adviser_approval_status === "approved" && (
              <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[10px] text-emerald-900">
                <span className="font-bold">Adviser note:</span> {documentData.approval_remarks}
              </div>
            )}
            {documentData?.adviser_approval_status === "approved" && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-500/20 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  What Happens Next:
                </p>
                <div className="grid gap-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">1.</span>
                    <span>Defense Coordinator assigns your 3-member panel &amp; confirms room/slot.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">2.</span>
                    <span>Prepare 15-minute presentation slides using the 100-point rubric breakdown.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">3.</span>
                    <span>Review all resolved comments in this viewer to be ready for panel Q&amp;A defense.</span>
                  </div>
                </div>
                <div className="pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 cursor-pointer" asChild>
                    <Link href="/dashboard/my-project">
                      <span>View Defense Roadmap &amp; Clearance Slip</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            {documentData?.approval_remarks && documentData?.adviser_approval_status === "rejected" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Adviser Revision Requirements:</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap font-medium pl-5">{documentData.approval_remarks}</p>
              </div>
            )}
          </Card>

          {/* Section 1: Annotations & Discussions */}
          <CollapsibleSection title={`Inline Annotations & Comments (${annotations.length + (documentData?.approval_remarks?.trim() ? 1 : 0)})`} defaultOpen={true}>
            <div className="pt-1">
              {renderAnnotationsList(false)}
            </div>
          </CollapsibleSection>

          {/* Section 2: Defense Information */}
          {projectInfo && (
            <CollapsibleSection title="Defense Stage Details" defaultOpen={true}>
              <DefenseStageDetailsCard projectInfo={projectInfo} />
            </CollapsibleSection>
          )}

          {/* Section 3: Evaluation Verdict & Recommendations */}
          {evaluationData && (
            <CollapsibleSection title="Panel Evaluation Feedback" defaultOpen={true}>
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="font-medium text-muted-foreground">Evaluation Status</span>
                  <Badge variant={evaluationData.status === "submitted" ? "success" : "warning"} className="capitalize text-[10px]">
                    {evaluationData.status}
                  </Badge>
                </div>
                {evaluationData.verdict_code && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                    <span className="font-medium text-muted-foreground">Verdict</span>
                    <Badge variant="info" className="capitalize text-[10px] font-bold">
                      {evaluationData.verdict_code.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
                {evaluationData.recommendations && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Recommendations</p>
                    <p className="text-xs text-foreground leading-relaxed">{evaluationData.recommendations}</p>
                  </div>
                )}
                {evaluationData.panel_notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Panelist Notes</p>
                    <p className="text-xs text-foreground leading-relaxed">{evaluationData.panel_notes}</p>
                  </div>
                )}
                {evaluationData.certificate_serial && (
                  <button
                    onClick={() => setCertificateDialogOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 py-2 text-xs font-bold hover:bg-emerald-500/15 transition-all"
                  >
                    <Award className="h-3.5 w-3.5" /> View Digital Defense Certificate ({evaluationData.certificate_serial})
                  </button>
                )}
              </div>
            </CollapsibleSection>
          )}

          <CertificateDialog
            open={certificateDialogOpen}
            onOpenChange={setCertificateDialogOpen}
            evaluation={evaluationData}
            projectTitle={projectInfo?.title || "Research Project"}
            stageName={projectInfo?.defense_stages?.name || "Defense Stage"}
            panelistName={evaluationData?.printed_name || (panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : "Panelist")}
          />
        </div>
      </ScrollArea>
    );
  }

  // ==========================================
  // VIEW 3: DEFENSE PANELIST RUBRIC GRADING SHEET
  // ==========================================
  if (!rubricTemplate) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Sliders className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No grading rubric defined</h3>
        <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto mb-6">
          Before you can start grading this defense manuscript, you need to configure a custom grading rubric template for this project.
        </p>
        <RubricBuilder onRubricCreated={loadData} projectId={projectId} />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Section A - Defense Information */}
        {projectInfo && (
          <CollapsibleSection title="Section A — Defense Information" defaultOpen={true}>
            <DefenseStageDetailsCard projectInfo={projectInfo} />
          </CollapsibleSection>
        )}

        {/* Section B - Rubric Grading */}
        <CollapsibleSection title="Section B — Rubric Grading">
          <div className="space-y-5 pt-1">
            {/* Status bar */}
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Evaluation Status:</span>
                {evalStatus === "submitted" ? (
                  <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-[10px]">
                    <Check className="h-3 w-3" /> Submitted
                  </Badge>
                ) : evalStatus === "draft" ? (
                  <Badge variant="warning" className="gap-1 px-2.5 py-0.5 text-[10px]">
                    <Clock className="h-3 w-3" /> Draft
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground px-2.5 py-0.5 text-[10px]">
                    Unevaluated
                  </Badge>
                )}
              </div>

              {/* Chairman Rubric Customizer Button (Item 2: Restricted to Chairman or Coordinator/Admin) */}
              {evalStatus !== "submitted" && (
                isChairman || roles.includes("coordinator") || roles.includes("sys_admin") ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] gap-1.5 font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    onClick={() => {
                      setCustomCriteria(
                        (rubricTemplate?.criteria || []).map((c: any) => ({
                          id: c.id || c.name,
                          name: c.name,
                          description: c.description || "",
                          weight: Number(c.weight || 0),
                        }))
                      );
                      setCustomPassingScore(rubricTemplate?.passing_score ?? 75);
                      setChairmanModalOpen(true);
                    }}
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    Rubric Settings (Chairman)
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground border-border bg-muted/20 gap-1">
                    <ShieldCheck className="h-3 w-3" /> Rubric Set by Chairman
                  </Badge>
                )
              )}
            </div>

            {/* Criteria list */}
            <div className="space-y-4">
              {rubricTemplate.criteria && rubricTemplate.criteria.map((criterion: any) => {
                const key = criterion.id || criterion.name;
                const scoreValue = scores[key] ?? 0;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{criterion.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Weight: {criterion.weight}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={scores[key] ?? ""}
                          disabled={evalStatus === "submitted"}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value)));
                            setScores((s) => ({
                              ...s,
                              [key]: val,
                            }));
                          }}
                          className="h-7 w-12 rounded-lg border border-border bg-card text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                        />
                        <span className="text-[10px] text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={scoreValue}
                        disabled={evalStatus === "submitted"}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScores((s) => ({
                            ...s,
                            [key]: val,
                          }));
                        }}
                        className="h-1 flex-1 rounded bg-muted accent-primary cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground w-6 text-right">
                        {scoreValue}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-border/60" />

            {/* Weighted Score Display */}
            <div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-primary">Weighted score</span>
                </div>
                <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>Pass: {rubricTemplate.passing_score}</span>
                  <span>•</span>
                  <span>Excel: {rubricTemplate.excellent_score}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">
                  {weightedScore.toFixed(1)}
                </span>
                <div className="text-[9px] mt-0.5 font-semibold">
                  {scoreLabel === "excellent" ? (
                    <Badge variant="success" className="px-1.5 py-0">Excellent</Badge>
                  ) : scoreLabel === "passing" ? (
                    <Badge variant="warning" className="px-1.5 py-0">Passing</Badge>
                  ) : (
                    <Badge variant="danger" className="px-1.5 py-0">Failing</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Notes & Recommendations */}
            <div className="space-y-3 pt-1">
              {/* Live Synchronized Manuscript Markups (Item 5) */}
              {annotations.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Manuscript Markups & Observations ({annotations.length})
                    </span>
                    {evalStatus !== "submitted" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer font-bold"
                        onClick={() => {
                          const compiled = annotations
                            .map((a) => {
                              const textSnippet = a.selected_text ? ` on "${a.selected_text.trim()}":` : "";
                              return `• [Page ${a.page_number}]${textSnippet} ${a.content}`;
                            })
                            .join("\n");
                          setRecommendations((prev) => (prev ? `${prev}\n${compiled}` : compiled));
                          toast.success("All markups synchronized to recommendations!");
                        }}
                      >
                        Sync All to Recommendations
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Inline highlights and page comments made on the PDF manuscript are listed below. Click &quot;+ Append&quot; to insert individual points into your official evaluation recommendations.
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {annotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-card border border-border/50 text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold">
                              Page {ann.page_number}
                            </Badge>
                            {ann.selected_text && (
                              <span className="text-[10px] text-muted-foreground italic truncate max-w-[170px]">
                                &ldquo;{ann.selected_text}&rdquo;
                              </span>
                            )}
                          </div>
                          <p className="text-foreground font-medium mt-0.5 text-[11px] line-clamp-2">
                            {ann.content}
                          </p>
                        </div>
                        {evalStatus !== "submitted" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[9px] px-1.5 text-primary hover:bg-primary/10 shrink-0 cursor-pointer font-bold"
                            title="Append this markup note to recommendations"
                            onClick={() => {
                              const textSnippet = ann.selected_text ? ` on "${ann.selected_text.trim()}":` : "";
                              const entry = `• [Page ${ann.page_number}]${textSnippet} ${ann.content}`;
                              setRecommendations((prev) => (prev ? `${prev}\n${entry}` : entry));
                              toast.success(`Appended Page ${ann.page_number} markup to recommendations`);
                            }}
                          >
                            + Append
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="panel-notes" className="text-xs font-semibold text-foreground">Panel Notes / Remarks</label>
                <textarea
                  id="panel-notes"
                  disabled={evalStatus === "submitted"}
                  placeholder="Write panel remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recommendations" className="text-xs font-semibold text-foreground">Recommendations</label>
                <textarea
                  id="recommendations"
                  disabled={evalStatus === "submitted"}
                  placeholder="Write specific recommendations for revisions..."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60"
                  rows={2}
                />
              </div>
            </div>

            {/* Verdict options */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-foreground">Verdict</p>
              <div className="grid grid-cols-2 gap-2">
                {verdicts.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    disabled={evalStatus === "submitted"}
                    onClick={() => setVerdict(v.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all text-center",
                      verdict === v.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:bg-muted bg-card text-muted-foreground",
                      evalStatus === "submitted" && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Buttons or Signature Card */}
            {evalStatus === "submitted" ? (
              <div className="space-y-4 pt-2">
                <Card className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-xl shadow-inner text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Verified Electronic Signature</h4>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Verified by AURORA</p>
                    </div>
                  </div>
                  
                  {(signatureDisplayUrl || evaluationData?.signature_image) && (
                    <div className="bg-white border border-emerald-100 rounded-lg p-2 flex justify-center items-center h-16 max-w-[200px] mx-auto select-none">
                      <img src={signatureDisplayUrl || evaluationData.signature_image} alt="Electronic Signature" className="h-full object-contain pointer-events-none" />
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed pt-1 font-medium">
                    <div>
                      <dt className="text-emerald-700">Panelist</dt>
                      <dd className="font-bold uppercase tracking-wider">{evaluationData?.printed_name ? evaluationData.printed_name.toUpperCase() : (panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}`.toUpperCase() : "UNKNOWN")}</dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Role</dt>
                      <dd className="font-bold capitalize">{evaluationData?.position_role || "Panelist"}</dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Signed Date & Time</dt>
                      <dd className="font-bold">
                        {evaluationData?.signed_at ? new Date(evaluationData.signed_at).toLocaleString() : "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-emerald-700">Certificate Number</dt>
                      <dd className="font-bold font-mono">{evaluationData?.certificate_serial || "N/A"}</dd>
                    </div>
                    <div className="col-span-2 border-t border-emerald-100/50 pt-1">
                      <dt className="text-emerald-700">Integrity Hash (SHA-256)</dt>
                      <dd className="font-mono text-[9px] break-all font-bold select-all bg-emerald-100/30 p-1 rounded mt-0.5">
                        {evaluationData?.signature_hash || "N/A"}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-emerald-100/50 pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setCertificateDialogOpen(true)}
                      className="text-xs text-primary font-bold hover:underline h-7 p-0 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" /> View Digital Certificate
                    </button>
                  </div>
                </Card>

                <Button 
                  variant="outline" 
                  className="w-full text-xs h-9 rounded-xl border-dashed border-border hover:bg-muted cursor-pointer"
                  onClick={handleCreateNewVersion}
                  disabled={saving}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Create New Version (Version ${evalVersion + 1})
                </Button>
              </div>
            ) : (
              <div className="flex gap-2.5 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 text-xs h-9 rounded-xl border-border hover:bg-muted cursor-pointer"
                  onClick={() => handleSaveEvaluation("draft")}
                  disabled={saving}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Save Draft
                </Button>
                <Button 
                  className="flex-1 text-xs h-9 rounded-xl cursor-pointer"
                  onClick={() => handleSaveEvaluation("submitted")}
                  disabled={saving}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Submit Grade"}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Section C - Annotations */}
        {(() => {
          const rawAdviserRemarks = documentData?.approval_remarks?.trim() || "";
          const isEndorsementBoilerplate = 
            rawAdviserRemarks.toLowerCase().includes("endorsed for defense") || 
            rawAdviserRemarks.toLowerCase().includes("adviser validation review") ||
            rawAdviserRemarks.toLowerCase() === "endorsed for defense by research adviser.";
          const hasValidAdviserRemarks = Boolean(rawAdviserRemarks) && !isEndorsementBoilerplate;
          return (
            <CollapsibleSection title={`Section C — Annotations & Directives (${annotations.length + (hasValidAdviserRemarks ? 1 : 0)})`} defaultOpen={true}>
              <div className="pt-1">
                {renderAnnotationsList(true)}
              </div>
            </CollapsibleSection>
          );
        })()}

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSignComplete={handleSignComplete}
          totalScore={weightedScore}
          verdictLabel={verdicts.find((v) => v.value === verdict)?.label || verdict}
          panelistName={panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : ""}
          panelistRole={evaluationData?.position_role || "Panelist"}
        />

        <CertificateDialog
          open={certificateDialogOpen}
          onOpenChange={setCertificateDialogOpen}
          evaluation={evaluationData}
          projectTitle={projectInfo?.title || "Research Project"}
          stageName={projectInfo?.defense_stages?.name || "Defense Stage"}
          panelistName={evaluationData?.printed_name || (panelistProfile ? `${panelistProfile.first_name} ${panelistProfile.last_name}` : "Panelist")}
        />

        {/* Chairman Rubric Customizer Dialog (Item 2) */}
        <Dialog open={chairmanModalOpen} onOpenChange={setChairmanModalOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base">
                <Crown className="h-5 w-5 text-amber-500" />
                Defense Panel Chairman — Rubric Settings
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  Committee-Wide Grading Rubric
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  As the appointed Defense Panel Chairman, modifying criteria weights here applies dynamically to all assigned defense panelists. Criteria weights must sum to exactly 100%.
                </p>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {customCriteria.map((crit, idx) => (
                  <div key={crit.id || idx} className="p-3 rounded-xl border border-border bg-card/60 space-y-2 relative group hover:border-border/90 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) => {
                          const updated = [...customCriteria];
                          updated[idx].name = e.target.value;
                          setCustomCriteria(updated);
                        }}
                        className="text-xs font-bold bg-transparent border-b border-border/70 focus:outline-none focus:border-primary px-1 py-0.5 flex-1 text-foreground"
                        placeholder={`Criterion #${idx + 1} Name`}
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground">Weight:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={crit.weight}
                          onChange={(e) => {
                            const updated = [...customCriteria];
                            updated[idx].weight = Number(e.target.value) || 0;
                            setCustomCriteria(updated);
                          }}
                          className="w-14 h-7 text-xs text-center font-bold rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-muted-foreground">%</span>
                        
                        {/* Remove Criterion Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={customCriteria.length <= 1}
                          onClick={() => {
                            if (customCriteria.length <= 1) {
                              toast.error("At least one criterion is required for the grading rubric.");
                              return;
                            }
                            setCustomCriteria(customCriteria.filter((_, i) => i !== idx));
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0 disabled:opacity-30"
                          title={customCriteria.length <= 1 ? "At least one criterion is required" : "Remove this criterion"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={crit.description || ""}
                      onChange={(e) => {
                        const updated = [...customCriteria];
                        updated[idx].description = e.target.value;
                        setCustomCriteria(updated);
                      }}
                      className="text-[11px] text-muted-foreground bg-transparent border-0 focus:outline-none w-full px-1"
                      placeholder="Grading focus / guidance for panelists (optional)..."
                    />
                  </div>
                ))}
              </div>

              {/* Action Bar: Add Criterion & Auto-Balance */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newId = `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    setCustomCriteria([
                      ...customCriteria,
                      {
                        id: newId,
                        name: `Criterion ${customCriteria.length + 1}`,
                        description: "",
                        weight: 10,
                      },
                    ]);
                  }}
                  className="h-8 text-xs font-bold gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5 cursor-pointer flex-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Criterion
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (customCriteria.length === 0) return;
                    const count = customCriteria.length;
                    const base = Math.floor(100 / count);
                    const remainder = 100 - base * count;
                    setCustomCriteria(
                      customCriteria.map((c, i) => ({
                        ...c,
                        weight: i === 0 ? base + remainder : base,
                      }))
                    );
                    toast.success(`Weights automatically balanced across ${count} criteria to equal 100%!`);
                  }}
                  className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Evenly distribute 100% across all criteria"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Auto-Balance 100%
                </Button>
              </div>

              {/* Minimum Passing Score */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="text-xs font-bold text-foreground block">Minimum Passing Score</span>
                  <span className="text-[10px] text-muted-foreground">Threshold required for a Passing defense verdict</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={customPassingScore}
                    onChange={(e) => setCustomPassingScore(Number(e.target.value) || 75)}
                    className="w-14 h-7 text-xs text-center font-bold rounded-md border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                </div>
              </div>

              {/* Total Weight Indicator */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs font-bold text-foreground">Total Weight Sum</span>
                {(() => {
                  const sum = customCriteria.reduce((acc, c) => acc + Number(c.weight || 0), 0);
                  const isValid = Math.abs(sum - 100) < 0.1;
                  return (
                    <span className={cn("text-xs font-black", isValid ? "text-emerald-600" : "text-rose-600")}>
                      {sum.toFixed(1)}% {isValid ? "(Valid 100%)" : "(Must equal 100%)"}
                    </span>
                  );
                })()}
              </div>

              {/* Save as default checkbox */}
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveAsDefaultRubric}
                  onChange={(e) => setSaveAsDefaultRubric(e.target.checked)}
                  className="rounded border-border mt-0.5 text-primary focus:ring-primary"
                />
                <span>
                  Save as official default rubric for future defense schedules in this stage ({projectInfo?.stageName || "this stage"}).
                </span>
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChairmanModalOpen(false)}
                disabled={savingRubric}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={savingRubric}
                onClick={async () => {
                  if (customCriteria.length === 0) {
                    toast.error("Please add at least one criterion.");
                    return;
                  }
                  if (customCriteria.some((c) => !c.name?.trim())) {
                    toast.error("All criteria must have a title.");
                    return;
                  }
                  const sum = customCriteria.reduce((acc, c) => acc + Number(c.weight || 0), 0);
                  if (Math.abs(sum - 100) > 0.5) {
                    toast.error(`Criteria weights must sum to exactly 100%. Current sum: ${sum.toFixed(1)}%`);
                    return;
                  }
                  try {
                    setSavingRubric(true);
                    const res = await updateDefenseChairmanRubricAction({
                      projectId,
                      stageId,
                      templateId: rubricTemplate?.id,
                      criteria: customCriteria,
                      passingScore: customPassingScore,
                      saveAsDefault: saveAsDefaultRubric,
                    });
                    if (!res.success) {
                      toast.error(res.error || "Failed to update rubric");
                      return;
                    }
                    if (res.rubric) {
                      setRubricTemplate(res.rubric);
                      // Ensure any newly added criteria keys have scores in local state
                      setScores((prev) => {
                        const updated = { ...prev };
                        (res.rubric.criteria || []).forEach((c: any) => {
                          const k = c.id || c.name;
                          if (updated[k] === undefined) {
                            updated[k] = 75;
                          }
                        });
                        return updated;
                      });
                    }
                    toast.success("Rubric criteria updated! All panelists evaluating this project will use these criteria.");
                    setChairmanModalOpen(false);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to update rubric");
                  } finally {
                    setSavingRubric(false);
                  }
                }}
                className="text-xs gap-1.5 cursor-pointer font-bold"
              >
                {savingRubric ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save & Apply to Committee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
