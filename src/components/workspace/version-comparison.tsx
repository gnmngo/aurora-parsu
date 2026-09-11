"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Columns,
  Highlighter,
  CheckCircle2,
  Check,
  ListChecks,
  X,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Link2Off,
  Locate,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateAnnotationStatusAction } from "@/lib/annotations/actions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ComparisonDocumentPane, ComparisonAnnotation } from "./comparison-document-pane";

interface VersionComparisonProps {
  documentVersions: { id: string; file_url?: string; storage_path?: string; version_number?: number }[];
  projectId?: string;
  stageId?: string;
}

export function VersionComparison({ documentVersions, projectId, stageId }: VersionComparisonProps) {
  const { user, roles } = useAuth();
  const isFaculty = roles.some((r) => ["adviser", "panelist", "coordinator", "sys_admin"].includes(r));

  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [leftAnnotations, setLeftAnnotations] = useState<ComparisonAnnotation[]>([]);
  const [rightAnnotations, setRightAnnotations] = useState<ComparisonAnnotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [isHighlightsDrawerOpen, setIsHighlightsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "checklist">("side-by-side");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Active Highlight Selection & Jump State
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isSyncScrollEnabled, setIsSyncScrollEnabled] = useState(true);
  const [leftScale, setLeftScale] = useState(0.85);
  const [rightScale, setRightScale] = useState(0.85);

  const baseContainerRef = useRef<HTMLDivElement | null>(null);
  const revContainerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);

  const supabase = createClient();

  useEffect(() => {
    if (documentVersions && documentVersions.length >= 2) {
      setLeftVersionId(documentVersions[documentVersions.length - 2].id);
      setRightVersionId(documentVersions[documentVersions.length - 1].id);
    } else if (documentVersions && documentVersions.length > 0) {
      setLeftVersionId(documentVersions[0].id);
      setRightVersionId(documentVersions[0].id);
    }
  }, [documentVersions]);

  const loadVersionAnnotations = useCallback(async () => {
    const versionIdsToFetch = [leftVersionId, rightVersionId].filter(Boolean);
    if (versionIdsToFetch.length === 0) return;

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
          created_at,
          profiles:profiles!annotations_created_by_fkey ( first_name, last_name )
        `)
        .in("document_version_id", versionIdsToFetch)
        .order("page_number", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        const left = data.filter((a: any) => a.document_version_id === leftVersionId);
        const right = data.filter((a: any) => a.document_version_id === rightVersionId);

        setLeftAnnotations(
          left.map((ann: any) => ({
            ...ann,
            profiles: Array.isArray(ann.profiles) ? ann.profiles[0] : ann.profiles,
          }))
        );
        setRightAnnotations(
          right.map((ann: any) => ({
            ...ann,
            profiles: Array.isArray(ann.profiles) ? ann.profiles[0] : ann.profiles,
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading comparison annotations:", err);
    } finally {
      setLoadingAnnotations(false);
    }
  }, [leftVersionId, rightVersionId, supabase]);

  useEffect(() => {
    loadVersionAnnotations();
  }, [loadVersionAnnotations]);

  // Jump smoothly to a specific annotation and align both Base and Revised viewports
  const handleJumpToAnnotation = useCallback((ann: ComparisonAnnotation) => {
    setActiveAnnotationId(ann.id);

    // 1. Scroll Base Viewport (left) to the page and center the highlighted line
    if (baseContainerRef.current) {
      const pageEl = baseContainerRef.current.querySelector(
        `[data-pane-id="base"][data-page-number="${ann.page_number}"]`
      ) as HTMLElement | null;

      if (pageEl) {
        const pageTop = pageEl.offsetTop;
        const highlightTopOffset = ann.coordinates?.top
          ? (ann.coordinates.top / 100) * pageEl.offsetHeight
          : 0;
        const targetScrollTop = pageTop + highlightTopOffset - (baseContainerRef.current.clientHeight / 2) + 40;

        baseContainerRef.current.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }

    // 2. Align Revised Viewport (right) to the exact same page for side-by-side comparison!
    if (revContainerRef.current) {
      const revPageEl = revContainerRef.current.querySelector(
        `[data-pane-id="revised"][data-page-number="${ann.page_number}"]`
      ) as HTMLElement | null;

      if (revPageEl) {
        revContainerRef.current.scrollTo({
          top: Math.max(0, revPageEl.offsetTop - 20),
          behavior: "smooth",
        });
      }
    }
  }, []);

  // Revision Stepper: Next / Prev
  const currentAnnotationIndex = leftAnnotations.findIndex((a) => a.id === activeAnnotationId);

  const handleNextRevision = () => {
    if (leftAnnotations.length === 0) return;
    const nextIdx = currentAnnotationIndex < leftAnnotations.length - 1 ? currentAnnotationIndex + 1 : 0;
    handleJumpToAnnotation(leftAnnotations[nextIdx]);
  };

  const handlePrevRevision = () => {
    if (leftAnnotations.length === 0) return;
    const prevIdx = currentAnnotationIndex > 0 ? currentAnnotationIndex - 1 : leftAnnotations.length - 1;
    handleJumpToAnnotation(leftAnnotations[prevIdx]);
  };

  // Synchronized Scrolling between viewports
  const handleBaseScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isSyncScrollEnabled || isSyncingScrollRef.current) return;
    const base = e.currentTarget;
    const rev = revContainerRef.current;
    if (!rev) return;

    isSyncingScrollRef.current = true;
    const baseMax = base.scrollHeight - base.clientHeight;
    if (baseMax > 0) {
      const ratio = base.scrollTop / baseMax;
      const revMax = rev.scrollHeight - rev.clientHeight;
      rev.scrollTop = ratio * revMax;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleRevScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isSyncScrollEnabled || isSyncingScrollRef.current) return;
    const rev = e.currentTarget;
    const base = baseContainerRef.current;
    if (!base) return;

    isSyncingScrollRef.current = true;
    const revMax = rev.scrollHeight - rev.clientHeight;
    if (revMax > 0) {
      const ratio = rev.scrollTop / revMax;
      const baseMax = base.scrollHeight - base.clientHeight;
      base.scrollTop = ratio * baseMax;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleToggleVerification = async (annotationId: string, currentStatus: string) => {
    const targetStatus = currentStatus === "verified" ? "addressed" : "verified";
    setVerifyingId(annotationId);
    try {
      await updateAnnotationStatusAction({
        annotationId,
        newStatus: targetStatus as any,
        notes: `Reviewer verified resolved in side-by-side comparison.`,
      });

      toast.success(
        targetStatus === "verified"
          ? "Highlighted revision marked as Verified in revised draft!"
          : "Revision status updated."
      );
      await loadVersionAnnotations();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification status.");
    } finally {
      setVerifyingId(null);
    }
  };

  if (!documentVersions || documentVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground">
        <AlertTriangle className="h-8 w-8 opacity-30 mb-2" />
        <p>No manuscript versions available to compare.</p>
      </div>
    );
  }

  const leftVer = documentVersions.find((v) => v.id === leftVersionId);
  const rightVer = documentVersions.find((v) => v.id === rightVersionId);

  const leftResolvedCount = leftAnnotations.filter((a) => a.status === "verified" || a.status === "resolved").length;
  const filteredLeftAnnotations = filterStatus === "all"
    ? leftAnnotations
    : filterStatus === "unresolved"
      ? leftAnnotations.filter((a) => a.status !== "verified" && a.status !== "resolved")
      : leftAnnotations.filter((a) => a.status === "verified" || a.status === "resolved");

  return (
    <div className="flex flex-col h-full space-y-2 overflow-hidden">
      {/* ── Compact Top Comparison Toolbar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-card border border-border rounded-xl shadow-2xs shrink-0">
        {/* Left: Quick Draft Selectors */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Base / Previous draft" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground hidden sm:inline">Base:</span>
            <select
              value={leftVersionId}
              onChange={(e) => setLeftVersionId(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              {documentVersions.map((v, idx) => (
                <option key={v.id} value={v.id}>
                  Version {v.version_number || idx + 1}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Revised / Latest draft" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground hidden sm:inline">Revised:</span>
            <select
              value={rightVersionId}
              onChange={(e) => setRightVersionId(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none cursor-pointer"
            >
              {documentVersions.map((v, idx) => (
                <option key={v.id} value={v.id}>
                  Version {v.version_number || idx + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: View Mode Switcher + Revision Stepper */}
        <div className="flex items-center gap-2">
          {/* Dual View vs Checklist Switcher */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                viewMode === "side-by-side"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Dual View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("checklist")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                viewMode === "checklist"
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>Audit Checklist ({leftAnnotations.length})</span>
            </button>
          </div>

          {/* Quick Line Highlight Stepper in Toolbar */}
          {leftAnnotations.length > 0 && viewMode === "side-by-side" && (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-0.5 text-xs text-amber-800 dark:text-amber-300">
              <Highlighter className="h-3 w-3 text-amber-600 shrink-0" />
              <button
                type="button"
                onClick={handlePrevRevision}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-amber-500/20 cursor-pointer"
                title="Jump to previous highlight"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-black px-1 min-w-14 text-center select-none">
                {currentAnnotationIndex >= 0 ? `${currentAnnotationIndex + 1} of ${leftAnnotations.length}` : `1–${leftAnnotations.length}`}
              </span>
              <button
                type="button"
                onClick={handleNextRevision}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-amber-500/20 cursor-pointer"
                title="Jump to next highlight"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Sync Scroll Toggle */}
          {viewMode === "side-by-side" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSyncScrollEnabled(!isSyncScrollEnabled)}
              className={cn(
                "h-7 text-[10px] font-bold gap-1 px-2 rounded-lg cursor-pointer transition-all",
                isSyncScrollEnabled
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={isSyncScrollEnabled ? "Synchronized scrolling enabled" : "Independent scrolling enabled"}
            >
              {isSyncScrollEnabled ? (
                <>
                  <LinkIcon className="h-3 w-3" />
                  <span className="hidden xl:inline">Sync Scroll</span>
                </>
              ) : (
                <>
                  <Link2Off className="h-3 w-3 text-muted-foreground" />
                  <span className="hidden xl:inline">Split Scroll</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Right: Revision Notes Drawer Trigger & Status Pill */}
        <div className="flex items-center gap-2">
          {leftAnnotations.length > 0 && viewMode === "side-by-side" && (
            <Button
              type="button"
              variant={isHighlightsDrawerOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsHighlightsDrawerOpen(!isHighlightsDrawerOpen)}
              className={cn(
                "h-7 text-[10px] font-bold gap-1.5 rounded-lg cursor-pointer transition-all shadow-2xs",
                isHighlightsDrawerOpen
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "border-amber-300/70 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span>Revision Notes ({leftAnnotations.length})</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                leftResolvedCount === leftAnnotations.length
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200"
              )}>
                {leftResolvedCount}/{leftAnnotations.length} verified
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* ── CHECKLIST AUDIT VIEW ─────────────────────────────────────────── */}
      {viewMode === "checklist" ? (
        <Card className="flex-1 min-h-0 overflow-hidden flex flex-col border-border shadow-xs">
          <div className="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-primary" />
                Reviewer Highlights &amp; Revisions Verification Table
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Every text segment highlighted in <strong>Draft v{leftVer?.version_number || "1"}</strong> is cataloged here so you can verify that authors addressed each item in <strong>Draft v{rightVer?.version_number || "2"}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={cn("px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer", filterStatus === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  All ({leftAnnotations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("unresolved")}
                  className={cn("px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer", filterStatus === "unresolved" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground")}
                >
                  Pending ({leftAnnotations.length - leftResolvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("verified")}
                  className={cn("px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer", filterStatus === "verified" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}
                >
                  Verified ({leftResolvedCount})
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredLeftAnnotations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-foreground">No items in this filter.</p>
                <p className="text-[11px]">All reviewer highlights have been inspected or verified.</p>
              </div>
            ) : (
              filteredLeftAnnotations.map((ann, idx) => (
                <div
                  key={ann.id}
                  className={cn(
                    "border rounded-xl p-3.5 space-y-3 transition-all",
                    ann.status === "verified" || ann.status === "resolved"
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
                      : "border-border bg-card shadow-2xs hover:border-amber-400"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
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
                        className="text-[9px] font-bold"
                      >
                        Page {ann.page_number} • {ann.severity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Inspect in Dual View button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewMode("side-by-side");
                          handleJumpToAnnotation(ann);
                        }}
                        className="h-6 text-[10px] font-bold gap-1 px-2 cursor-pointer"
                      >
                        <Locate className="h-3 w-3 text-amber-500" />
                        Locate in PDF
                      </Button>

                      {isFaculty && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={verifyingId === ann.id}
                          onClick={() => handleToggleVerification(ann.id, ann.status)}
                          className={cn(
                            "h-6 text-[10px] font-bold gap-1 px-2 cursor-pointer",
                            ann.status === "verified"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          <Check className="h-3 w-3" />
                          {ann.status === "verified" ? "Verified ✓ (Undo)" : "Verify Resolution in v2"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {ann.selected_text && (
                    <div className="rounded-lg bg-amber-500/10 border-l-4 border-amber-500 p-2.5 text-xs text-foreground font-serif leading-relaxed">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1 font-sans">
                        Highlighted Text Segment in Draft v{leftVer?.version_number || "1"}:
                      </span>
                      &ldquo;{ann.selected_text}&rdquo;
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Reviewer Note / Required Revision:</p>
                    <p className="text-xs text-foreground bg-muted/40 rounded-lg p-2.5 font-medium leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : (
        /* ── SIDE BY SIDE DUAL VIEWPORT VIEW (With In-Document Highlights) ─ */
        <div className="flex-1 min-h-0 flex gap-2 overflow-hidden relative">
          {/* Base Version Viewport (Left - Shows In-Document Line Highlights) */}
          <ComparisonDocumentPane
            paneId="base"
            title={`Base: Version ${leftVer?.version_number || "1"}`}
            versionNumber={leftVer?.version_number || 1}
            badgeText={leftAnnotations.length > 0 ? `${leftAnnotations.length} highlights` : undefined}
            badgeVariant="outline"
            dotColor="bg-amber-500"
            fileUrl={leftVer?.file_url}
            annotations={leftAnnotations}
            activeAnnotationId={activeAnnotationId}
            onSelectAnnotation={(ann) => {
              setActiveAnnotationId(ann.id);
              setIsHighlightsDrawerOpen(true);
            }}
            containerRef={baseContainerRef}
            onScroll={handleBaseScroll}
            scale={leftScale}
            onScaleChange={setLeftScale}
          />

          {/* Revised Version Viewport (Right - Shows Revised Manuscript) */}
          <ComparisonDocumentPane
            paneId="revised"
            title={`Revised: Version ${rightVer?.version_number || "2"} (Latest)`}
            versionNumber={rightVer?.version_number || 2}
            badgeText="Active Draft"
            badgeVariant="success"
            dotColor="bg-emerald-500"
            fileUrl={rightVer?.file_url}
            annotations={rightAnnotations}
            activeAnnotationId={activeAnnotationId}
            onSelectAnnotation={(ann) => {
              setActiveAnnotationId(ann.id);
            }}
            containerRef={revContainerRef}
            onScroll={handleRevScroll}
            scale={rightScale}
            onScaleChange={setRightScale}
          />

          {/* ── Slide-Out Revision Highlights Inspector Drawer ────────────── */}
          {isHighlightsDrawerOpen && (
            <div className="w-80 shrink-0 h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-md animate-in slide-in-from-right-10 duration-200">
              {/* Drawer Header */}
              <div className="px-3 py-2 border-b border-border bg-amber-500/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Highlighter className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate">
                    Revision Notes (v{leftVer?.version_number || "1"})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHighlightsDrawerOpen(false)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Drawer Filter & Progress */}
              <div className="p-2 border-b border-border/80 bg-muted/20 flex items-center justify-between text-[10px] shrink-0">
                <span className="font-bold text-muted-foreground">
                  {leftResolvedCount}/{leftAnnotations.length} Verified
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterStatus("all")}
                    className={cn("px-1.5 py-0.5 rounded font-bold cursor-pointer", filterStatus === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("unresolved")}
                    className={cn("px-1.5 py-0.5 rounded font-bold cursor-pointer", filterStatus === "unresolved" ? "bg-amber-600 text-white" : "text-muted-foreground hover:bg-muted")}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("verified")}
                    className={cn("px-1.5 py-0.5 rounded font-bold cursor-pointer", filterStatus === "verified" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted")}
                  >
                    Verified
                  </button>
                </div>
              </div>

              {/* Drawer Cards List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredLeftAnnotations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-8">
                    No highlights matching filter.
                  </p>
                ) : (
                  filteredLeftAnnotations.map((ann, idx) => {
                    const isSelected = activeAnnotationId === ann.id;
                    const isVerified = ann.status === "verified" || ann.status === "resolved";

                    return (
                      <div
                        key={ann.id}
                        onClick={() => handleJumpToAnnotation(ann)}
                        className={cn(
                          "rounded-lg border p-2.5 text-xs space-y-2 transition-all shadow-2xs cursor-pointer",
                          isSelected
                            ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/10 shadow-md"
                            : isVerified
                            ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500"
                            : "border-border bg-card hover:border-amber-400"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
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
                              className="text-[9px] font-bold px-1.5 py-0"
                            >
                              Page {ann.page_number}
                            </Badge>
                          </div>
                          <span className="text-[9px] capitalize font-bold text-muted-foreground">
                            {ann.status}
                          </span>
                        </div>

                        {ann.selected_text && (
                          <p className="text-[11px] text-foreground font-serif bg-amber-500/15 rounded p-1.5 border-l-2 border-amber-500 italic leading-snug">
                            &ldquo;{ann.selected_text}&rdquo;
                          </p>
                        )}

                        <p className="text-[11px] text-foreground font-medium pl-0.5 leading-snug">
                          {ann.content}
                        </p>

                        <div className="pt-1 border-t border-border/50 flex items-center justify-between gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpToAnnotation(ann);
                            }}
                            className="h-6 text-[10px] font-semibold gap-1 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                          >
                            <Locate className="h-3 w-3" />
                            Jump to Line
                          </Button>

                          {isFaculty && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={verifyingId === ann.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleVerification(ann.id, ann.status);
                              }}
                              className={cn(
                                "h-6 text-[10px] font-bold gap-1 rounded-md px-2 cursor-pointer",
                                ann.status === "verified"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              )}
                            >
                              <Check className="h-3 w-3" />
                              {ann.status === "verified" ? "Verified ✓" : "Mark Verified"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
