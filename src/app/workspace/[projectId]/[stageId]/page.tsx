"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Wifi, Loader2, AlertCircle } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import nextDynamic from "next/dynamic";
import { GradingPanel } from "@/components/workspace/grading-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { VersionComparison } from "@/components/workspace/version-comparison";
import { cn } from "@/lib/utils";

const PdfViewerPanel = nextDynamic(
  () => import("@/components/workspace/pdf-viewer-panel").then((m) => m.PdfViewerPanel),
  { ssr: false }
);

export default function WorkspacePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const stageId = params.stageId as string;

  const [project, setProject] = useState<any>(null);
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

  useEffect(() => {
    async function loadWorkspaceData() {
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

        const stageName = stageData?.name || "Defense Stage";

        // 3. Fetch current manuscript document
        const { data: docData } = await supabase
          .from("documents")
          .select("id")
          .eq("project_id", projectId)
          .eq("stage_id", stageId)
          .single();

        if (docData) {
          // 4. Fetch all versions
          const { data: verList } = await supabase
            .from("document_versions")
            .select("*")
            .eq("document_id", docData.id)
            .order("version_number", { ascending: true });

          if (verList && verList.length > 0) {
            setAllVersions(verList);
            const currentVer = verList.find((v: any) => v.is_current) || verList[verList.length - 1];
            setDocVersion(currentVer);

            // 5. Signed URL for private manuscripts bucket (or cached file_url)
            if (currentVer.file_url) {
              setPdfUrl(currentVer.file_url);
            } else if (currentVer.storage_path) {
              const { data: signedData, error: signErr } = await supabase.storage
                .from("manuscripts")
                .createSignedUrl(currentVer.storage_path, 3600);
              if (!signErr && signedData?.signedUrl) {
                setPdfUrl(signedData.signedUrl);
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading workspace data:", err);
        setErrorMsg("Failed to connect to the database.");
      } finally {
        setLoading(false);
      }
    }

    if (projectId && stageId) {
      loadWorkspaceData();
    }
  }, [projectId, stageId, supabase]);

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
          <Link href="/dashboard/submissions">Go to Submissions</Link>
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
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/submissions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold leading-tight max-w-xl truncate">
              {project.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {studentName} • Version {docVersion?.version_number || "0"}
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

      {/* Main split-screen panel container */}
      <div className="hidden flex-1 overflow-hidden lg:block">
        <Group orientation="horizontal">
          <Panel defaultSize={65} minSize={40}>
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
              <div className="flex-1 min-h-0">
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
                      No manuscript uploaded yet. Upload a PDF first.
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
          <Separator className="w-1.5 bg-border transition-colors hover:bg-primary/30" />
          <Panel defaultSize={35} minSize={25}>
            <div className="h-full border-l border-border bg-card">
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

      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <div className="h-[50vh] shrink-0 flex flex-col bg-slate-50/20">
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
          <div className="flex-1 min-h-0">
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
        <div className="flex-1 overflow-hidden border-t border-border">
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
