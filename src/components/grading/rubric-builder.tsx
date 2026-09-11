"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sliders, Plus, Trash2, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createRubricAction, updateRubricAction } from "@/lib/rubrics/actions";

export interface RubricCriterionItem {
  id: string;
  name: string;
  weight: number;
}

export interface RubricTemplateModel {
  id?: string;
  project_id?: string;
  title: string;
  criteria: RubricCriterionItem[];
  passing_score?: number;
  excellent_score?: number;
  target_compliance_rate?: number;
  min_compliance_rate?: number;
  max_major_unresolved?: number;
}

export interface RubricEditorDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  rubric?: RubricTemplateModel | null;
  projectId?: string;
  onSaved?: (savedRubric: any) => void;
  triggerButton?: React.ReactNode;
}

export function RubricEditorDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  rubric,
  projectId,
  onSaved,
  triggerButton,
}: RubricEditorDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [projects, setProjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState(projectId || rubric?.project_id || "");
  const [title, setTitle] = useState("Defense Rubric");
  const [criteria, setCriteria] = useState<RubricCriterionItem[]>([
    { id: "c1", name: "Technical Rigor & Architecture", weight: 35 },
    { id: "c2", name: "Research Methodology & Execution", weight: 30 },
    { id: "c3", name: "Presentation & Manuscript Quality", weight: 20 },
    { id: "c4", name: "Defense Mastery & Response to Inquiries", weight: 15 },
  ]);
  const [passingScore, setPassingScore] = useState(75);
  const [excellentScore, setExcellentScore] = useState(85);
  const [targetCompliance, setTargetCompliance] = useState(90);
  const [minCompliance, setMinCompliance] = useState(70);
  const [maxMajor, setMaxMajor] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  // Populate when rubric or open state changes
  useEffect(() => {
    if (rubric) {
      setTitle(rubric.title || "Custom Rubric");
      if (rubric.project_id) {
        setSelectedProject(rubric.project_id);
      } else if (projectId) {
        setSelectedProject(projectId);
      }

      if (Array.isArray(rubric.criteria) && rubric.criteria.length > 0) {
        setCriteria(
          rubric.criteria.map((c, idx) => ({
            id: c.id || `crit_${Date.now()}_${idx}`,
            name: c.name || "",
            weight: Number(c.weight || 0),
          }))
        );
      }
      if (rubric.passing_score !== undefined) setPassingScore(Number(rubric.passing_score));
      if (rubric.excellent_score !== undefined) setExcellentScore(Number(rubric.excellent_score));
      if (rubric.target_compliance_rate !== undefined) setTargetCompliance(Number(rubric.target_compliance_rate));
      if (rubric.min_compliance_rate !== undefined) setMinCompliance(Number(rubric.min_compliance_rate));
      if (rubric.max_major_unresolved !== undefined) setMaxMajor(Number(rubric.max_major_unresolved));
    } else {
      // Default reset
      if (projectId) setSelectedProject(projectId);
      setTitle("Project Defense Rubric");
      setCriteria([
        { id: "c1", name: "Technical Rigor & Architecture", weight: 35 },
        { id: "c2", name: "Research Methodology & Execution", weight: 30 },
        { id: "c3", name: "Presentation & Manuscript Quality", weight: 20 },
        { id: "c4", name: "Defense Mastery & Response to Inquiries", weight: 15 },
      ]);
      setPassingScore(75);
      setExcellentScore(85);
      setTargetCompliance(90);
      setMinCompliance(70);
      setMaxMajor(2);
    }
  }, [rubric, projectId, open]);

  // Load project and program lists if needed
  useEffect(() => {
    if (!open) return;

    async function loadData() {
      try {
        const [projRes, progRes] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, program_id, programs(id, code, name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("programs")
            .select("id, code, name")
            .order("code"),
        ]);

        if (projRes.data) {
          setProjects(projRes.data);
          if (!selectedProject && projRes.data.length > 0) {
            setSelectedProject(projRes.data[0].id);
          }
        }
        if (progRes.data) {
          setPrograms(progRes.data);
        }
      } catch (err: unknown) {
        console.error("Error loading projects/programs for rubric editor:", err);
      }
    }

    loadData();
  }, [open, supabase, selectedProject]);

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const isWeightValid = totalWeight >= 99.9 && totalWeight <= 100.1;
  const remainingWeight = +(100 - totalWeight).toFixed(1);

  const addCriterion = () => {
    const nextId = `c_${Date.now()}_${criteria.length + 1}`;
    setCriteria([...criteria, { id: nextId, name: "", weight: 0 }]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 1) {
      toast.error("At least one criterion is required.");
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: "name" | "weight", val: string | number) => {
    const updated = [...criteria];
    if (field === "name") {
      updated[index] = { ...updated[index], name: String(val) };
    } else {
      updated[index] = { ...updated[index], weight: Number(val) };
    }
    setCriteria(updated);
  };

  const handleAutoBalance = () => {
    if (criteria.length === 0) return;
    const baseWeight = Math.floor(100 / criteria.length);
    const remainder = 100 - baseWeight * criteria.length;
    const balanced = criteria.map((c, idx) => ({
      ...c,
      weight: idx === 0 ? baseWeight + remainder : baseWeight,
    }));
    setCriteria(balanced);
    toast.info(`Weights balanced across ${criteria.length} criteria.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject && !rubric?.id) {
      toast.error("Please select a research project.");
      return;
    }

    if (!title.trim()) {
      toast.error("Please provide a rubric title.");
      return;
    }

    // Validate non-empty criterion names
    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim()) {
        toast.error(`Criterion #${i + 1} cannot have an empty name.`);
        return;
      }
    }

    if (!isWeightValid) {
      toast.error(
        `Total criteria weight must sum to 100%. Currently: ${totalWeight.toFixed(1)}% (${
          remainingWeight > 0 ? `${remainingWeight}% remaining` : `${Math.abs(remainingWeight)}% over`
        })`
      );
      return;
    }

    setSubmitting(true);
    try {
      let savedResult: any = null;

      if (rubric?.id) {
        // Edit / Customize Existing Rubric
        savedResult = await updateRubricAction({
          templateId: rubric.id,
          title: title.trim(),
          criteria,
          passingScore: Number(passingScore),
          excellentScore: Number(excellentScore),
          targetComplianceRate: Number(targetCompliance),
          minComplianceRate: Number(minCompliance),
          maxMajorUnresolved: Number(maxMajor),
        });
        toast.success("Rubric criteria and settings updated successfully!");
      } else {
        // Create New Rubric Template
        savedResult = await createRubricAction({
          projectId: selectedProject,
          title: title.trim(),
          criteria,
          passingScore: Number(passingScore),
          excellentScore: Number(excellentScore),
          targetComplianceRate: Number(targetCompliance),
          minComplianceRate: Number(minCompliance),
          maxMajorUnresolved: Number(maxMajor),
        });
        toast.success("Custom rubric created and published successfully!");
      }

      setOpen(false);
      if (onSaved) {
        onSaved(savedResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save rubric.";
      console.error(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 h-8">
            <Sliders className="h-4 w-4" />
            {rubric?.id ? "Customize Criteria" : "Create Rubric"}
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Sliders className="h-5 w-5 text-primary" />
            {rubric?.id ? "Customize Rubric Criteria" : "Configure Custom Rubric Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Project selector if creating new without fixed projectId */}
          {!rubric?.id && !projectId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Degree Program</Label>
                <select
                  value={selectedProgramFilter}
                  onChange={(e) => {
                    const progVal = e.target.value;
                    setSelectedProgramFilter(progVal);
                    const matching = progVal === "all"
                      ? projects
                      : projects.filter((p) => p.program_id === progVal || p.programs?.id === progVal);
                    if (matching.length > 0) {
                      setSelectedProject(matching[0].id);
                    }
                  }}
                  className="w-full rounded-xl border border-border bg-card p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="all">All Programs</option>
                  {programs.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.code ? `[${prog.code}] ` : ""}{prog.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rubric-project" className="text-xs font-semibold">
                  Target Project *
                </Label>
                <select
                  id="rubric-project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  required
                >
                  {(selectedProgramFilter === "all"
                    ? projects
                    : projects.filter((p) => p.program_id === selectedProgramFilter || p.programs?.id === selectedProgramFilter)
                  ).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.programs?.code ? `[${p.programs.code}] ` : ""}{p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="rubric-title" className="text-xs font-semibold">
              Rubric Title
            </Label>
            <Input
              id="rubric-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Proposal Defense Rubric"
              className="text-xs"
              required
            />
          </div>

          {/* Criteria Management Header */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  Grading Criteria &amp; Weights
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Customize criteria names and adjust weights to total 100%.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAutoBalance}
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                  title="Evenly distribute 100% across all criteria"
                >
                  <Wand2 className="h-3 w-3" /> Auto Balance
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCriterion}
                  className="h-7 px-2.5 text-[10px] gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add Criterion
                </Button>
              </div>
            </div>

            {/* Total Weight Status Indicator */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border ${
                isWeightValid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300"
                  : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isWeightValid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
                <span>
                  {isWeightValid
                    ? "Weight allocation valid (100%)"
                    : remainingWeight > 0
                    ? `Allocation incomplete: ${remainingWeight}% remaining`
                    : `Over allocated: ${Math.abs(remainingWeight)}% excess`}
                </span>
              </div>
              <Badge
                variant={isWeightValid ? "success" : "warning"}
                className="text-[10px] font-extrabold font-mono"
              >
                {totalWeight.toFixed(1)}% / 100%
              </Badge>
            </div>

            {/* Criteria rows */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {criteria.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-border/70 hover:border-border transition-colors"
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">
                    {idx + 1}
                  </span>
                  <Input
                    value={c.name}
                    onChange={(e) => updateCriterion(idx, "name", e.target.value)}
                    placeholder="Criterion name (e.g., Technical Depth)"
                    className="flex-1 text-xs h-8"
                    required
                  />
                  <div className="flex items-center gap-1 w-20">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={c.weight || ""}
                      onChange={(e) => updateCriterion(idx, "weight", e.target.value)}
                      placeholder="0"
                      className="text-center text-xs h-8 font-bold"
                      required
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCriterion(idx)}
                    disabled={criteria.length <= 1}
                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    title="Remove criterion"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Configurable Thresholds */}
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Configurable Passing &amp; Quality Thresholds
            </Label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="pass-score" className="text-[10px] text-muted-foreground font-semibold">
                  Passing Score (0-100)
                </Label>
                <Input
                  type="number"
                  id="pass-score"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="excel-score" className="text-[10px] text-muted-foreground font-semibold">
                  Excellent Score (0-100)
                </Label>
                <Input
                  type="number"
                  id="excel-score"
                  min={0}
                  max={100}
                  value={excellentScore}
                  onChange={(e) => setExcellentScore(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="min-comp" className="text-[10px] text-muted-foreground font-semibold">
                  Min Compliance Rate (%)
                </Label>
                <Input
                  type="number"
                  id="min-comp"
                  min={0}
                  max={100}
                  value={minCompliance}
                  onChange={(e) => setMinCompliance(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="target-comp" className="text-[10px] text-muted-foreground font-semibold">
                  Target Compliance Rate (%)
                </Label>
                <Input
                  type="number"
                  id="target-comp"
                  min={0}
                  max={100}
                  value={targetCompliance}
                  onChange={(e) => setTargetCompliance(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="max-maj" className="text-[10px] text-muted-foreground font-semibold">
                  Max Major Unresolved Comments allowed for "Almost Ready"
                </Label>
                <Input
                  type="number"
                  id="max-maj"
                  min={0}
                  max={10}
                  value={maxMajor}
                  onChange={(e) => setMaxMajor(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !isWeightValid}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {submitting ? "Saving Rubric..." : rubric?.id ? "Update Criteria" : "Create Rubric"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Keep RubricBuilder export for backward compatibility with Submissions page
export function RubricBuilder({
  onRubricCreated,
  projectId,
}: {
  onRubricCreated: () => void;
  projectId?: string;
}) {
  return (
    <RubricEditorDialog
      projectId={projectId}
      onSaved={() => onRubricCreated()}
      triggerButton={
        <Button size="sm" variant="outline" className="gap-1.5 h-8">
          <Sliders className="h-4 w-4" />
          Create Rubric
        </Button>
      }
    />
  );
}
