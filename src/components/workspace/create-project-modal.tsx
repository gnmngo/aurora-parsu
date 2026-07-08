"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface CreateProjectModalProps {
  onSuccess: () => void;
  student: any;
}

export function CreateProjectModal({ onSuccess, student }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Get the first workflow template for this program
      const { data: workflows } = await supabase
        .from("workflow_templates")
        .select("id")
        .eq("program_id", student.program_id)
        .limit(1);
        
      const workflowTemplateId = workflows && workflows.length > 0 ? workflows[0].id : null;

      // 2. Insert the project, inheriting the academic structure exactly as requested
      const { data: project, error: insertErr } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          student_id: student.id,
          campus_id: student.campus_id,
          college_id: student.college_id,
          department_id: student.department_id,
          program_id: student.program_id,
          major_id: student.major_id,
          academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          workflow_template_id: workflowTemplateId,
          status: "proposal"
        })
        .select()
        .single();

      if (insertErr) {
        toast.error(insertErr.message || "Failed to create project");
        return;
      }

      // 3. Add creator as project member (leader)
      if (project) {
        await supabase
          .from("project_members")
          .insert({
            project_id: project.id,
            student_id: student.id,
            role: "leader"
          });
      }

      toast.success("Project created successfully!");
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start gap-2">
          <Plus className="w-4 h-4" />
          Create New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Research Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Title / Working Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI-driven Content Management System"
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
