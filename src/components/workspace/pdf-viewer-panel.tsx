"use client";

import { useState, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  MessageSquarePlus,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizePercentCoords } from "@/lib/documents";

// Safely import PDF.js
import * as pdfjsLib from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfViewerPanelProps {
  title: string;
  projectId: string;
  stageId: string;
  documentVersionId: string;
  pdfUrl: string;
  onAnnotationChange?: () => void;
}

export function PdfViewerPanel({
  title,
  projectId,
  stageId,
  documentVersionId,
  pdfUrl,
  onAnnotationChange,
}: PdfViewerPanelProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<string | null>("comment");
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(true);

  // New annotation popup state
  const [newAnnCoords, setNewAnnCoords] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    selectedText?: string;
  } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [severity, setSeverity] = useState<"info" | "minor" | "major" | "critical">("minor");
  const [saving, setSaving] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragPreview, setDragPreview] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  // Load PDF Document
  useEffect(() => {
    if (!pdfUrl) return;
    const timer = setTimeout(() => setLoadingPdf(true), 0);

    async function loadPdf() {
      try {
        console.log("Loading PDF from URL:", pdfUrl);
        const config: DocumentInitParameters = { url: pdfUrl };
        const loadingTask = pdfjsLib.getDocument(config);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading PDF via PDF.js:", err);
        toast.error("Failed to load PDF document.");
      } finally {
        setLoadingPdf(false);
      }
    }
    loadPdf();
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  // Load Annotations for the current version
  const loadAnnotations = async () => {
    try {
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
          profiles ( first_name, last_name )
        `)
        .eq("document_version_id", documentVersionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        setAnnotations(data);
      }
    } catch (err) {
      console.error("Error loading annotations:", err);
    }
  };

  useEffect(() => {
    if (documentVersionId) {
      const timer = setTimeout(() => loadAnnotations(), 0);

      // Real-time synchronization
      const channel = supabase
        .channel(`annotations-${documentVersionId}`)
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
            onAnnotationChange?.();
          }
        )
        .subscribe();

      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentVersionId]);

  // Render Page onto Canvas
  useEffect(() => {
    if (!pdfDoc) return;

    let renderTask: any = null;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Calculate responsive viewport scale
        const scale = (zoom / 100) * 1.5;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (renderTask) {
          renderTask.cancel();
        }

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering PDF page:", err);
        }
      }
    }

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // Handle click for comment placement
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || activeTool === "highlight") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const coords = normalizePercentCoords(
      ((e.clientX - rect.left) / rect.width) * 100,
      ((e.clientY - rect.top) / rect.height) * 100,
      4,
      4
    );

    setNewAnnCoords(coords);
    setCommentText("");
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "highlight") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    setDragPreview(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "highlight" || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDragPreview(
      normalizePercentCoords(
        Math.min(dragStart.x, x),
        Math.min(dragStart.y, y),
        Math.abs(x - dragStart.x),
        Math.abs(y - dragStart.y)
      )
    );
  };

  const handleOverlayMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "highlight" || !dragStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const coords = normalizePercentCoords(
      Math.min(dragStart.x, x),
      Math.min(dragStart.y, y),
      Math.abs(x - dragStart.x),
      Math.abs(y - dragStart.y)
    );

    setDragStart(null);
    setDragPreview(null);

    if (coords.width < 1 && coords.height < 1) return;

    setNewAnnCoords(coords);
    setCommentText("");
  };

  // Submit new annotation
  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !newAnnCoords || !documentVersionId) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) throw new Error("No active session.");

      const coordinates = normalizePercentCoords(
        newAnnCoords.left,
        newAnnCoords.top,
        newAnnCoords.width,
        newAnnCoords.height
      );

      // 1. Save annotation record
      const { data, error } = await supabase
        .from("annotations")
        .insert({
          document_version_id: documentVersionId,
          type: activeTool === "highlight" ? "highlight" : "text_comment",
          page_number: currentPage,
          coordinates: coordinates,
          selected_text: newAnnCoords.selectedText || null,
          content: commentText.trim(),
          severity: severity,
          status: "open",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Fire evaluation_events trigger
      await supabase.from("evaluation_events").insert({
        project_id: projectId,
        stage_id: stageId,
        event_type: "annotation_created",
        payload: {
          annotation_id: data.id,
          page_number: currentPage,
        },
      });

      toast.success("Comment added!");
      setNewAnnCoords(null);
      setCommentText("");
      loadAnnotations();
      onAnnotationChange?.();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error adding annotation: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete an annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      const { error } = await supabase.from("annotations").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Comment removed.");
      loadAnnotations();
      onAnnotationChange?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pageAnnotations = annotations.filter((ann) => ann.page_number === currentPage);

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loadingPdf}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
            {currentPage} / {numPages || 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || loadingPdf}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            disabled={loadingPdf}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            disabled={loadingPdf}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        <Button
          variant={activeTool === "comment" ? "default" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setActiveTool(activeTool === "comment" ? null : "comment")}
          disabled={loadingPdf}
        >
          <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Add Comment</span>
        </Button>

        <Button
          variant={activeTool === "highlight" ? "default" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setActiveTool(activeTool === "highlight" ? null : "highlight")}
          disabled={loadingPdf}
        >
          <Highlighter className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Highlight Text</span>
        </Button>
      </div>

      {/* Viewer Panel Content */}
      <div className="flex-1 overflow-auto p-6" ref={containerRef}>
        {loadingPdf ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Rendering PDF document...
          </div>
        ) : (
          <div className="relative mx-auto border border-border shadow-lg bg-white rounded w-fit">
            {canvasRef && (
              <div className="relative w-fit mx-auto">
                <canvas ref={canvasRef} className="block" />

                {/* Interaction Overlay Layer */}
                <div
                  className={cn(
                    "absolute inset-0",
                    activeTool === "highlight"
                      ? "cursor-crosshair"
                      : "cursor-crosshair"
                  )}
                  onClick={handleOverlayClick}
                  onMouseDown={handleOverlayMouseDown}
                  onMouseMove={handleOverlayMouseMove}
                  onMouseUp={handleOverlayMouseUp}
                >
                  {dragPreview && (
                    <div
                      className="absolute border-2 border-yellow-500 bg-yellow-300/30 pointer-events-none"
                      style={{
                        left: `${dragPreview.left}%`,
                        top: `${dragPreview.top}%`,
                        width: `${dragPreview.width}%`,
                        height: `${dragPreview.height}%`,
                      }}
                    />
                  )}
                  {/* Render saved highlights/comments */}
                  {pageAnnotations.map((ann) => {
                    const coords = ann.coordinates || {};
                    return (
                      <div
                        key={ann.id}
                        className={cn(
                          "absolute bg-yellow-300/40 border border-yellow-500 hover:bg-yellow-300/60 transition-colors group flex items-start justify-end p-0.5",
                          ann.severity === "major" && "bg-orange-300/40 border-orange-500",
                          ann.severity === "critical" && "bg-red-300/40 border-red-500"
                        )}
                        style={{
                          left: `${coords.left ?? 0}%`,
                          top: `${coords.top ?? 0}%`,
                          width: `${coords.width ?? 25}%`,
                          height: `${coords.height ?? 4}%`,
                          pointerEvents: "auto",
                        }}
                        title={`${ann.severity} comment: ${ann.content}`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(ann.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 bg-white rounded p-0.5 shadow hover:text-danger text-muted-foreground transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* New comment placement dialog popup */}
                  {newAnnCoords && (
                    <Card
                      className="absolute z-20 w-64 shadow-xl border border-border bg-card"
                      style={{
                        left: `${newAnnCoords.left}%`,
                        top: `${newAnnCoords.top}%`,
                        transform: "translate(-20px, 10px)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="comment-input" className="text-xs">Add Review Feedback</Label>
                          <textarea
                            id="comment-input"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Type comment remarks..."
                            className="w-full text-xs rounded-xl border border-border p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={3}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="severity-select" className="text-xs">Severity Level</Label>
                          <select
                            id="severity-select"
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value as any)}
                            className="w-full text-xs rounded-xl border border-border p-1 bg-card focus:outline-none"
                          >
                            <option value="info">Info</option>
                            <option value="minor">Minor</option>
                            <option value="major">Major</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>

                        <div className="flex justify-end gap-1.5 text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewAnnCoords(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddAnnotation}
                            disabled={saving || !commentText.trim()}
                            className="h-7 text-xs"
                          >
                            {saving ? "Saving..." : "Add"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
