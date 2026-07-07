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
import { Sliders, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

export function RubricBuilder({ 
  onRubricCreated, 
  projectId 
}: { 
  onRubricCreated: () => void; 
  projectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || "");
  const [title, setTitle] = useState("Default Rubric");
  const [criteria, setCriteria] = useState<any[]>([
    { id: "c1", name: "Content Quality", weight: 40 },
    { id: "c2", name: "Technical Merit", weight: 30 },
    { id: "c3", name: "Presentation", weight: 20 },
    { id: "c4", name: "Q&A", weight: 10 }
  ]);
  const [passingScore, setPassingScore] = useState(75);
  const [excellentScore, setExcellentScore] = useState(85);
  const [targetCompliance, setTargetCompliance] = useState(90);
  const [minCompliance, setMinCompliance] = useState(70);
  const [maxMajor, setMaxMajor] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;

    async function loadProjects() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          setProjects(data);
          if (!projectId && data.length > 0) {
            setSelectedProject((prev) => prev || data[0].id);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Error loading projects:", err);
        toast.error(`Failed to load projects: ${message}`);
      }
    }
    loadProjects();
  }, [open, supabase, projectId]);

  const addCriterion = () => {
    const nextId = `c${criteria.length + 1}`;
    setCriteria([...criteria, { id: nextId, name: "", weight: 0 }]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 1) {
      toast.error("At least one criterion is required.");
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, key: string, val: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [key]: val };
    setCriteria(newCriteria);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }

    const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    if (totalWeight < 99.90 || totalWeight > 100.10) {
      toast.error(`Total weight must equal 100%. Current total is ${totalWeight}%`);
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("You must be logged in to create a rubric.");
      }

      const { error } = await supabase.from("rubric_templates").insert({
        project_id: selectedProject,
        title: title.trim(),
        criteria: criteria.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          weight: Number(c.weight),
        })),
        passing_score: Number(passingScore),
        excellent_score: Number(excellentScore),
        target_compliance_rate: Number(targetCompliance),
        min_compliance_rate: Number(minCompliance),
        max_major_unresolved: Number(maxMajor),
        created_by: userId,
      });

      if (error) throw error;

      toast.success("Rubric created and activated successfully!");
      setOpen(false);
      onRubricCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error saving rubric: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sliders className="mr-1.5 h-4 w-4" />
          Create Rubric
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Custom Project Rubric</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="project">Select Project</Label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={!!projectId}
              className="w-full rounded-xl border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-xs text-danger">No projects found. Create a project first.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="rubric-title">Rubric Title</Label>
            <Input
              id="rubric-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Proposal Defense Rubric"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Grading Criteria & Weights (Must sum to 100%)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={addCriterion} className="h-8 px-2 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
              </Button>
            </div>

            <div className="space-y-2">
              {criteria.map((c, idx) => (
                <div key={c.id} className="flex gap-2 items-center">
                  <Input
                    value={c.name}
                    onChange={(e) => updateCriterion(idx, "name", e.target.value)}
                    placeholder="Criterion Name"
                    className="flex-1 text-sm"
                    required
                  />
                  <div className="flex items-center gap-1.5 w-24">
                    <Input
                      type="number"
                      value={c.weight || ""}
                      onChange={(e) => updateCriterion(idx, "weight", Number(e.target.value))}
                      placeholder="Weight"
                      className="text-center text-sm"
                      required
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCriterion(idx)}
                    className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <Label>Configurable Readiness Thresholds</Label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="pass-score">Passing Grade (0-100)</Label>
                <Input
                  type="number"
                  id="pass-score"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="excel-score">Excellent Grade (0-100)</Label>
                <Input
                  type="number"
                  id="excel-score"
                  value={excellentScore}
                  onChange={(e) => setExcellentScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="min-comp">Min Compliance Rate (%)</Label>
                <Input
                  type="number"
                  id="min-comp"
                  value={minCompliance}
                  onChange={(e) => setMinCompliance(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="target-comp">Target Compliance Rate (%)</Label>
                <Input
                  type="number"
                  id="target-comp"
                  value={targetCompliance}
                  onChange={(e) => setTargetCompliance(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="max-maj">Max Major Unresolved Comments allowed for "Almost Ready"</Label>
                <Input
                  type="number"
                  id="max-maj"
                  value={maxMajor}
                  onChange={(e) => setMaxMajor(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting || projects.length === 0}>
              {submitting ? "Saving..." : "Save Rubric"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
