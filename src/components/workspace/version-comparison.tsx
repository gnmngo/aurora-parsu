"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Columns,
  Highlighter,
  CheckCircle2,
  Clock,
  Check,
  ListChecks,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateAnnotationStatusAction } from "@/lib/annotations/actions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface VersionComparisonProps {
  documentVersions: { id: string; file_url?: string; storage_path?: string; version_number?: number }[];
  projectId?: string;
  stageId?: string;
}

interface VersionAnnotation {
  id: string;
  document_version_id: string;
  page_number: number;
  type?: string;
  severity: "info" | "minor" | "major" | "critical";
  status: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "closed";
  content: string;
  selected_text?: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function VersionComparison({ documentVersions, projectId, stageId }: VersionComparisonProps) {
  const { user, roles } = useAuth();
  const isFaculty = roles.some((r) => ["adviser", "panelist", "coordinator", "sys_admin"].includes(r));

  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [leftAnnotations, setLeftAnnotations] = useState<VersionAnnotation[]>([]);
  const [rightAnnotations, setRightAnnotations] = useState<VersionAnnotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [isLeftTrayOpen, setIsLeftTrayOpen] = useState(true);
  const [isRightTrayOpen, setIsRightTrayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "checklist">("side-by-side");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
    <div className="flex flex-col h-full space-y-3">
      {/* Top Controller Card */}
      <Card className="shadow-xs shrink-0 border-border">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Left Version */}
              <div className="space-y-1 w-full sm:w-44">
                <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                  Base / Previous Draft
                </label>
                <select
                  value={leftVersionId}
                  onChange={(e) => setLeftVersionId(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-semibold focus:outline-none cursor-pointer"
                >
                  {documentVersions.map((v, idx) => (
                    <option key={v.id} value={v.id}>
                      Version {v.version_number || idx + 1}
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground mt-4 shrink-0" />

              {/* Right Version */}
              <div className="space-y-1 w-full sm:w-44">
                <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  Revised / Latest Draft
                </label>
                <select
                  value={rightVersionId}
                  onChange={(e) => setRightVersionId(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-semibold focus:outline-none cursor-pointer"
                >
                  {documentVersions.map((v, idx) => (
                    <option key={v.id} value={v.id}>
                      Version {v.version_number || idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("side-by-side")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                    viewMode === "side-by-side" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns className="h-3.5 w-3.5" />
                  Side-by-Side Dual Review
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("checklist")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                    viewMode === "checklist" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Revisions Audit Checklist ({leftAnnotations.length})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Human-in-the-loop reminder */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>
                Comparing <strong>Version {leftVer?.version_number || "1"}</strong> against <strong>Version {rightVer?.version_number || "2"}</strong>
              </span>
              <span className="text-border">•</span>
              <span>
                Highlights to verify: <strong className="text-foreground">{leftAnnotations.length}</strong> ({leftResolvedCount} verified)
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground">Filter highlights:</span>
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
        </CardContent>
      </Card>

      {/* CHECKLIST AUDIT VIEW */}
      {viewMode === "checklist" ? (
        <Card className="flex-1 overflow-hidden flex flex-col border-border shadow-xs">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-primary" />
                Reviewer Highlights &amp; Revisions Verification Table
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Every text segment highlighted in <strong>Draft v{leftVer?.version_number || "1"}</strong> is cataloged here so you can verify that authors addressed each item in <strong>Draft v{rightVer?.version_number || "2"}</strong>.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-foreground">
                {leftResolvedCount} of {leftAnnotations.length} Verified
              </span>
              <div className="w-28 h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${leftAnnotations.length > 0 ? (leftResolvedCount / leftAnnotations.length) * 100 : 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredLeftAnnotations.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/60" />
                <p className="font-bold text-foreground">No highlights matching filter</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  All items are verified or no comments were left on this version.
                </p>
              </div>
            ) : (
              filteredLeftAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all shadow-xs space-y-3",
                    ann.status === "verified" || ann.status === "resolved"
                      ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
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
                        className="text-[10px] font-bold px-2 py-0.5 uppercase"
                      >
                        Page {ann.page_number} • {ann.severity}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">
                        {ann.profiles ? `${ann.profiles.first_name} ${ann.profiles.last_name}` : "Reviewer"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ann.status === "verified"
                            ? "success"
                            : ann.status === "addressed"
                              ? "info"
                              : ann.status === "in_progress"
                                ? "warning"
                                : "outline"
                        }
                        className="text-[10px] font-bold capitalize"
                      >
                        {ann.status}
                      </Badge>
                      {isFaculty && (
                        <Button
                          type="button"
                          size="sm"
                          variant={ann.status === "verified" ? "outline" : "default"}
                          disabled={verifyingId === ann.id}
                          onClick={() => handleToggleVerification(ann.id, ann.status)}
                          className={cn(
                            "h-7 text-[10px] font-bold gap-1 rounded-lg",
                            ann.status === "verified"
                              ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          <Check className="h-3 w-3" />
                          {ann.status === "verified" ? "Verified ✓ (Click to Undo)" : "Mark Verified in v" + (rightVer?.version_number || "2")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Highlighted text snippet */}
                  {ann.selected_text && (
                    <div className="rounded-lg bg-amber-500/10 border-l-4 border-amber-500 p-2.5 text-xs text-foreground font-serif leading-relaxed">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1 font-sans">
                        Highlighted Text Segment in Draft v{leftVer?.version_number || "1"}:
                      </span>
                      &ldquo;{ann.selected_text}&rdquo;
                    </div>
                  )}

                  {/* Reviewer directive/comment */}
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
        /* SIDE BY SIDE DUAL VIEWPORT VIEW */
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Base Version Viewport (Left) */}
          <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-foreground">
                  Base: Version {leftVer?.version_number || "1"}
                </span>
                <Badge variant="outline" className="text-[9px] font-bold">
                  {leftAnnotations.length} highlights
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLeftTrayOpen(!isLeftTrayOpen)}
                  className="h-6 text-[10px] gap-1 font-bold cursor-pointer"
                  title="Toggle highlight notes drawer"
                >
                  <Highlighter className="h-3 w-3 text-amber-600" />
                  Highlights ({leftAnnotations.length})
                  {isLeftTrayOpen ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
                </Button>
                {leftVer?.file_url && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" asChild>
                    <a href={leftVer.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> New Tab
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Left Highlights Collapsible Tray */}
            {isLeftTrayOpen && (
              <div className="max-h-52 overflow-y-auto border-b border-border/80 bg-amber-500/5 p-2.5 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
                  <span>Draft v{leftVer?.version_number || "1"} Highlight Cards</span>
                  <span>{leftResolvedCount}/{leftAnnotations.length} Verified</span>
                </div>
                {leftAnnotations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    No highlights recorded on Version {leftVer?.version_number || "1"}.
                  </p>
                ) : (
                  leftAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className={cn(
                        "rounded-lg border p-2 text-xs space-y-1.5 transition-all",
                        ann.status === "verified" || ann.status === "resolved"
                          ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5">
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
                          Page {ann.page_number} • {ann.severity}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] capitalize font-bold text-muted-foreground">
                            {ann.status}
                          </span>
                          {isFaculty && (
                            <button
                              type="button"
                              disabled={verifyingId === ann.id}
                              onClick={() => handleToggleVerification(ann.id, ann.status)}
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                                ann.status === "verified"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              )}
                              title="Click to toggle verified status"
                            >
                              {ann.status === "verified" ? "✓ Verified" : "Verify in v" + (rightVer?.version_number || "2")}
                            </button>
                          )}
                        </div>
                      </div>

                      {ann.selected_text && (
                        <p className="text-[11px] text-foreground font-serif bg-amber-500/15 rounded p-1.5 border-l-2 border-amber-500 italic truncate">
                          &ldquo;{ann.selected_text}&rdquo;
                        </p>
                      )}

                      <p className="text-[11px] text-foreground font-medium pl-1">
                        <strong>Note:</strong> {ann.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Base PDF Viewport */}
            <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/30">
              {leftVer?.file_url ? (
                <iframe
                  src={`${leftVer.file_url}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title="Base Version"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Base document preview not available.
                </div>
              )}
            </div>
          </div>

          {/* Revised Version Viewport (Right) */}
          <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-primary">
                  Revised: Version {rightVer?.version_number || "2"} (Latest)
                </span>
                <Badge variant="success" className="text-[9px] font-bold">
                  Active Draft
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRightTrayOpen(!isRightTrayOpen)}
                  className="h-6 text-[10px] gap-1 font-bold cursor-pointer"
                  title="Toggle comments on revised draft"
                >
                  <Highlighter className="h-3 w-3 text-primary" />
                  Notes ({rightAnnotations.length})
                  {isRightTrayOpen ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
                </Button>
                {rightVer?.file_url && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" asChild>
                    <a href={rightVer.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> New Tab
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Right Comments Drawer (if opened) */}
            {isRightTrayOpen && (
              <div className="max-h-52 overflow-y-auto border-b border-border/80 bg-muted/30 p-2.5 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
                  <span>Draft v{rightVer?.version_number || "2"} Annotations ({rightAnnotations.length})</span>
                </div>
                {rightAnnotations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    No new comments left on Draft v{rightVer?.version_number || "2"} yet.
                  </p>
                ) : (
                  rightAnnotations.map((ann) => (
                    <div key={ann.id} className="rounded-lg border border-border bg-card p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] font-bold">Page {ann.page_number} • {ann.severity}</Badge>
                        <span className="text-[9px] capitalize text-muted-foreground">{ann.status}</span>
                      </div>
                      {ann.selected_text && (
                        <p className="text-[11px] italic bg-muted/40 p-1 rounded truncate">&ldquo;{ann.selected_text}&rdquo;</p>
                      )}
                      <p className="text-[11px] font-medium">{ann.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Revised PDF Viewport */}
            <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/30">
              {rightVer?.file_url ? (
                <iframe
                  src={`${rightVer.file_url}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title="Revised Version"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Revised document preview not available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
