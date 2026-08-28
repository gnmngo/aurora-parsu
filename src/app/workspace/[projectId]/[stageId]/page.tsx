"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Wifi, Loader2, AlertCircle, FileText } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import nextDynamic from "next/dynamic";
import { GradingPanel } from "@/components/workspace/grading-panel";
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
  { ssr: false }
);

export default function WorkspacePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const stageId = params.stageId as string;
  const { roles } = useAuth();
  const isStudent = roles.includes("student") && !roles.some((r) => ["panelist", "adviser", "coordinator", "sys_admin", "college_dean"].includes(r));
  const backHref = isStudent ? "/dashboard/my-project" : "/dashboard/defenses";

  const [project, setProject] = useState<any>(null);
  const [stageName, setStageName] = useState<string>("Defense Stage");
  const [docVersion, setDocVersion] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<any[]>([]);
  const [leftPaneTab, setLeftPaneTab] = useState<"pdf" | "compare">("pdf");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);

  const supabase = createClient();

  const handleAnnotationChange = () => {
    setAnnotationRefreshKey((k) => k + 1);
  };

  const loadWorkspaceData = useCallback(async () => {
    try {
      // 1. Fetch project title
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("title, current_stage_id, students(profiles(first_name, last_name))")
        .eq("id", projectId)
        .single();

      if (projErr || !projData) {
        setErrorMsg("Research project not found.");
        setLoading(false);
        return;
      }

      setProject(projData);

      // 2. Fetch active stage details
      const { data: stageData } = await supabase
        .from("defense_stages")
        .select("name")
        .eq("id", stageId)
        .single();

      const fetchedStageName = stageData?.name || "Defense Stage";
      setStageName(fetchedStageName);

      // 3. Fetch current manuscript document (with fallback if stage_id is null or different)
      let docData: { id: string } | null = null;

      const { data: stageDoc } = await supabase
        .from("documents")
        .select("id")
        .eq("project_id", projectId)
        .eq("stage_id", stageId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stageDoc) {
        docData = stageDoc;
      } else {
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
        // 4. Fetch all versions
        const { data: verList } = await supabase
          .from("document_versions")
          .select("*")
          .eq("document_id", docData.id)
          .order("version_number", { ascending: true });

        if (verList && verList.length > 0) {
          const versionsWithUrls = await Promise.all(
            verList.map(async (v: any) => {
              if (v.storage_path) {
                const { data } = await supabase.storage
                  .from("manuscripts")
                  .createSignedUrl(v.storage_path, 7200);
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
  }, [projectId, stageId, supabase]);

  useEffect(() => {
    if (projectId && stageId) {
      loadWorkspaceData();
    }
  }, [projectId, stageId, loadWorkspaceData]);

  if (loading) {
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
        <AlertCircle className="h-10 w-10 text-danger" />
        <p className="font-semibold text-lg text-foreground">{errorMsg || "Workspace loading error."}</p>
        <Button asChild variant="outline">
          <Link href={backHref}>{isStudent ? "Go to My Project" : "Go to Defenses"}</Link>
        </Button>
      </div>
    );
  }

  const studentRow = Array.isArray((project as any).students)
    ? (project as any).students[0]
    : (project as any).students;
  const studentProfile = Array.isArray(studentRow?.profiles)
    ? studentRow.profiles[0]
    : studentRow?.profiles;
  const studentName = studentProfile
    ? `${studentProfile.first_name} ${studentProfile.last_name}`
    : "Unknown Student";

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-tight max-w-xl truncate">
                {project.title}
              </p>
              {isStudent ? (
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider">
                  Feedback &amp; Suggestions
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary">
                  Evaluation Workspace
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {studentName} • Version {docVersion?.version_number || "0"} • {stageName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="info" className="hidden sm:flex">
            <Wifi className="mr-1 h-3 w-3" />
            Online
          </Badge>
          <Badge variant="success">Auto-saved</Badge>
        </div>
      </header>

      {/* Main split-screen panel container for Desktop */}
      <div className="hidden flex-1 overflow-hidden lg:flex lg:flex-row h-[calc(100vh-3.5rem)] w-full">
        <Group orientation="horizontal" className="h-full w-full">
          <Panel defaultSize={65} minSize={35} className="h-full overflow-hidden">
            <div className="flex flex-col h-full bg-slate-50/20">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                  <button
                    onClick={() => setLeftPaneTab("pdf")}
                    className={cn(
                      "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                      leftPaneTab === "pdf" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                    )}
                  >
                    PDF Manuscript
                  </button>
                  <button
                    onClick={() => setLeftPaneTab("compare")}
                    className={cn(
                      "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                      leftPaneTab === "compare" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                    )}
                  >
                    Version Compare
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {leftPaneTab === "pdf" ? (
                  docVersion ? (
                    <PdfViewerPanel
                      title={project.title}
                      documentVersionId={docVersion.id}
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
          </Panel>
          <Separator className="w-2 bg-border hover:bg-primary/40 cursor-col-resize transition-colors flex items-center justify-center shrink-0" />
          <Panel defaultSize={35} minSize={25} className="h-full overflow-hidden">
            <div className="h-full border-l border-border bg-card overflow-hidden">
              <GradingPanel
                projectId={projectId}
                stageId={stageId}
                documentVersionId={docVersion?.id || null}
                annotationRefreshKey={annotationRefreshKey}
              />
            </div>
          </Panel>
        </Group>
      </div>

      {/* Mobile view */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden h-[calc(100vh-3.5rem)]">
        <div className="h-[50vh] shrink-0 flex flex-col bg-slate-50/20 border-b border-border">
          {/* Tab Selector Mobile */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setLeftPaneTab("pdf")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "pdf" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                )}
              >
                PDF
              </button>
              <button
                onClick={() => setLeftPaneTab("compare")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  leftPaneTab === "compare" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
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
                  title={project.title}
                  documentVersionId={docVersion.id}
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
        <div className="flex-1 overflow-hidden">
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
