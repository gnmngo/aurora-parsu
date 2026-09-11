"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wifi,
  Loader2,
  AlertCircle,
  FileText,
  GripVertical,
  Columns,
  Sparkles,
  Menu,
  LayoutDashboard,
  Calendar,
  Award,
  BarChart3,
  Settings,
  X,
  ChevronRight,
  Home,
  Shield,
  Sliders,
} from "lucide-react";
import nextDynamic from "next/dynamic";
import { PdfUploader } from "@/components/documents/pdf-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useParams, useSearchParams } from "next/navigation";
import { VersionComparison } from "@/components/workspace/version-comparison";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const PdfViewerPanel = nextDynamic(
  () => import("@/components/workspace/pdf-viewer-panel").then((m) => m.PdfViewerPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

const GradingPanel = nextDynamic(
  () => import("@/components/workspace/grading-panel").then((m) => m.GradingPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

const isUUID = (val: unknown) =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export default function WorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const targetAnnotationId = searchParams.get("annotation") || null;
  const projectId = (params?.projectId as string) || "";
  const rawStageId = (params?.stageId as string) || "";
  const { roles } = useAuth();
  const isAdviser = roles.includes("adviser") && !roles.includes("panelist") && !roles.includes("sys_admin");
  const isStudent =
    roles.includes("student") &&
    !roles.some((r: string) => ["panelist", "adviser", "coordinator", "sys_admin", "college_dean"].includes(r));
  const currentUserRole: "student" | "adviser" | "panelist" | "coordinator" | "sys_admin" =
    roles.includes("sys_admin") ? "sys_admin" :
    roles.includes("coordinator") ? "coordinator" :
    roles.includes("panelist") ? "panelist" :
    roles.includes("adviser") ? "adviser" : "student";
  const backHref = isStudent ? "/dashboard/my-project" : isAdviser ? "/dashboard" : "/dashboard/defenses";

  const [mounted, setMounted] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [stageId, setStageId] = useState<string>(rawStageId);
  const [stageName, setStageName] = useState<string>("Defense Stage");
  const [docVersion, setDocVersion] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<any[]>([]);
  const [leftPaneTab, setLeftPaneTab] = useState<"pdf" | "compare">("pdf");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);

  // Responsive Resizable Split-Screen State
  const [splitPercent, setSplitPercent] = useState<number>(62);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnnotationChange = () => {
    setAnnotationRefreshKey((k) => k + 1);
  };

  // Draggable Split Divider Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 30 && newPercent <= 75) {
        setSplitPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      if (!isUUID(projectId)) {
        setErrorMsg("Invalid research project ID.");
        setLoading(false);
        return;
      }

      // 1. Fetch project title and current_stage_id
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("title, current_stage_id, students(profiles(first_name, last_name))")
        .eq("id", projectId)
        .maybeSingle();

      if (projErr || !projData) {
        setErrorMsg("Research project not found.");
        setLoading(false);
        return;
      }

      setProject(projData);

      // 2. Resolve valid Stage ID
      let resolvedStage = rawStageId;
      if (!isUUID(resolvedStage) || resolvedStage === "stage") {
        if (isUUID(projData.current_stage_id)) {
          resolvedStage = projData.current_stage_id;
        } else {
          const { data: defaultStage } = await supabase
            .from("defense_stages")
            .select("id, name")
            .order("sequence_order", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (defaultStage?.id) {
            resolvedStage = defaultStage.id;
          }
        }
      }

      setStageId(resolvedStage);

      // 3. Fetch active stage details
      if (isUUID(resolvedStage)) {
        const { data: stageData } = await supabase
          .from("defense_stages")
          .select("name")
          .eq("id", resolvedStage)
          .maybeSingle();

        const fetchedStageName = stageData?.name || "Defense Stage";
        setStageName(fetchedStageName);
      }

      // 4. Fetch current manuscript document
      let docData: { id: string } | null = null;

      if (isUUID(resolvedStage)) {
        const { data: stageDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("project_id", projectId)
          .eq("stage_id", resolvedStage)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        docData = stageDoc;
      }

      if (!docData) {
        const { data: anyDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        docData = anyDoc;
      }

      if (docData) {
        // 5. Fetch all versions
        const { data: verList } = await supabase
          .from("document_versions")
          .select("*")
          .eq("document_id", docData.id)
          .order("version_number", { ascending: true });

        if (verList && verList.length > 0) {
          const versionsWithUrls = await Promise.all(
            verList.map(async (v: any) => {
              if (v.storage_path) {
                const cleanPath = v.storage_path.replace(/^manuscripts\//, "").replace(/^\/+/, "");
                const { data } = await supabase.storage
                  .from("manuscripts")
                  .createSignedUrl(cleanPath, 7200);
                return { ...v, file_url: data?.signedUrl || v.file_url };
              }
              return v;
            })
          );

          setAllVersions(versionsWithUrls);
          const currentVer =
            versionsWithUrls.find((v: any) => v.is_current) ||
            versionsWithUrls[versionsWithUrls.length - 1];
          setDocVersion(currentVer);

          if (currentVer?.file_url) {
            setPdfUrl(currentVer.file_url);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading workspace data:", err);
      setErrorMsg("Failed to connect to the database.");
    } finally {
      setLoading(false);
    }
  }, [projectId, rawStageId, supabase]);

  useEffect(() => {
    if (projectId) {
      loadWorkspaceData();
    }
  }, [projectId, loadWorkspaceData]);

  if (!mounted || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        Loading review workspace...
      </div>
    );
  }

  if (errorMsg || !project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-semibold text-lg text-foreground">{errorMsg || "Workspace loading error."}</p>
        <Button asChild variant="outline">
          <Link href={backHref}>{isStudent ? "Go to My Project" : "Go to Defenses"}</Link>
        </Button>
      </div>
    );
  }

  const studentRow = Array.isArray((project as any)?.students)
    ? (project as any).students[0]
    : (project as any)?.students;
  const studentProfile = Array.isArray(studentRow?.profiles)
    ? studentRow.profiles[0]
    : studentRow?.profiles;
  const studentName = studentProfile
    ? `${studentProfile.first_name} ${studentProfile.last_name}`
    : "Student Author";

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavOpen(true)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Open Platform Navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-foreground" title="Back">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-tight truncate max-w-xs sm:max-w-md md:max-w-lg">
                {project?.title || "Research Manuscript"}
              </p>
              {isStudent ? (
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider shrink-0">
                  Student Consultation
                </Badge>
              ) : isAdviser ? (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-300 bg-emerald-50/60 shrink-0">
                  Adviser Consultation
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary shrink-0">
                  Evaluation Workspace
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {studentName} • Version {docVersion?.version_number || "1"} • {stageName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 border-r border-border pr-2 mr-1">
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link href="/dashboard">
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/defenses">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Defenses
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/grades">
                <Award className="h-3.5 w-3.5 mr-1.5" />
                Grades
              </Link>
            </Button>
          </div>
          <Badge variant="outline" className="hidden sm:flex text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-bold">
            <Wifi className="mr-1 h-3 w-3" />
            Online
          </Badge>
        </div>
      </header>

      {/* Main Split-Screen Container (Desktop / Tablet) */}
      <div
        ref={containerRef}
        className={cn(
          "hidden md:flex flex-1 flex-row overflow-hidden h-[calc(100vh-3.5rem)] w-full",
          isDragging && "cursor-col-resize select-none"
        )}
      >
        {/* Left Pane: Manuscript PDF & Version Comparison */}
        <div
          style={{ width: `${splitPercent}%` }}
          className="h-full overflow-hidden flex flex-col bg-slate-50/30 dark:bg-slate-900/20"
        >
          {/* Tab Selector */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setLeftPaneTab("pdf")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "pdf"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-slate-800 dark:hover:text-white"
                )}
              >
                PDF Manuscript
              </button>
              <button
                onClick={() => setLeftPaneTab("compare")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "compare"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-slate-800 dark:hover:text-white"
                )}
              >
                Version Compare
              </button>
            </div>
            <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Columns className="h-3 w-3" />
              <span>Split View ({Math.round(splitPercent)}% / {100 - Math.round(splitPercent)}%)</span>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {leftPaneTab === "pdf" ? (
              docVersion ? (
                <PdfViewerPanel
                  title={project?.title || "Manuscript PDF"}
                  documentVersionId={docVersion?.id || ""}
                  pdfUrl={pdfUrl}
                  projectId={projectId}
                  stageId={stageId}
                  currentUserRole={currentUserRole}
                  initialSelectedAnnotationId={targetAnnotationId}
                  onAnnotationChange={handleAnnotationChange}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-muted/20">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">No Manuscript Uploaded Yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-6 leading-relaxed">
                    Upload your research manuscript PDF to begin in-browser review, real-time annotations, and defense evaluation.
                  </p>
                  <PdfUploader
                    projectId={projectId}
                    stageId={stageId}
                    buttonText="Upload Manuscript (PDF)"
                    className="font-bold shadow-sm"
                    onUploadCompleted={loadWorkspaceData}
                  />
                </div>
              )
            ) : (
              <div className="h-full p-4 overflow-y-auto">
                <VersionComparison documentVersions={allVersions} />
              </div>
            )}
          </div>
        </div>

        {/* Draggable Divider Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "w-2 bg-border hover:bg-primary/50 active:bg-primary cursor-col-resize transition-colors flex items-center justify-center shrink-0 z-20 group relative",
            isDragging && "bg-primary"
          )}
          title="Drag to resize panels"
        >
          <div className="h-8 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary-foreground transition-colors" />
        </div>

        {/* Right Pane: Rubric Scoring, Calculations, Remarks & E-Signature */}
        <div
          style={{ width: `${100 - splitPercent}%` }}
          className="h-full overflow-hidden border-l border-border bg-card"
        >
          <GradingPanel
            projectId={projectId}
            stageId={stageId}
            documentVersionId={docVersion?.id || null}
            annotationRefreshKey={annotationRefreshKey}
          />
        </div>
      </div>

      {/* Mobile Stacked View (< 768px) */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden h-[calc(100vh-3.5rem)]">
        <div className="h-[50vh] shrink-0 flex flex-col bg-slate-50/20 border-b border-border">
          {/* Tab Selector Mobile */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setLeftPaneTab("pdf")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "pdf" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                PDF
              </button>
              <button
                onClick={() => setLeftPaneTab("compare")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "compare" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                Compare
              </button>
            </div>
          </div>

          {/* Content Mobile */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {leftPaneTab === "pdf" ? (
              docVersion ? (
                <PdfViewerPanel
                  title={project?.title || "Manuscript PDF"}
                  documentVersionId={docVersion?.id || ""}
                  pdfUrl={pdfUrl}
                  projectId={projectId}
                  stageId={stageId}
                  currentUserRole={currentUserRole}
                  initialSelectedAnnotationId={targetAnnotationId}
                  onAnnotationChange={handleAnnotationChange}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                  No manuscript uploaded yet.
                </div>
              )
            ) : (
              <div className="h-full p-4 overflow-y-auto">
                <VersionComparison documentVersions={allVersions} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-card">
          <GradingPanel
            projectId={projectId}
            stageId={stageId}
            documentVersionId={docVersion?.id || null}
            annotationRefreshKey={annotationRefreshKey}
          />
        </div>
      </div>

      {/* Slide-out Navigation Drawer */}
      {isNavOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsNavOpen(false)}
          />

          {/* Side Drawer */}
          <div className="relative z-50 flex h-full w-80 max-w-[85vw] flex-col bg-card shadow-2xl border-r border-border animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shadow-xs">
                  AU
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-foreground">AURORA Navigation</h2>
                  <p className="text-[10px] text-muted-foreground">CEC Research Portal</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setIsNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Core Navigation */}
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Core Portal
                </p>
                <Link
                  href="/dashboard"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span>Dashboard Overview</span>
                </Link>
                <Link
                  href="/dashboard/defenses"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Defense Pipeline</span>
                </Link>
                <Link
                  href="/dashboard/grades"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Award className="h-4 w-4 text-primary" />
                  <span>Grades &amp; Evaluations</span>
                </Link>
                <Link
                  href="/dashboard/submissions"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Manuscript Submissions</span>
                </Link>
                <Link
                  href="/dashboard/analytics"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Research Analytics</span>
                </Link>
              </div>

              {/* Administration & Configuration */}
              {(roles.includes("coordinator") || roles.includes("sys_admin") || roles.includes("college_dean")) && (
                <div className="space-y-1 pt-2 border-t border-border/60">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    Institutional Admin
                  </p>
                  <Link
                    href="/admin/stages"
                    onClick={() => setIsNavOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Sliders className="h-4 w-4 text-primary" />
                    <span>Defense Stages (CEC)</span>
                  </Link>
                  <Link
                    href="/admin/rubrics"
                    onClick={() => setIsNavOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Rubrics Manager</span>
                  </Link>
                  {roles.includes("sys_admin") && (
                    <Link
                      href="/admin/users"
                      onClick={() => setIsNavOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Shield className="h-4 w-4 text-primary" />
                      <span>Faculty &amp; User Accounts</span>
                    </Link>
                  )}
                </div>
              )}

              {/* Preferences */}
              <div className="space-y-1 pt-2 border-t border-border/60">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Preferences
                </p>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-primary" />
                  <span>Account Settings</span>
                </Link>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-border p-3 bg-muted/20">
              <div className="rounded-lg bg-card p-2.5 border border-border/60">
                <p className="text-[11px] font-semibold text-foreground truncate">{project?.title || "Active Workspace"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Stage: {stageName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
