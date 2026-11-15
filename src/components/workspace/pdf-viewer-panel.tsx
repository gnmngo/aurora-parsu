"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MessageSquarePlus,
  MessageSquare,
  Loader2,
  Trash2,
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  ZoomIn,
  ZoomOut,
  MousePointer,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createAnnotationAction, deleteAnnotationAction } from "@/lib/annotations/actions";
import { InteractivePdfViewer } from "./interactive-pdf-viewer";
import { exportAnnotatedManuscriptPdf } from "@/lib/documents/annotated-pdf-exporter";

interface PdfViewerPanelProps {
  title: string;
  projectId: string;
  stageId: string;
  documentVersionId: string;
  pdfUrl: string;
  currentUserRole?: "student" | "adviser" | "panelist" | "coordinator" | "sys_admin";
  initialSelectedAnnotationId?: string | null;
  onAnnotationChange?: () => void;
}

export function PdfViewerPanel({
  title,
  projectId,
  stageId,
  documentVersionId,
  pdfUrl,
  currentUserRole,
  initialSelectedAnnotationId,
  onAnnotationChange,
}: PdfViewerPanelProps) {
  const [viewMode, setViewMode] = useState<"interactive" | "native">("interactive");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(initialSelectedAnnotationId || null);

  useEffect(() => {
    if (initialSelectedAnnotationId) {
      setSelectedAnnotationId(initialSelectedAnnotationId);
    }
  }, [initialSelectedAnnotationId]);

  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemarksDrawer, setShowRemarksDrawer] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Microsoft Word Ribbon State (Consolidated Zoom, Markup & Export Controls)
  const [ribbonTab, setRibbonTab] = useState<"all" | "view" | "review">("all");
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1.15);
  const [activeTool, setActiveTool] = useState<"select" | "pen">("select");
  const [penColor, setPenColor] = useState<string>("#ef4444");
  const [penWidth, setPenWidth] = useState<number>(3.5);
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);

  // Form states for new remark
  const [commentText, setCommentText] = useState("");
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [sectionRef, setSectionRef] = useState("");
  const [severity, setSeverity] = useState<"info" | "minor" | "major" | "critical">("minor");
  const [saving, setSaving] = useState(false);

  const handleExportAnnotatedPdf = async () => {
    const pageCanvases = document.querySelectorAll("[data-page-number] canvas, [id^='pdf-page-'] canvas");
    const numPages = pageCanvases.length;
    if (numPages === 0) {
      toast.error("Please ensure the interactive manuscript is loaded before exporting.");
      return;
    }
    try {
      setIsExporting(true);
      toast.info("Generating annotated PDF with reviewer markings...", { id: "panel-export-toast" });
      await exportAnnotatedManuscriptPdf({
        manuscriptTitle: title || "Research Manuscript",
        numPages,
        annotations,
      });
      toast.success("Annotated manuscript with faculty markings downloaded!", { id: "panel-export-toast" });
    } catch (err) {
      console.error("[PdfViewerPanel] Export error:", err);
      toast.error("Failed to generate annotated PDF.", { id: "panel-export-toast" });
    } finally {
      setIsExporting(false);
    }
  };

  const supabase = useMemo(() => createClient(), []);

  // Load Annotations for the current version
  const loadAnnotations = async () => {
    if (!documentVersionId) return;
    try {
      setLoadingAnnotations(true);
      const { data, error } = await supabase
        .from("annotations")
        .select(`
          id,
          page_number,
          type,
          severity,
          status,
          content,
          selected_text,
          coordinates,
          created_at,
          profiles!created_by ( first_name, last_name )
        `)
        .eq("document_version_id", documentVersionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setAnnotations(data);
      }
    } catch (err) {
      console.error("Error loading annotations:", err);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const onAnnotationChangeRef = useRef(onAnnotationChange);
  useEffect(() => {
    onAnnotationChangeRef.current = onAnnotationChange;
  }, [onAnnotationChange]);

  const handleAnnotationCreated = useCallback(() => {
    loadAnnotations();
    onAnnotationChangeRef.current?.();
  }, []);

  useEffect(() => {
    loadAnnotations();

    if (!documentVersionId) return;

    let channel: any = null;
    try {
      const channelUnique = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const channelName = `pdf-annotations-${documentVersionId}-${channelUnique}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "annotations",
            filter: `document_version_id=eq.${documentVersionId}`,
          },
          () => {
            loadAnnotations();
            onAnnotationChangeRef.current?.();
          }
        );

      channel.subscribe();
    } catch (err) {
      console.warn("[PdfViewerPanel] Realtime subscription init error:", err);
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
  }, [documentVersionId, supabase]);

  // Submit new annotation
  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !documentVersionId) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error("No active session.");

      let saved = false;

      // 1. Try server action first
      try {
        const res = await createAnnotationAction({
          documentVersionId,
          pageNumber: pageNumber || 1,
          content: commentText.trim(),
          severity: severity,
          selectedText: sectionRef.trim() || undefined,
          type: "text_comment",
        });

        if (res?.success) {
          saved = true;
        } else {
          console.warn("[PdfViewerPanel] Server action unsuccessful, attempting direct client fallback:", res?.error);
        }
      } catch (actionErr) {
        console.warn("[PdfViewerPanel] Server action exception, attempting direct client fallback:", actionErr);
      }

      // 2. Direct client fallback if server action failed or threw
      if (!saved) {
        const { data: newAnn, error: insertErr } = await supabase
          .from("annotations")
          .insert({
            document_version_id: documentVersionId,
            type: "text_comment",
            page_number: pageNumber || 1,
            selected_text: sectionRef.trim() || null,
            content: commentText.trim(),
            severity: severity,
            status: "open",
            coordinates: { left: 10, top: 10, width: 80, height: 5 },
            created_by: userId,
          })
          .select()
          .single();

        if (insertErr || !newAnn) {
          throw new Error(insertErr?.message || "Failed to create annotation.");
        }

        try {
          await supabase.from("annotation_history").insert({
            annotation_id: newAnn.id,
            from_status: null,
            to_status: "open",
            notes: "Initial feedback comment created",
            changed_by: userId,
          });
        } catch {
          // non-fatal
        }
      }

      toast.success("Revision comment added successfully!");
      setShowAddModal(false);
      setCommentText("");
      setSectionRef("");
      loadAnnotations();
      onAnnotationChange?.();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error adding comment: ${err?.message || "Failed to save comment"}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete an annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      const res = await deleteAnnotationAction(id);
      if (!res.success) {
        toast.error(res.error || "Failed to remove comment.");
        return;
      }

      toast.success("Comment removed.");
      loadAnnotations();
      onAnnotationChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove comment.");
    }
  };

  const filteredAnnotations = annotations.filter((ann) => {
    if (filterSeverity === "all") return true;
    return ann.severity === filterSeverity;
  });

  const isStudent = currentUserRole === "student";

  return (
    <div className="flex h-full flex-col bg-slate-900/5 relative overflow-hidden">
      {/* Microsoft Word-Inspired Ribbon Toolbar */}
      <div className="border-b border-border bg-card shrink-0 z-20 shadow-2xs select-none">
        {/* Ribbon Tab Strip */}
        <div className="flex items-center justify-between px-3 pt-1.5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-0.5">
            {(
              [
                { id: "all", label: "Home & Review Ribbon" },
                { id: "view", label: "View & Zoom" },
                { id: "review", label: "Markup & Remarks" },
              ] as const
            ).map((tab) => {
              const active = ribbonTab === tab.id && !isRibbonCollapsed;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (ribbonTab === tab.id && !isRibbonCollapsed) {
                      setIsRibbonCollapsed(true);
                    } else {
                      setRibbonTab(tab.id);
                      setIsRibbonCollapsed(false);
                    }
                  }}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-t-md border-t border-x transition-all cursor-pointer",
                    active
                      ? "bg-card text-primary border-border -mb-px pb-1.5 shadow-2xs"
                      : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pb-1">
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {isStudent
                ? "Click any highlight or pen markup to reply"
                : activeTool === "pen"
                  ? "Draw freehand on manuscript pages"
                  : "Highlight text to leave inline comments"}
            </span>
            <button
              type="button"
              onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isRibbonCollapsed ? "Expand Ribbon" : "Collapse Ribbon"}
            >
              {isRibbonCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Ribbon Groups Body */}
        {!isRibbonCollapsed && (
          <div className="flex flex-wrap items-stretch gap-1 px-3 py-1.5 bg-card min-h-[54px]">
            {/* GROUP 1: VIEW MODE */}
            {(ribbonTab === "all" || ribbonTab === "view") && (
              <div className="flex flex-col justify-between pr-2.5 mr-1 border-r border-border/70">
                <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode("interactive")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                      viewMode === "interactive"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Interactive Docs Mode (Inline Highlighting & Pen Markup)"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Docs Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("native")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                      viewMode === "native"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Browser Native PDF Reader"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Native PDF</span>
                  </button>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 text-center mt-1">
                  View Mode
                </span>
              </div>
            )}

            {/* GROUP 2: ZOOM CONTROLS */}
            {(ribbonTab === "all" || ribbonTab === "view") && viewMode === "interactive" && (
              <div className="flex flex-col justify-between pr-2.5 mr-1 border-r border-border/70">
                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded cursor-pointer"
                      onClick={() => setScale((prev) => Math.max(0.75, Number((prev - 0.15).toFixed(2))))}
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => setScale(1.15)}
                      className="text-[11px] font-bold px-1.5 text-foreground hover:text-primary w-11 text-center cursor-pointer"
                      title="Click to reset zoom (100%)"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded cursor-pointer"
                      onClick={() => setScale((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 text-center mt-1">
                  Zoom
                </span>
              </div>
            )}

            {/* GROUP 3: INK & MARKUP TOOLS (Faculty / Reviewers) */}
            {(ribbonTab === "all" || ribbonTab === "review") && !isStudent && viewMode === "interactive" && (
              <div className="flex flex-col justify-between pr-2.5 mr-1 border-r border-border/70">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setActiveTool("select")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-all",
                        activeTool === "select"
                          ? "bg-card text-primary shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Select & Highlight Text"
                    >
                      <MousePointer className="h-3 w-3" />
                      <span>Select</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool("pen")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-all",
                        activeTool === "pen"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Freehand Ink Pen"
                    >
                      <PenTool className="h-3 w-3" />
                      <span>Ink Pen</span>
                    </button>
                  </div>

                  {activeTool === "pen" && (
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-lg border border-border">
                      <div className="flex items-center gap-1">
                        {[
                          { color: "#ef4444", label: "Red" },
                          { color: "#2563eb", label: "Blue" },
                          { color: "#d97706", label: "Amber" },
                          { color: "#059669", label: "Emerald" },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setPenColor(c.color)}
                            style={{ backgroundColor: c.color }}
                            className={cn(
                              "h-3.5 w-3.5 rounded-full transition-transform cursor-pointer",
                              penColor === c.color ? "ring-2 ring-offset-1 ring-primary scale-110" : "opacity-75 hover:opacity-100"
                            )}
                            title={`${c.label} Ink`}
                          />
                        ))}
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-0.5">
                        {[
                          { width: 2, label: "Fine" },
                          { width: 3.5, label: "Med" },
                          { width: 5, label: "Bold" },
                        ].map((w) => (
                          <button
                            key={w.width}
                            type="button"
                            onClick={() => setPenWidth(w.width)}
                            className={cn(
                              "px-1 py-0.5 text-[9px] font-bold rounded cursor-pointer",
                              penWidth === w.width
                                ? "bg-card text-foreground shadow-2xs border border-border"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 text-center mt-1">
                  Markup Tools
                </span>
              </div>
            )}

            {/* GROUP 4: COMMENTS & REMARKS */}
            {(ribbonTab === "all" || ribbonTab === "review") && (
              <div className="flex flex-col justify-between pr-2.5 mr-1 border-r border-border/70">
                <div className="flex items-center gap-1">
                  {!isStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 rounded-lg text-[11px] font-semibold cursor-pointer"
                      onClick={() => setShowAddModal(true)}
                      title="Add General Page Remark"
                    >
                      <MessageSquarePlus className="h-3 w-3 text-primary" />
                      <span>New Remark</span>
                    </Button>
                  )}
                  <Button
                    variant={showRemarksDrawer ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1 px-2 rounded-lg text-[11px] font-semibold cursor-pointer"
                    onClick={() => setShowRemarksDrawer(!showRemarksDrawer)}
                    title="Toggle Remarks Drawer"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Remarks</span>
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold">
                      {annotations.length}
                    </Badge>
                  </Button>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 text-center mt-1">
                  Comments
                </span>
              </div>
            )}

            {/* GROUP 5: UNIFIED DOCUMENT EXPORT (Single Download Button with Menu) */}
            {pdfUrl && (
              <div className="flex flex-col justify-between ml-auto relative">
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={() => setShowDownloadMenu((prev) => !prev)}
                      className="h-7 gap-1.5 px-2.5 rounded-lg text-[11px] font-bold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                      title="Download or Open Manuscript PDF"
                    >
                      {isExporting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>{isExporting ? "Exporting..." : "Download"}</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>

                    {showDownloadMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowDownloadMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDownloadMenu(false);
                              handleExportAnnotatedPdf();
                            }}
                            disabled={isExporting}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-semibold hover:bg-muted transition-colors cursor-pointer text-foreground"
                          >
                            <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold">Annotated PDF (with Markings)</p>
                              <p className="text-[9px] text-muted-foreground">Includes all ink &amp; faculty remarks</p>
                            </div>
                          </button>
                          <a
                            href={pdfUrl}
                            download={`${title || "manuscript"}.pdf`}
                            onClick={() => setShowDownloadMenu(false)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-semibold hover:bg-muted transition-colors cursor-pointer text-foreground"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold">Original Manuscript PDF</p>
                              <p className="text-[9px] text-muted-foreground">Clean copy without markings</p>
                            </div>
                          </a>
                          <div className="h-px bg-border/60 my-1" />
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowDownloadMenu(false)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-medium hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px]">Open PDF in New Tab</span>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 text-center mt-1">
                  Export
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main PDF Viewer Container */}
      <div className="flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-900/40">
        {pdfUrl ? (
          viewMode === "interactive" ? (
            <InteractivePdfViewer
              pdfUrl={pdfUrl}
              documentVersionId={documentVersionId}
              projectId={projectId}
              stageId={stageId}
              currentUserRole={currentUserRole}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={setSelectedAnnotationId}
              onAnnotationCreated={handleAnnotationCreated}
              manuscriptTitle={title}
              hideToolbar={true}
              externalScale={scale}
              externalActiveTool={activeTool}
              externalPenColor={penColor}
              externalPenWidth={penWidth}
            />
          ) : (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&zoom=100`}
              className="w-full h-full border-0"
              title={title || "Manuscript PDF"}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No manuscript PDF currently uploaded for this stage.</p>
            <p className="text-xs max-w-sm">
              The student can upload their research manuscript PDF from the submission panel.
            </p>
          </div>
        )}

        {/* Collapsible Remarks Drawer */}
        {showRemarksDrawer && (
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-card border-l border-border shadow-2xl flex flex-col z-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs">Panelist Remarks ({annotations.length})</h4>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowRemarksDrawer(false)}
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
            </div>

            {/* Filter */}
            <div className="p-2 border-b border-border bg-card flex items-center gap-1 text-[11px]">
              <span className="text-muted-foreground font-semibold px-1">Filter:</span>
              {(["all", "minor", "major", "critical"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={cn(
                    "px-2 py-0.5 rounded capitalize text-[10px] font-bold transition-all cursor-pointer",
                    filterSeverity === sev
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredAnnotations.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No {filterSeverity !== "all" ? filterSeverity : ""} remarks found.
                </div>
              ) : (
                filteredAnnotations.map((ann) => {
                  const author = Array.isArray(ann.profiles) ? ann.profiles[0] : ann.profiles;
                  const authorName = author
                    ? `${author.first_name} ${author.last_name}`
                    : "Panelist";

                  return (
                    <div
                      key={ann.id}
                      onClick={() => {
                        setSelectedAnnotationId(ann.id);
                        if (viewMode !== "interactive") {
                          setViewMode("interactive");
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border bg-card shadow-xs space-y-1.5 text-xs group relative transition-colors cursor-pointer",
                        selectedAnnotationId === ann.id
                          ? "border-amber-500 ring-1 ring-amber-400/50 bg-amber-500/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              ann.severity === "critical"
                                ? "danger"
                                : ann.severity === "major"
                                ? "warning"
                                : "outline"
                            }
                            className="text-[9px] uppercase px-1.5 py-0 font-bold"
                          >
                            {ann.severity}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            Page {ann.page_number}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(ann.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger p-0.5 transition-opacity cursor-pointer"
                          title="Delete annotation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {ann.selected_text && (
                        <p className="text-[11px] font-semibold italic text-foreground bg-muted/70 p-2 rounded border border-border/50">
                          &ldquo;{ann.selected_text}&rdquo;
                        </p>
                      )}

                      <p className="text-foreground font-medium text-xs whitespace-pre-wrap leading-relaxed">
                        {ann.content}
                      </p>

                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50 flex justify-between font-medium">
                        <span className="font-semibold text-foreground">By {authorName}</span>
                        <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Remark Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border border-border bg-card animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4 text-primary" />
                  Add Revision Remark / Inline Note
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowAddModal(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddAnnotation} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ann-page" className="text-xs font-bold">
                      Page Number *
                    </Label>
                    <Input
                      id="ann-page"
                      type="number"
                      min={1}
                      value={pageNumber}
                      onChange={(e) => setPageNumber(parseInt(e.target.value) || 1)}
                      required
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ann-sev" className="text-xs font-bold">
                      Severity Tag
                    </Label>
                    <select
                      id="ann-sev"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2 font-semibold focus:outline-none"
                    >
                      <option value="info">Info / Recommendation</option>
                      <option value="minor">Minor Revision</option>
                      <option value="major">Major Revision</option>
                      <option value="critical">Critical Issue / Blocker</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ann-sec" className="text-xs font-bold">
                    Section / Reference (Optional)
                  </Label>
                  <Input
                    id="ann-sec"
                    type="text"
                    placeholder="e.g. Chapter 3 - Methodology, Table 2"
                    value={sectionRef}
                    onChange={(e) => setSectionRef(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ann-content" className="text-xs font-bold">
                    Panelist Feedback / Comments *
                  </Label>
                  <textarea
                    id="ann-content"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Provide constructive feedback, required revisions, or questions for the defense..."
                    className="w-full text-xs rounded-lg border border-input bg-background p-2.5 focus:outline-none focus:ring-1 focus:ring-primary min-h-[90px]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving || !commentText.trim()}
                    className="rounded-lg text-xs font-bold gap-1.5"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Remark
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl border border-border bg-card animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-danger">
                <Trash2 className="h-4 w-4 text-danger" />
                Delete Revision Remark?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Are you sure you want to delete this annotation? This action will remove the remark permanently.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    const id = deleteConfirmId;
                    setDeleteConfirmId(null);
                    if (id) await handleDeleteAnnotation(id);
                  }}
                >
                  Delete Remark
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
