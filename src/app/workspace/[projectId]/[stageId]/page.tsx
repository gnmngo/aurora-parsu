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
} from "lucide-react";
import nextDynamic from "next/dynamic";
import { PdfUploader } from "@/components/documents/pdf-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
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
  const projectId = (params?.projectId as string) || "";
  const rawStageId = (params?.stageId as string) || "";
  const { roles } = useAuth();
  const isAdviser = roles.includes("adviser") && !roles.includes("panelist") && !roles.includes("sys_admin");
  const isStudent =
    roles.includes("student") &&
    !roles.some((r: string) => ["panelist", "adviser", "coordinator", "sys_admin", "college_dean"].includes(r));
  const backHref = isStudent ? "/dashboard/my-project" : isAdviser ? "/dashboard" : "/dashboard/defenses";

  const [mounted, setMounted] = useState(false);
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
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-tight truncate max-w-sm sm:max-w-md md:max-w-lg">
                {project?.title || "Research Manuscript"}
              </p>
              {isStudent ? (
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider shrink-0">
                  Student Consultation &amp; Feedback
                </Badge>
              ) : isAdviser ? (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-300 bg-emerald-50/60 shrink-0">
                  Adviser • Paperless Consultation
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary shrink-0">
                  Defense Panel • Evaluation Workspace
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {studentName} • Version {docVersion?.version_number || "1"} • {stageName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
    </div>
  );
}
