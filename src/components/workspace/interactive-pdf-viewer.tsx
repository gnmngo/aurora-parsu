"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import {
  MessageSquarePlus,
  MessageSquare,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Send,
  CornerDownRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createAnnotationAction,
  createAnnotationReplyAction,
  updateAnnotationStatusAction,
} from "@/lib/annotations/actions";

// Configure local PDF worker
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface AnnotationItem {
  id: string;
  document_version_id: string;
  page_number: number;
  type?: string;
  severity: "info" | "minor" | "major" | "critical";
  status: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "closed";
  content: string;
  selected_text?: string | null;
  coordinates?: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  created_by?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
  annotation_replies?: Array<{
    id: string;
    content: string;
    created_at: string;
    created_by: string;
    profiles?: {
      first_name: string;
      last_name: string;
    } | null;
  }>;
}

interface InteractivePdfViewerProps {
  pdfUrl: string;
  documentVersionId: string;
  projectId: string;
  stageId: string;
  currentUserRole?: "student" | "adviser" | "panelist" | "coordinator" | "sys_admin";
  onAnnotationCreated?: () => void;
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
}

export function InteractivePdfViewer({
  pdfUrl,
  documentVersionId,
  projectId,
  stageId,
  currentUserRole,
  onAnnotationCreated,
  selectedAnnotationId,
  onSelectAnnotation,
}: InteractivePdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1.15);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<AnnotationItem | null>(null);

  // Floating Selection State (Google Docs style)
  const [pendingSelection, setPendingSelection] = useState<{
    text: string;
    pageNumber: number;
    coordinates: { left: number; top: number; width: number; height: number };
    popoverPosition: { x: number; y: number };
  } | null>(null);

  // Composer Form
  const [showComposer, setShowComposer] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [severityInput, setSeverityInput] = useState<"info" | "minor" | "major" | "critical">("minor");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reply Input
  const [replyInput, setReplyInput] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // 1. Fetch Annotations with replies
  const fetchAnnotations = useCallback(async () => {
    if (!documentVersionId) return;
    try {
      setLoadingAnnotations(true);
      const { data, error } = await supabase
        .from("annotations")
        .select(`
          id,
          document_version_id,
          page_number,
          type,
          severity,
          status,
          content,
          selected_text,
          coordinates,
          created_by,
          created_at,
          profiles!created_by ( first_name, last_name ),
          annotation_replies (
            id,
            content,
            created_at,
            created_by,
            profiles ( first_name, last_name )
          )
        `)
        .eq("document_version_id", documentVersionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        const mapped = data.map((a: any) => ({
          ...a,
          profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
          annotation_replies: (a.annotation_replies || []).map((r: any) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
          })),
        }));
        setAnnotations(mapped);

        // Keep active annotation in sync
        if (activeAnnotation) {
          const refreshed = mapped.find((item: AnnotationItem) => item.id === activeAnnotation.id);
          if (refreshed) setActiveAnnotation(refreshed);
        }
      }
    } catch (err: unknown) {
      console.error("[InteractivePdfViewer] Error loading annotations:", err);
    } finally {
      setLoadingAnnotations(false);
    }
  }, [documentVersionId, supabase, activeAnnotation]);

  // Sync on mount & Realtime subscription
  useEffect(() => {
    fetchAnnotations();

    if (!documentVersionId) return;

    const channelName = `interactive-pdf-annotations-${documentVersionId}-${Date.now()}`;
    const channel = supabase
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
          fetchAnnotations();
          onAnnotationCreated?.();
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
          fetchAnnotations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentVersionId, fetchAnnotations, onAnnotationCreated, supabase]);

  // External selection syncing
  useEffect(() => {
    if (selectedAnnotationId) {
      const match = annotations.find((a) => a.id === selectedAnnotationId);
      if (match) {
        setActiveAnnotation(match);
        // Scroll to page
        const pageEl = document.querySelector(`[data-page-number="${match.page_number}"]`);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [selectedAnnotationId, annotations]);

  // 2. Handle Text Selection MouseUp (Google Docs trigger)
  const handleMouseUp = () => {
    if (showComposer) return; // Keep composer open while typing

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return;

    const range = selection.getRangeAt(0);
    const selectionRect = range.getBoundingClientRect();

    // Find parent page container
    let node: Node | null = range.commonAncestorContainer;
    let pageElement: HTMLElement | null = null;

    while (node && node !== document.body) {
      if (node instanceof HTMLElement && node.dataset?.pageNumber) {
        pageElement = node;
        break;
      }
      node = node.parentNode;
    }

    if (!pageElement && containerRef.current) {
      // Fallback find nearest page by vertical position
      const pages = containerRef.current.querySelectorAll<HTMLElement>("[data-page-number]");
      for (const p of Array.from(pages)) {
        const pRect = p.getBoundingClientRect();
        if (selectionRect.top >= pRect.top && selectionRect.bottom <= pRect.bottom + 20) {
          pageElement = p;
          break;
        }
      }
    }

    if (!pageElement) return;

    const pageNum = parseInt(pageElement.dataset.pageNumber || "1", 10);
    const pageRect = pageElement.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

    // Calculate percentage coordinates relative to the page
    const leftPercent = Math.max(0, Math.min(100, ((selectionRect.left - pageRect.left) / pageRect.width) * 100));
    const topPercent = Math.max(0, Math.min(100, ((selectionRect.top - pageRect.top) / pageRect.height) * 100));
    const widthPercent = Math.max(2, Math.min(100, (selectionRect.width / pageRect.width) * 100));
    const heightPercent = Math.max(1.5, Math.min(100, (selectionRect.height / pageRect.height) * 100));

    // Popover screen position inside the scrollable container
    const popoverX = selectionRect.right - containerRect.left + 12;
    const popoverY = selectionRect.top - containerRect.top + (containerRef.current?.scrollTop || 0);

    setPendingSelection({
      text: selectedText,
      pageNumber: pageNum,
      coordinates: {
        left: Number(leftPercent.toFixed(2)),
        top: Number(topPercent.toFixed(2)),
        width: Number(widthPercent.toFixed(2)),
        height: Number(heightPercent.toFixed(2)),
      },
      popoverPosition: {
        x: Math.min(popoverX, (containerRef.current?.clientWidth || 800) - 260),
        y: Math.max(10, popoverY - 10),
      },
    });
  };

  // 3. Submit New Comment (Google Docs Action)
  const handleCreateComment = async () => {
    if (!pendingSelection || !commentInput.trim() || !documentVersionId) return;

    setSubmittingComment(true);
    try {
      const res = await createAnnotationAction({
        documentVersionId,
        pageNumber: pendingSelection.pageNumber,
        content: commentInput.trim(),
        severity: severityInput,
        selectedText: pendingSelection.text,
        coordinates: pendingSelection.coordinates,
        type: "highlight",
      });

      if (!res.success) {
        throw new Error("Failed to save inline comment.");
      }

      toast.success("Highlight comment added!");
      setCommentInput("");
      setShowComposer(false);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();

      await fetchAnnotations();
      onAnnotationCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating comment";
      toast.error(msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 4. Submit Reply to Active Comment
  const handleAddReply = async (annotationId: string) => {
    if (!replyInput.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await createAnnotationReplyAction(annotationId, replyInput.trim());
      if (!res.success) throw new Error("Failed to post reply.");

      toast.success("Reply added!");
      setReplyInput("");
      await fetchAnnotations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error posting reply";
      toast.error(msg);
    } finally {
      setSubmittingReply(false);
    }
  };

  // 5. Update Annotation Status (Addressed, Resolved, etc.)
  const handleStatusChange = async (
    annotationId: string,
    newStatus: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "closed"
  ) => {
    try {
      const res = await updateAnnotationStatusAction({
        annotationId,
        newStatus,
      });

      if (!res.success) throw new Error("Failed to update status.");

      toast.success(`Comment status changed to "${newStatus}"`);
      await fetchAnnotations();
      onAnnotationCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status update failed";
      toast.error(msg);
    }
  };

  const isStudent = currentUserRole === "student";

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950 relative overflow-hidden select-text">
      {/* Zoom & Page Control Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/90 backdrop-blur px-4 py-2 shrink-0 z-20 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer"
              onClick={() => setScale((prev) => Math.max(0.75, Number((prev - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-bold px-2 text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer"
              onClick={() => setScale((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-semibold cursor-pointer hidden sm:flex"
            onClick={() => setScale(1.15)}
          >
            Reset (100%)
          </Button>
        </div>

        {/* Guidance badge */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden md:inline font-medium">
            Highlight any text in the PDF to leave an inline comment
          </span>
          <span className="md:hidden font-medium">Highlight text to comment</span>
          <Badge variant="outline" className="text-[10px] ml-1 font-bold">
            {annotations.length} Highlights
          </Badge>
        </div>
      </div>

      {/* Main Document Canvas Scroll Area */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center relative"
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Rendering manuscript with interactive text layer...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground text-center">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-bold text-foreground">Failed to render interactive PDF</p>
              <p className="text-xs max-w-sm">
                The manuscript could not be loaded into the interactive text layer. Please check the network connection.
              </p>
            </div>
          }
          className="flex flex-col items-center gap-6"
        >
          {Array.from(new Array(numPages || 0), (_, index) => {
            const pageNum = index + 1;
            const pageAnnotations = annotations.filter((a) => a.page_number === pageNum);

            return (
              <div
                key={`page_${pageNum}`}
                data-page-number={pageNum}
                className="relative bg-white shadow-xl rounded-md transition-shadow border border-slate-200 dark:border-slate-800"
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  loading=""
                  className="rounded-md overflow-hidden"
                />

                {/* Persistent Google Docs Style Yellow Highlight Overlays */}
                {pageAnnotations.map((ann) => {
                  if (!ann.coordinates) return null;
                  const isActive = activeAnnotation?.id === ann.id;
                  const isResolved = ["verified", "resolved", "closed"].includes(ann.status);

                  return (
                    <div
                      key={ann.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAnnotation(ann);
                        onSelectAnnotation?.(ann.id);
                      }}
                      style={{
                        left: `${ann.coordinates.left}%`,
                        top: `${ann.coordinates.top}%`,
                        width: `${ann.coordinates.width}%`,
                        height: `${ann.coordinates.height}%`,
                      }}
                      title={`"${ann.selected_text || "Highlighted text"}" — ${ann.content}`}
                      className={cn(
                        "absolute rounded-xs cursor-pointer transition-all z-10 pointer-events-auto",
                        isResolved
                          ? "bg-emerald-200/35 border-b-2 border-emerald-500 hover:bg-emerald-300/50"
                          : isActive
                          ? "bg-yellow-400/75 border-b-2 border-yellow-600 ring-2 ring-yellow-400 shadow-sm"
                          : "bg-yellow-300/45 border-b-2 border-yellow-500 hover:bg-yellow-400/65"
                      )}
                    />
                  );
                })}

                {/* Page Number Label in Footer */}
                <div className="absolute -bottom-5 right-2 text-[10px] font-bold text-muted-foreground">
                  Page {pageNum} of {numPages}
                </div>
              </div>
            );
          })}
        </Document>

        {/* ------------------------------------------------------------- */}
        {/* Google Docs Floating [+ Add comment] Action Button           */}
        {/* ------------------------------------------------------------- */}
        {pendingSelection && !showComposer && (
          <div
            style={{
              left: `${pendingSelection.popoverPosition.x}px`,
              top: `${pendingSelection.popoverPosition.y}px`,
            }}
            className="absolute z-30 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-xl border border-white/20 transition-all cursor-pointer hover:scale-105"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Add comment</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Google Docs Inline Comment Composer Card                      */}
        {/* ------------------------------------------------------------- */}
        {pendingSelection && showComposer && (
          <div
            style={{
              left: `${pendingSelection.popoverPosition.x}px`,
              top: `${pendingSelection.popoverPosition.y}px`,
            }}
            className="absolute z-30 w-80 max-w-[90vw] bg-card border border-border shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>New Revision Comment</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowComposer(false);
                  setPendingSelection(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quoted Text Preview */}
            <div className="bg-amber-500/10 border-l-2 border-amber-500 p-2 rounded text-[11px] text-muted-foreground italic line-clamp-3">
              &ldquo;{pendingSelection.text}&rdquo;
            </div>

            {/* Comment Textarea */}
            <textarea
              autoFocus
              rows={3}
              placeholder="Write revision guidance or comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-medium text-foreground"
            />

            {/* Severity Tag Picker */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Severity:</span>
              <div className="flex gap-1">
                {(["info", "minor", "major", "critical"] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityInput(sev)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all cursor-pointer",
                      severityInput === sev
                        ? sev === "critical"
                          ? "bg-rose-500 text-white"
                          : sev === "major"
                          ? "bg-amber-500 text-white"
                          : sev === "minor"
                          ? "bg-sky-500 text-white"
                          : "bg-slate-700 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => {
                  setShowComposer(false);
                  setPendingSelection(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground cursor-pointer"
                disabled={submittingComment || !commentInput.trim()}
                onClick={handleCreateComment}
              >
                {submittingComment && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Comment</span>
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Active Highlight Popover / Comment Details & Replies Card    */}
        {/* ------------------------------------------------------------- */}
        {activeAnnotation && !pendingSelection && (
          <div className="fixed sm:absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-96 max-w-[95vw] bg-card border border-border shadow-2xl rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activeAnnotation.severity === "critical"
                      ? "danger"
                      : activeAnnotation.severity === "major"
                      ? "warning"
                      : "outline"
                  }
                  className="text-[9px] uppercase font-bold"
                >
                  {activeAnnotation.severity}
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Page {activeAnnotation.page_number}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-1.5 py-0.5 rounded capitalize",
                    activeAnnotation.status === "resolved" || activeAnnotation.status === "verified"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : activeAnnotation.status === "addressed"
                      ? "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  )}
                >
                  {activeAnnotation.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveAnnotation(null);
                  onSelectAnnotation?.(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quoted Highlight Snippet */}
            {activeAnnotation.selected_text && (
              <div className="bg-yellow-500/10 border-l-2 border-yellow-500 p-2 rounded text-[11px] text-muted-foreground italic">
                &ldquo;{activeAnnotation.selected_text}&rdquo;
              </div>
            )}

            {/* Reviewer Comment Content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                <span className="text-foreground font-bold">
                  {activeAnnotation.profiles
                    ? `${activeAnnotation.profiles.first_name} ${activeAnnotation.profiles.last_name}`
                    : "Reviewer"}
                </span>
                <span>{new Date(activeAnnotation.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap font-medium">
                {activeAnnotation.content}
              </p>
            </div>

            {/* Threaded Replies */}
            {activeAnnotation.annotation_replies && activeAnnotation.annotation_replies.length > 0 && (
              <div className="space-y-2 border-t border-border pt-2 max-h-36 overflow-y-auto">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Replies:</span>
                {activeAnnotation.annotation_replies.map((rep) => (
                  <div key={rep.id} className="pl-2 border-l-2 border-primary/40 space-y-0.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {rep.profiles ? `${rep.profiles.first_name} ${rep.profiles.last_name}` : "User"}
                      </span>
                      <span>{new Date(rep.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-[11px] text-slate-800 dark:text-slate-200">{rep.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Reply Form */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder={isStudent ? "Reply with revision details..." : "Reply to comment..."}
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddReply(activeAnnotation.id);
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-bold gap-1 cursor-pointer"
                  disabled={submittingReply || !replyInput.trim()}
                  onClick={() => handleAddReply(activeAnnotation.id)}
                >
                  {submittingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>

              {/* Status Action Buttons for Student & Faculty */}
              <div className="flex items-center justify-between pt-1">
                {isStudent ? (
                  activeAnnotation.status !== "addressed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 cursor-pointer h-7"
                      onClick={() => handleStatusChange(activeAnnotation.id, "addressed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      <span>Mark as Addressed in Manuscript</span>
                    </Button>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    {activeAnnotation.status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer h-7"
                        onClick={() => handleStatusChange(activeAnnotation.id, "resolved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        <span>Mark Resolved</span>
                      </Button>
                    )}
                    {activeAnnotation.status === "resolved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs font-semibold text-muted-foreground cursor-pointer h-7"
                        onClick={() => handleStatusChange(activeAnnotation.id, "open")}
                      >
                        Re-open
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
