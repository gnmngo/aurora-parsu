"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  PenTool,
  MousePointer,
  Check,
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
  deleteAnnotationAction,
} from "@/lib/annotations/actions";

// Configure local PDF worker
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

function pointsToSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${(points[0].x + 0.1).toFixed(2)} ${(points[0].y + 0.1).toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`;
  }
  path += ` L ${points[points.length - 1].x.toFixed(2)} ${points[points.length - 1].y.toFixed(2)}`;
  return path;
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
    isDrawing?: boolean;
    svgPath?: string;
    strokeColor?: string;
    strokeWidth?: number;
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

  // Freehand Pen Drawing State
  const [activeTool, setActiveTool] = useState<"select" | "pen">("select");
  const [penColor, setPenColor] = useState<string>("#ef4444");
  const [penWidth, setPenWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawingPage, setCurrentDrawingPage] = useState<number | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Pending Drawing Annotation (composer modal)
  const [pendingDrawing, setPendingDrawing] = useState<{
    pageNumber: number;
    svgPath: string;
    bounds: { left: number; top: number; width: number; height: number };
    strokeColor: string;
    strokeWidth: number;
    popoverPosition: { x: number; y: number };
  } | null>(null);

  const [drawingCommentInput, setDrawingCommentInput] = useState("");
  const [drawingSeverity, setDrawingSeverity] = useState<"info" | "minor" | "major" | "critical">("minor");
  const [submittingDrawing, setSubmittingDrawing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

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
            profiles!created_by ( first_name, last_name )
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
        setActiveAnnotation((prev) => {
          if (!prev) return null;
          return mapped.find((item: AnnotationItem) => item.id === prev.id) || prev;
        });
      }
    } catch (err: unknown) {
      console.error("[InteractivePdfViewer] Error loading annotations:", err);
    } finally {
      setLoadingAnnotations(false);
    }
  }, [documentVersionId, supabase]);

  const onAnnotationCreatedRef = useRef(onAnnotationCreated);
  useEffect(() => {
    onAnnotationCreatedRef.current = onAnnotationCreated;
  }, [onAnnotationCreated]);

  const fetchAnnotationsRef = useRef(fetchAnnotations);
  useEffect(() => {
    fetchAnnotationsRef.current = fetchAnnotations;
  }, [fetchAnnotations]);

  // Sync on mount & Realtime subscription
  useEffect(() => {
    fetchAnnotationsRef.current?.();

    if (!documentVersionId) return;

    let channel: any = null;
    try {
      const channelUnique = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const channelName = `interactive-pdf-annotations-${documentVersionId}-${channelUnique}`;

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
            fetchAnnotationsRef.current?.();
            onAnnotationCreatedRef.current?.();
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
            fetchAnnotationsRef.current?.();
          }
        );

      channel.subscribe();
    } catch (err) {
      console.warn("[InteractivePdfViewer] Realtime subscription init error:", err);
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

  // 1b. Freehand Pen Drawing Handlers
  const getNormalizedPoint = (e: React.PointerEvent<SVGSVGElement>, svgEl: SVGSVGElement) => {
    const rect = svgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>, pageNum: number) => {
    if (activeTool !== "pen" || currentUserRole === "student") return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }

    const pt = getNormalizedPoint(e, e.currentTarget);
    setIsDrawing(true);
    setCurrentDrawingPage(pageNum);
    setCurrentPoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>, pageNum: number) => {
    if (!isDrawing || currentDrawingPage !== pageNum) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = getNormalizedPoint(e, e.currentTarget);
    setCurrentPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const dx = pt.x - last.x;
        const dy = pt.y - last.y;
        if (dx * dx + dy * dy < 0.04) return prev;
      }
      return [...prev, pt];
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>, pageNum: number) => {
    if (!isDrawing || currentDrawingPage !== pageNum) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setCurrentDrawingPage(null);
      return;
    }

    const pathStr = pointsToSvgPath(currentPoints);

    let minX = 100, maxX = 0, minY = 100, maxY = 0;
    currentPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const pad = 1.2;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const width = Math.min(100 - left, (maxX - minX) + pad * 2);
    const height = Math.min(100 - top, (maxY - minY) + pad * 2);

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverX = rect.left + (maxX / 100) * rect.width;
    const popoverY = rect.top + (maxY / 100) * rect.height + 10;

    setPendingDrawing({
      pageNumber: pageNum,
      svgPath: pathStr,
      bounds: { left, top, width, height },
      strokeColor: penColor,
      strokeWidth: penWidth,
      popoverPosition: { x: popoverX, y: popoverY },
    });

    setCurrentPoints([]);
    setCurrentDrawingPage(null);
  };

  const handleSaveDrawing = async () => {
    if (!pendingDrawing || !documentVersionId) return;
    setSubmittingDrawing(true);
    try {
      let saved = false;

      // 1. Try server action first (for audit logs & notifications)
      try {
        const res = await createAnnotationAction({
          documentVersionId,
          pageNumber: pendingDrawing.pageNumber,
          content: drawingCommentInput.trim() || "Freehand pen markup note",
          severity: drawingSeverity,
          selectedText: `[Pen Drawing Markup - Page ${pendingDrawing.pageNumber}]`,
          type: "correction_note",
          coordinates: {
            isDrawing: true,
            svgPath: pendingDrawing.svgPath,
            strokeColor: pendingDrawing.strokeColor,
            strokeWidth: pendingDrawing.strokeWidth,
            left: Number(pendingDrawing.bounds.left.toFixed(2)),
            top: Number(pendingDrawing.bounds.top.toFixed(2)),
            width: Number(pendingDrawing.bounds.width.toFixed(2)),
            height: Number(pendingDrawing.bounds.height.toFixed(2)),
          },
        });

        if (res?.success) {
          saved = true;
        } else {
          console.warn("[handleSaveDrawing] Server action unsuccessful, falling back to direct client save:", res?.error);
        }
      } catch (actionErr) {
        console.warn("[handleSaveDrawing] Server action threw, falling back to direct client save:", actionErr);
      }

      // 2. Direct client fallback if server action failed or threw
      if (!saved) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in to save annotations.");

        const { data: newAnn, error: insertErr } = await supabase
          .from("annotations")
          .insert({
            document_version_id: documentVersionId,
            type: "correction_note",
            page_number: pendingDrawing.pageNumber,
            selected_text: `[Pen Drawing Markup - Page ${pendingDrawing.pageNumber}]`,
            content: drawingCommentInput.trim() || "Freehand pen markup note",
            severity: drawingSeverity,
            status: "open",
            coordinates: {
              isDrawing: true,
              svgPath: pendingDrawing.svgPath,
              strokeColor: pendingDrawing.strokeColor,
              strokeWidth: pendingDrawing.strokeWidth,
              left: Number(pendingDrawing.bounds.left.toFixed(2)),
              top: Number(pendingDrawing.bounds.top.toFixed(2)),
              width: Number(pendingDrawing.bounds.width.toFixed(2)),
              height: Number(pendingDrawing.bounds.height.toFixed(2)),
            },
            created_by: user.id,
          })
          .select()
          .single();

        if (insertErr || !newAnn) {
          throw new Error(insertErr?.message || "Failed to save drawing annotation.");
        }

        try {
          await supabase.from("annotation_history").insert({
            annotation_id: newAnn.id,
            from_status: null,
            to_status: "open",
            notes: "Freehand pen markup added",
            changed_by: user.id,
          });
        } catch {
          // non-fatal
        }
      }

      toast.success("Freehand pen drawing saved!");
      setPendingDrawing(null);
      setDrawingCommentInput("");
      await fetchAnnotations();
      onAnnotationCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving drawing";
      toast.error(msg);
    } finally {
      setSubmittingDrawing(false);
    }
  };

  // 2. Handle Text Selection MouseUp (Google Docs trigger)
  const handleMouseUp = () => {
    if (activeTool === "pen") return;
    // Students can select text to read/copy, but cannot create reviewer annotations
    if (currentUserRole === "student") return;
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
      let saved = false;

      // 1. Try via Server Action (audits, history, notifications)
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

        if (res?.success) {
          saved = true;
        } else {
          console.warn("[handleCreateComment] Server action returned error, attempting direct client fallback:", res?.error);
        }
      } catch (actionErr) {
        console.warn("[handleCreateComment] Server action exception, attempting direct client fallback:", actionErr);
      }

      // 2. Direct client fallback if server action failed or threw
      if (!saved) {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          throw new Error("Unauthorized. Please log in to add comments.");
        }

        const { data: newAnn, error: insertErr } = await supabase
          .from("annotations")
          .insert({
            document_version_id: documentVersionId,
            type: "highlight",
            page_number: pendingSelection.pageNumber,
            selected_text: pendingSelection.text,
            content: commentInput.trim(),
            severity: severityInput,
            status: "open",
            coordinates: pendingSelection.coordinates,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertErr || !newAnn) {
          throw new Error(insertErr?.message || "Failed to save inline comment.");
        }

        try {
          await supabase.from("annotation_history").insert({
            annotation_id: newAnn.id,
            from_status: null,
            to_status: "open",
            notes: "Initial feedback comment created",
            changed_by: user.id,
          });
        } catch {
          // non-fatal
        }
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
      let saved = false;

      try {
        const res = await createAnnotationReplyAction(annotationId, replyInput.trim());
        if (res?.success) saved = true;
      } catch (e) {
        console.warn("[handleAddReply] Server action error, trying direct fallback:", e);
      }

      if (!saved) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in to reply.");

        const { error: replyErr } = await supabase
          .from("annotation_replies")
          .insert({
            annotation_id: annotationId,
            content: replyInput.trim(),
            created_by: user.id,
          });

        if (replyErr) throw new Error(replyErr.message || "Failed to post reply.");
      }

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
      let saved = false;

      try {
        const res = await updateAnnotationStatusAction({
          annotationId,
          newStatus,
        });
        if (res?.success) saved = true;
      } catch (e) {
        console.warn("[handleStatusChange] Server action error, trying direct fallback:", e);
      }

      if (!saved) {
        const { error: updErr } = await supabase
          .from("annotations")
          .update({ status: newStatus })
          .eq("id", annotationId);

        if (updErr) throw new Error(updErr.message || "Failed to update status.");
      }

      toast.success(`Comment status changed to "${newStatus}"`);
      await fetchAnnotations();
      onAnnotationCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Status update failed";
      toast.error(msg);
    }
  };

  // 6. Delete Annotation
  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!confirm("Are you sure you want to delete this markup/comment?")) return;
    try {
      let deleted = false;

      try {
        const res = await deleteAnnotationAction(annotationId);
        if (res?.success) deleted = true;
      } catch (e) {
        console.warn("[handleDeleteAnnotation] Server action error, trying direct fallback:", e);
      }

      if (!deleted) {
        const { error: delErr } = await supabase
          .from("annotations")
          .delete()
          .eq("id", annotationId);

        if (delErr) throw new Error(delErr.message || "Failed to delete annotation.");
      }

      toast.success("Markup deleted successfully.");
      setActiveAnnotation(null);
      onSelectAnnotation?.(null);
      await fetchAnnotations();
      onAnnotationCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
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

          {/* Tool Switcher (Faculty only) */}
          {!isStudent && (
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTool("select");
                  setPendingDrawing(null);
                }}
                className={cn(
                  "h-7 text-xs font-bold gap-1 px-2.5 rounded-md cursor-pointer transition-all",
                  activeTool === "select"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Cursor / Text Selection Mode"
              >
                <MousePointer className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Select</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTool("pen");
                  setPendingSelection(null);
                  setShowComposer(false);
                }}
                className={cn(
                  "h-7 text-xs font-bold gap-1 px-2.5 rounded-md cursor-pointer transition-all",
                  activeTool === "pen"
                    ? "bg-primary text-primary-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Live Freehand Pen Drawing Mode"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Pen</span>
              </Button>
            </div>
          )}

          {/* Pen Styling Bar (When Pen tool is active) */}
          {!isStudent && activeTool === "pen" && (
            <div className="flex items-center gap-2 bg-card px-2 py-0.5 rounded-lg border border-border shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-1">
                {[
                  { color: "#ef4444", label: "Red" },
                  { color: "#2563eb", label: "Blue" },
                  { color: "#d97706", label: "Amber" },
                  { color: "#059669", label: "Emerald" },
                  { color: "#7c3aed", label: "Purple" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setPenColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={cn(
                      "h-4 w-4 rounded-full transition-transform cursor-pointer",
                      penColor === c.color ? "ring-2 ring-offset-1 ring-primary scale-110" : "opacity-80 hover:opacity-100"
                    )}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="h-3.5 w-px bg-border mx-0.5" />

              <div className="flex items-center gap-1">
                {[
                  { width: 2, label: "Fine" },
                  { width: 3.5, label: "Medium" },
                  { width: 5, label: "Bold" },
                ].map((w) => (
                  <button
                    key={w.width}
                    type="button"
                    onClick={() => setPenWidth(w.width)}
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all",
                      penWidth === w.width
                        ? "bg-muted text-foreground ring-1 ring-border"
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

        {/* Guidance badge */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {currentUserRole === "student" ? (
            <>
              <span className="hidden md:inline font-medium">
                Click any highlights or pen drawings to view faculty suggestions &amp; reply
              </span>
              <span className="md:hidden font-medium">Click markups to view feedback</span>
            </>
          ) : activeTool === "pen" ? (
            <>
              <span className="hidden md:inline font-medium text-primary font-semibold">
                Draw anywhere on the manuscript to circle diagrams or leave margin notes
              </span>
              <span className="md:hidden font-medium text-primary font-semibold">Draw freehand markup</span>
            </>
          ) : (
            <>
              <span className="hidden md:inline font-medium">
                Highlight any text in the PDF to leave an inline comment
              </span>
              <span className="md:hidden font-medium">Highlight text to comment</span>
            </>
          )}
          <Badge variant="outline" className="text-[10px] ml-1 font-bold">
            {annotations.length} Markups
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

                {/* Persistent Google Docs Style Yellow Highlight Overlays (Text comments) */}
                {pageAnnotations
                  .filter((ann) => ann.coordinates && !ann.coordinates.isDrawing)
                  .map((ann) => {
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
                          left: `${ann.coordinates!.left}%`,
                          top: `${ann.coordinates!.top}%`,
                          width: `${ann.coordinates!.width}%`,
                          height: `${ann.coordinates!.height}%`,
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

                {/* Freehand Vector SVG Overlay Layer */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  onPointerDown={(e) => handlePointerDown(e, pageNum)}
                  onPointerMove={(e) => handlePointerMove(e, pageNum)}
                  onPointerUp={(e) => handlePointerUp(e, pageNum)}
                  className={cn(
                    "absolute inset-0 w-full h-full z-20 touch-none",
                    activeTool === "pen" && !isStudent
                      ? "pointer-events-auto cursor-crosshair"
                      : "pointer-events-none"
                  )}
                >
                  {/* 1. Saved Vector Ink Drawings on this page */}
                  {pageAnnotations
                    .filter((ann) => ann.coordinates?.isDrawing && ann.coordinates.svgPath)
                    .map((ann) => {
                      const coords = ann.coordinates!;
                      const isSelected = activeAnnotation?.id === ann.id;
                      const isResolved = ["verified", "resolved", "closed"].includes(ann.status);
                      const strokeColor = isResolved ? "#10b981" : (coords.strokeColor || "#ef4444");

                      return (
                        <g key={`drawing_${ann.id}`} className="pointer-events-auto">
                          {isSelected && (
                            <path
                              d={coords.svgPath}
                              stroke="#f59e0b"
                              strokeWidth={(coords.strokeWidth || 3) + 3}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-70 animate-pulse"
                            />
                          )}
                          <path
                            d={coords.svgPath}
                            stroke={strokeColor}
                            strokeWidth={coords.strokeWidth || 3}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn(
                              "cursor-pointer transition-all hover:stroke-[4.5px]",
                              isSelected && "filter drop-shadow-md"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAnnotation(ann);
                              onSelectAnnotation?.(ann.id);
                            }}
                          >
                            <title>{`${ann.content} (by ${ann.profiles?.first_name || "Faculty"})`}</title>
                          </path>
                        </g>
                      );
                    })}

                  {/* 2. Active stroke currently being drawn by user */}
                  {isDrawing && currentDrawingPage === pageNum && currentPoints.length > 1 && (
                    <path
                      d={pointsToSvgPath(currentPoints)}
                      stroke={penColor}
                      strokeWidth={penWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none drop-shadow-sm"
                    />
                  )}

                  {/* 3. Pending completed stroke awaiting saving */}
                  {pendingDrawing && pendingDrawing.pageNumber === pageNum && (
                    <g className="pointer-events-none">
                      <path
                        d={pendingDrawing.svgPath}
                        stroke={pendingDrawing.strokeColor}
                        strokeWidth={pendingDrawing.strokeWidth + 2}
                        strokeOpacity={0.3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="3 3"
                      />
                      <path
                        d={pendingDrawing.svgPath}
                        stroke={pendingDrawing.strokeColor}
                        strokeWidth={pendingDrawing.strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </svg>

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
        {/* Freehand Pen Drawing Markup Composer Card                    */}
        {/* ------------------------------------------------------------- */}
        {pendingDrawing && (
          <div
            style={{
              left: Math.min(Math.max(16, pendingDrawing.popoverPosition.x - 140), typeof window !== "undefined" ? window.innerWidth - 320 : 400),
              top: Math.max(60, pendingDrawing.popoverPosition.y),
            }}
            className="fixed z-50 w-72 bg-card rounded-xl border border-border shadow-2xl p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <PenTool className="h-3.5 w-3.5 text-primary" />
                <span>Save Pen Markup</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  Page {pendingDrawing.pageNumber}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setPendingDrawing(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
                title="Discard markup"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={2}
              value={drawingCommentInput}
              onChange={(e) => setDrawingCommentInput(e.target.value)}
              placeholder="Add revision remark or instructions for this drawing..."
              className="w-full text-xs p-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />

            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Severity:</span>
              <div className="flex gap-1">
                {(["info", "minor", "major", "critical"] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setDrawingSeverity(sev)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold capitalize transition-all cursor-pointer",
                      drawingSeverity === sev
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

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => setPendingDrawing(null)}
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground cursor-pointer"
                disabled={submittingDrawing}
                onClick={handleSaveDrawing}
              >
                {submittingDrawing && <Loader2 className="h-3 w-3 animate-spin" />}
                <Check className="h-3 w-3" />
                <span>Save</span>
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

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Delete annotation"
                  onClick={() => handleDeleteAnnotation(activeAnnotation.id)}
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAnnotation(null);
                    onSelectAnnotation?.(null);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quoted Highlight Snippet or Drawing Badge */}
            {activeAnnotation.coordinates?.isDrawing ? (
              <div className="bg-primary/5 border border-primary/20 p-2 rounded-lg text-xs flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary shrink-0" />
                <span className="font-bold text-foreground">Freehand Pen Markup</span>
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/20 ml-auto shrink-0 shadow-xs"
                  style={{ backgroundColor: activeAnnotation.coordinates.strokeColor || "#ef4444" }}
                  title="Stroke Color"
                />
              </div>
            ) : activeAnnotation.selected_text ? (
              <div className="bg-amber-500/15 border-l-2 border-amber-500 p-2 rounded text-[11px] text-foreground font-semibold italic">
                &ldquo;{activeAnnotation.selected_text}&rdquo;
              </div>
            ) : null}

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
              <p className="text-xs text-foreground bg-muted/60 border border-border/40 p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap font-semibold">
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
                    <p className="text-[11px] text-foreground font-medium">{rep.content}</p>
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
