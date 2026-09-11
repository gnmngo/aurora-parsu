"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  Inbox,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Sliders,
  Check,
  X,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { toast } from "sonner";
import {
  toggleStageEnabledAction,
  updateStageAction,
  createStageAction,
  reorderStagesAction,
  deleteStageAction,
  StageInput,
} from "@/lib/workflow/stages-actions";

const COMMON_DOC_TAGS = [
  "project_concept",
  "problem_statement",
  "proposed_solution",
  "technical_background",
  "chapter_1",
  "chapter_2",
  "chapter_3",
  "chapter_4",
  "chapter_5",
  "chapters_1_3",
  "chapters_1_4",
  "system_60pct",
  "system_90pct",
  "functional_system",
  "complete_manuscript",
  "turnitin_report",
  "presentation",
  "compliance_docs",
];

export default function StagesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Editor Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSequence, setFormSequence] = useState<number>(1);
  const [formPassingScore, setFormPassingScore] = useState<number>(75);
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formReqDocs, setFormReqDocs] = useState<string[]>([]);
  const [customDocInput, setCustomDocInput] = useState("");

  // Gates
  const [formRequiresSubmission, setFormRequiresSubmission] = useState(true);
  const [formRequiresSchedule, setFormRequiresSchedule] = useState(true);
  const [formRequiresPanel, setFormRequiresPanel] = useState(true);
  const [formRequiresRubric, setFormRequiresRubric] = useState(true);
  const [formRequiresSignature, setFormRequiresSignature] = useState(true);
  const [formAllowsRevision, setFormAllowsRevision] = useState(true);

  // Delete Confirm Dialog State
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<any | null>(null);

  const supabase = createClient();

  const loadStages = async () => {
    try {
      // 1. Load templates
      const { data: tmpls } = await supabase
        .from("workflow_templates")
        .select("id, name, program_id, programs(code, name)")
        .order("name");

      if (tmpls && tmpls.length > 0) {
        setTemplates(tmpls);
        if (!selectedTemplateId) {
          setSelectedTemplateId(tmpls[0].id);
        }
      }

      // 2. Load stages
      let query = supabase.from("defense_stages").select("*").order("sequence_order");
      if (selectedTemplateId) {
        query = query.eq("workflow_template_id", selectedTemplateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setStages(data);
      }
    } catch (err) {
      console.error("Error loading stages:", err);
      toast.error("Failed to load defense stages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, [supabase, selectedTemplateId]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingStageId(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormSequence(stages.length + 1);
    setFormPassingScore(75);
    setFormIsEnabled(true);
    setFormReqDocs(["complete_manuscript"]);
    setCustomDocInput("");
    setFormRequiresSubmission(true);
    setFormRequiresSchedule(true);
    setFormRequiresPanel(true);
    setFormRequiresRubric(true);
    setFormRequiresSignature(true);
    setFormAllowsRevision(true);
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (stage: any) => {
    setIsEditing(true);
    setEditingStageId(stage.id);
    setFormName(stage.name || "");
    setFormCode(stage.code || "");
    setFormDescription(stage.description || "");
    setFormSequence(stage.sequence_order || 1);
    setFormPassingScore(stage.passing_score || 75);
    setFormIsEnabled(stage.is_enabled ?? true);
    setFormReqDocs(Array.isArray(stage.required_documents) ? [...stage.required_documents] : []);
    setCustomDocInput("");
    setFormRequiresSubmission(stage.requires_submission ?? true);
    setFormRequiresSchedule(stage.requires_schedule ?? true);
    setFormRequiresPanel(stage.requires_panel ?? true);
    setFormRequiresRubric(stage.requires_rubric ?? true);
    setFormRequiresSignature(stage.requires_signature ?? true);
    setFormAllowsRevision(stage.allows_revision ?? true);
    setIsDialogOpen(true);
  };

  // Toggle Enabled
  const handleToggleEnabled = async (stage: any) => {
    const nextState = !stage.is_enabled;
    setActioningId(stage.id);
    // Optimistic UI update
    setStages((prev) =>
      prev.map((s) => (s.id === stage.id ? { ...s, is_enabled: nextState } : s))
    );

    try {
      await toggleStageEnabledAction(stage.id, nextState);
      toast.success(`Stage "${stage.name}" ${nextState ? "Enabled" : "Disabled"}`);
      await loadStages();
    } catch (err: unknown) {
      // Revert optimistic update
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, is_enabled: stage.is_enabled } : s))
      );
      toast.error(err instanceof Error ? err.message : "Failed to toggle stage status");
    } finally {
      setActioningId(null);
    }
  };

  // Move Up / Down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // Optimistic update
    setStages(newStages);
    setActioningId(temp.id);

    try {
      const orderedIds = newStages.map((s) => s.id);
      await reorderStagesAction(orderedIds);
      toast.success("Stage sequence updated.");
      await loadStages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder stages");
      await loadStages();
    } finally {
      setActioningId(null);
    }
  };

  // Save (Create or Update)
  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a stage name.");
      return;
    }
    if (!formCode.trim()) {
      toast.error("Please enter a unique stage code.");
      return;
    }

    const payload: StageInput = {
      name: formName.trim(),
      code: formCode.trim().toLowerCase().replace(/\s+/g, "_"),
      description: formDescription.trim(),
      sequenceOrder: formSequence,
      passingScore: formPassingScore,
      isEnabled: formIsEnabled,
      requiredDocuments: formReqDocs,
      workflowTemplateId: selectedTemplateId || undefined,
      requiresSubmission: formRequiresSubmission,
      requiresSchedule: formRequiresSchedule,
      requiresPanel: formRequiresPanel,
      requiresRubric: formRequiresRubric,
      requiresSignature: formRequiresSignature,
      allowsRevision: formAllowsRevision,
    };

    setActioningId("saving");
    try {
      if (isEditing && editingStageId) {
        await updateStageAction(editingStageId, payload);
        toast.success(`Stage "${payload.name}" updated successfully.`);
      } else {
        await createStageAction(payload);
        toast.success(`New stage "${payload.name}" created successfully.`);
      }
      setIsDialogOpen(false);
      await loadStages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save defense stage.");
    } finally {
      setActioningId(null);
    }
  };

  // Delete
  const handleDeleteStage = async () => {
    if (!deleteConfirmStage) return;
    setActioningId(deleteConfirmStage.id);
    try {
      await deleteStageAction(deleteConfirmStage.id);
      toast.success(`Stage "${deleteConfirmStage.name}" deleted.`);
      setDeleteConfirmStage(null);
      await loadStages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete stage.");
    } finally {
      setActioningId(null);
    }
  };

  // Add Document Tag
  const handleAddDocTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, "_");
    if (clean && !formReqDocs.includes(clean)) {
      setFormReqDocs([...formReqDocs, clean]);
    }
    setCustomDocInput("");
  };

  // Remove Document Tag
  const handleRemoveDocTag = (tag: string) => {
    setFormReqDocs(formReqDocs.filter((t) => t !== tag));
  };

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Customizable Defense Stages</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add, configure, reorder, or toggle stages, document requirements, and evaluation gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Program:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {templates.map((tmpl) => {
                  const code = (tmpl.programs as any)?.code;
                  const name = (tmpl.programs as any)?.name;
                  return (
                    <option key={tmpl.id} value={tmpl.id}>
                      {code ? `[${code}] ${name || tmpl.name}` : tmpl.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Stage
            </Button>
          </div>
        </div>

        {/* Stages List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center shadow-sm">
            <Inbox className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Defense Stages Found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              No defense stages are currently configured. Click &quot;Add Stage&quot; to define your first defense milestone.
            </p>
            <Button onClick={handleOpenCreate} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Create First Stage
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === stages.length - 1;
              const isBusy = actioningId === stage.id;

              return (
                <Card
                  key={stage.id}
                  className={`transition-all duration-200 border-2 ${
                    stage.is_enabled
                      ? "border-border/80 shadow-sm hover:border-primary/40"
                      : "border-border/40 opacity-75 bg-muted/20"
                  }`}
                >
                  <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Sequence Controls & Title */}
                    <div className="flex items-center gap-3">
                      {/* Up / Down Reorder Arrows */}
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={isFirst || isBusy}
                          onClick={() => handleMoveOrder(idx, "up")}
                          title="Move Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={isLast || isBusy}
                          onClick={() => handleMoveOrder(idx, "down")}
                          title="Move Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Stage Name & Identifier */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-background">
                            #{stage.sequence_order}
                          </Badge>
                          <CardTitle className="text-base font-bold text-foreground">
                            {stage.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Code: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{stage.code}</code></span>
                          <span>•</span>
                          <span>Passing Score: <strong className="text-foreground">{stage.passing_score || 75}%</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Toggle Status & Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Enable / Disable Button */}
                      <Button
                        variant={stage.is_enabled ? "default" : "outline"}
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleToggleEnabled(stage)}
                        className={`gap-1.5 text-xs font-semibold h-8 ${
                          stage.is_enabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "text-muted-foreground border-dashed"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : stage.is_enabled ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            Disabled
                          </>
                        )}
                      </Button>

                      {/* Edit Stage Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleOpenEdit(stage)}
                        className="gap-1.5 text-xs h-8 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      {/* Delete Stage Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => setDeleteConfirmStage(stage)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Stage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Description */}
                    {stage.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {stage.description}
                      </p>
                    )}

                    {/* Required Documents Section */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Required Submission Documents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.required_documents && stage.required_documents.length > 0 ? (
                          stage.required_documents.map((doc: string) => (
                            <Badge
                              key={doc}
                              variant="secondary"
                              className="text-[11px] px-2 py-0.5 font-mono bg-muted/80 text-foreground"
                            >
                              <FileText className="h-3 w-3 mr-1 text-primary" />
                              {doc}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            No mandatory documents required for this stage.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage Gate Flags */}
                    <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 text-[10px]">
                      {stage.requires_submission && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ Manuscript Upload Required
                        </Badge>
                      )}
                      {stage.requires_schedule && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ Schedule Required
                        </Badge>
                      )}
                      {stage.requires_panel && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ 3-Member Panel Required
                        </Badge>
                      )}
                      {stage.requires_rubric && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ Weighted Rubric Required
                        </Badge>
                      )}
                      {stage.requires_signature && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ Digital Signature Required
                        </Badge>
                      )}
                      {stage.allows_revision && (
                        <Badge variant="outline" className="text-muted-foreground bg-background">
                          ✓ Revisions Permitted
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                {isEditing ? "Edit Defense Stage" : "Create New Defense Stage"}
              </DialogTitle>
              <DialogDescription>
                Customize stage parameters, sequencing order, required documents, and evaluation requirements.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveStage} className="space-y-5 pt-2">
              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stageName" className="text-xs font-semibold">
                    Stage Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stageName"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!isEditing) {
                        setFormCode(e.target.value.toLowerCase().trim().replace(/\s+/g, "_"));
                      }
                    }}
                    placeholder="e.g., Proposal Defense, Colloquium"
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stageCode" className="text-xs font-semibold">
                    Stage Code (Slug) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stageCode"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="e.g., proposal, colloquium"
                    required
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Sequence & Passing Score */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sequence" className="text-xs font-semibold">
                    Sequence Order #
                  </Label>
                  <Input
                    id="sequence"
                    type="number"
                    min={1}
                    max={20}
                    value={formSequence}
                    onChange={(e) => setFormSequence(parseInt(e.target.value) || 1)}
                    required
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passingScore" className="text-xs font-semibold">
                    Passing Score (%)
                  </Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min={50}
                    max={100}
                    value={formPassingScore}
                    onChange={(e) => setFormPassingScore(parseInt(e.target.value) || 75)}
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Active Status</Label>
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant={formIsEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormIsEnabled(!formIsEnabled)}
                      className={`w-full text-xs font-semibold h-9 ${
                        formIsEnabled
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formIsEnabled ? "Enabled (Active)" : "Disabled (Hidden)"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Stage Description &amp; Proponent Guidelines
                </Label>
                <textarea
                  id="description"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide instructions on what is expected from proponents during this defense stage..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Required Documents Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Required Submission Documents (Proponents must submit these before defense)
                </Label>

                {/* Selected Tag Badges */}
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-input bg-muted/20 min-h-[44px]">
                  {formReqDocs.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic my-auto">
                      No documents required yet. Click common tags below or type a custom tag.
                    </span>
                  ) : (
                    formReqDocs.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-2 py-0.5 font-mono gap-1 bg-background border border-border shadow-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveDocTag(tag)}
                          className="hover:text-destructive text-muted-foreground ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {/* Add Custom Tag */}
                <div className="flex gap-2">
                  <Input
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customDocInput.trim()) handleAddDocTag(customDocInput);
                      }
                    }}
                    placeholder="Type custom doc tag (e.g., turnitin_clearance) and press Add..."
                    className="text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (customDocInput.trim()) handleAddDocTag(customDocInput);
                    }}
                    className="text-xs"
                  >
                    Add Tag
                  </Button>
                </div>

                {/* Suggested Quick Tags */}
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Quick suggestions (click to toggle):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_DOC_TAGS.map((tag) => {
                      const isSelected = formReqDocs.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) handleRemoveDocTag(tag);
                            else handleAddDocTag(tag);
                          }}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Evaluation Gates & Flags */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold">Workflow Gates &amp; Requirements</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresSubmission}
                      onChange={(e) => setFormRequiresSubmission(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Requires Manuscript Upload</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresSchedule}
                      onChange={(e) => setFormRequiresSchedule(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Requires Defense Schedule</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresPanel}
                      onChange={(e) => setFormRequiresPanel(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Requires 3-Member Panel</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresRubric}
                      onChange={(e) => setFormRequiresRubric(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Requires Dynamic Rubric Scoring</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresSignature}
                      onChange={(e) => setFormRequiresSignature(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Requires Digital Signature Clearance</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowsRevision}
                      onChange={(e) => setFormAllowsRevision(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Allows Proponent Revisions</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={actioningId === "saving"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actioningId === "saving"} className="gap-2">
                  {actioningId === "saving" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {isEditing ? "Save Changes" : "Create Stage"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmStage} onOpenChange={(open) => !open && setDeleteConfirmStage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Defense Stage?
              </DialogTitle>
              <DialogDescription className="text-sm">
                Are you sure you want to delete stage{" "}
                <strong>&quot;{deleteConfirmStage?.name}&quot;</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Safety Note:</strong> If this stage already has student manuscript submissions or active projects, deletion will be blocked to preserve historical records. You can toggle it to <strong>Disabled</strong> instead.
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmStage(null)}
                disabled={actioningId === deleteConfirmStage?.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteStage}
                disabled={actioningId === deleteConfirmStage?.id}
                className="gap-1.5"
              >
                {actioningId === deleteConfirmStage?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Stage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
