"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Layers, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { coordinatorOverrideProjectStageAction } from "@/lib/workflow/coordinator-actions";

interface ReviseStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    title: string;
    current_stage_id?: string;
    status?: string;
  } | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled (Defense Scheduled)" },
  { value: "in_progress", label: "In Progress (Oral Defense Underway)" },
  { value: "revision_required", label: "Revision Required (Post-Defense Comments)" },
  { value: "passed", label: "Passed (Stage Cleared / Approved)" },
  { value: "completed", label: "Completed (Final Archived)" },
  { value: "under_review", label: "Under Review (Pre-Defense Manuscript Check)" },
];

export function ReviseStageModal({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ReviseStageModalProps) {
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [loadingStages, setLoadingStages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!open || !project) return;

    setSelectedStageId(project.current_stage_id || "");
    setSelectedStatus(project.status || "scheduled");
    setReason("");

    async function loadStages() {
      setLoadingStages(true);
      try {
        const { data } = await supabase
          .from("defense_stages")
          .select("id, name, sequence_order, is_enabled")
          .eq("is_enabled", true)
          .order("sequence_order");

        if (data) {
          setStages(data);
          if (!project?.current_stage_id && data.length > 0) {
            setSelectedStageId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load stages:", err);
      } finally {
        setLoadingStages(false);
      }
    }

    loadStages();
  }, [open, project, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !selectedStageId) {
      toast.error("Please select a target defense stage.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason or justification for revising this defense stage.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await coordinatorOverrideProjectStageAction({
        projectId: project.id,
        stageId: selectedStageId,
        status: selectedStatus || undefined,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success(`Project defense stage updated to "${res.stageName}"!`);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revise defense stage.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Revise Project Defense Stage
          </DialogTitle>
          <DialogDescription className="text-xs">
            As a Defense Coordinator, you can flexibly transition this project to any defense stage or update its operational status to address real-life academic scenarios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Project Title Callout */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Project</span>
            <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
              {project.title}
            </p>
          </div>

          {/* Defense Stage Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Target Defense Stage *</Label>
            {loadingStages ? (
              <div className="h-9 rounded-md bg-muted animate-pulse" />
            ) : (
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                required
              >
                <option value="">-- Choose Target Defense Stage --</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    Stage {st.sequence_order}: {st.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Operational Status Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Set Operational Status</Label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Justification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Justification / Academic Reason *</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Granted special committee extension, repeating proposal stage per adviser recommendation, or manual clearance waiver..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed placeholder:text-muted-foreground"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              This reason will be logged in institutional audit logs and notified to the student research team.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="h-8 text-xs font-bold gap-1.5 cursor-pointer bg-primary text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              Apply Stage Revision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
