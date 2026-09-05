"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createAnnotationAction } from "@/lib/annotations/actions";

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
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemarksDrawer, setShowRemarksDrawer] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  // Form states for new remark
  const [commentText, setCommentText] = useState("");
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [sectionRef, setSectionRef] = useState("");
  const [severity, setSeverity] = useState<"info" | "minor" | "major" | "critical">("minor");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

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
          profiles ( first_name, last_name )
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

  useEffect(() => {
    loadAnnotations();

    if (!documentVersionId) return;

    // Real-time synchronization with unique channel name to prevent collision
    const channelName = `pdf-annotations-${documentVersionId}-${Date.now()}`;
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
          loadAnnotations();
          onAnnotationChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentVersionId]);

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

      // 1. Save annotation record via server action (audited + notifies students)
      const res = await createAnnotationAction({
        documentVersionId,
        pageNumber: pageNumber || 1,
        content: commentText.trim(),
        severity: severity,
        selectedText: sectionRef.trim() || undefined,
        type: "text_comment",
      });

      if (!res.success) {
        throw new Error("Failed to create annotation.");
      }

      toast.success("Revision comment added successfully!");
      setShowAddModal(false);
      setCommentText("");
      setSectionRef("");
      loadAnnotations();
      onAnnotationChange?.();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error adding comment: ${err.message}`);
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

  const filteredAnnotations = annotations.filter((ann) => {
    if (filterSeverity === "all") return true;
    return ann.severity === filterSeverity;
  });

  return (
    <div className="flex h-full flex-col bg-slate-900/5 relative overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-xs"
            onClick={() => setShowAddModal(true)}
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
            <span>Add Revision Remark</span>
          </Button>

          <Button
            variant={showRemarksDrawer ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
            onClick={() => setShowRemarksDrawer(!showRemarksDrawer)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Remarks</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
              {annotations.length}
            </Badge>
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {pdfUrl && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs"
                asChild
              >
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs"
                asChild
              >
                <a href={pdfUrl} download={`${title || "manuscript"}.pdf`}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main PDF Viewer Container */}
      <div className="flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-900/40">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&zoom=100`}
            className="w-full h-full border-0"
            title={title || "Manuscript PDF"}
          />
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
                      className="p-3 rounded-xl border border-border bg-card shadow-xs space-y-1.5 text-xs group relative hover:border-primary/40 transition-colors"
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
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger p-0.5 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {ann.selected_text && (
                        <p className="text-[11px] font-medium italic text-muted-foreground bg-muted/40 p-1.5 rounded">
                          &ldquo;{ann.selected_text}&rdquo;
                        </p>
                      )}

                      <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap">
                        {ann.content}
                      </p>

                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50 flex justify-between">
                        <span>By {authorName}</span>
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
    </div>
  );
}
