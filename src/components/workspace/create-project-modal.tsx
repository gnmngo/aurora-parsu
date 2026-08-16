"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Student record shape — must include profile_id (profiles.id / auth.uid)
 * so we insert the correct UUID into project_members.profile_id.
 *
 * UUID chain verified from live DB:
 *   auth.users.id = profiles.id = students.profile_id
 *   projects.student_id → students.id
 *   project_members.profile_id → profiles.id   ← different UUID from student.id
 */
interface StudentRecord {
  id: string;          // students.id (used for projects.student_id)
  profile_id: string;  // profiles.id (used for project_members.profile_id)
  campus_id: string | null;
  college_id: string | null;
  department_id: string | null;
  program_id: string | null;
  major_id: string | null;
}

interface CreateProjectModalProps {
  onSuccess: () => void;
  student: StudentRecord | null;
}

export function CreateProjectModal({ onSuccess, student }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Guard: student profile must have campus_id and department_id (NOT NULL in projects)
  const missingHierarchy = !student?.campus_id || !student?.department_id;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    if (!student) {
      toast.error("Student profile not loaded. Please refresh the page.");
      return;
    }

    if (missingHierarchy) {
      toast.error(
        "Your profile is missing campus or department information. Please contact your coordinator."
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Look up a workflow template for this student's program (optional).
      //    `workflow_template_id` is nullable in projects — if no template exists,
      //    the project is still created (coordinator assigns later).
      let workflowTemplateId: string | null = null;
      if (student.program_id) {
        const { data: workflows } = await supabase
          .from("workflow_templates")
          .select("id")
          .eq("program_id", student.program_id)
          .limit(1);
        workflowTemplateId = workflows?.[0]?.id ?? null;
      }

      // 2. Insert the project.
      //    `status` is omitted — DB default is 'draft' (the only valid initial value).
      //    `projects.student_id` → students.id  (verified FK)
      //    `projects.campus_id` NOT NULL — validated above
      //    `projects.department_id` NOT NULL — validated above
      const currentYear = new Date().getFullYear();
      const { data: project, error: insertErr } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          student_id: student.id,                // students.id → projects.student_id FK
          campus_id: student.campus_id,
          college_id: student.college_id,
          department_id: student.department_id,
          program_id: student.program_id,
          major_id: student.major_id,
          academic_year: `${currentYear}-${currentYear + 1}`,
          workflow_template_id: workflowTemplateId,
          // status: omitted — DB default 'draft' applies automatically
        })
        .select("id, title, join_code")
        .single();

      if (insertErr || !project) {
        toast.error(insertErr?.message ?? "Failed to create project");
        return;
      }

      // 3. Insert creator as project member (student_leader).
      //    project_members.profile_id → profiles.id  (verified FK)
      //    student.profile_id === profiles.id === auth.users.id
      //    member_role 'student_leader' is a valid member_role enum value.
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          profile_id: student.profile_id,        // profiles.id — NOT students.id
          member_role: "student_leader",          // valid member_role enum value
          is_primary: true,
        });

      if (memberErr) {
        // Project was created but membership failed — log and warn (non-fatal for UX)
        console.error("project_members insert failed:", memberErr.message);
        toast.warning(
          `Project created but membership record failed: ${memberErr.message}. Contact your coordinator.`
        );
      } else {
        toast.success(
          `Project "${project.title}" created! Join code: ${project.join_code ?? "N/A"}`
        );
      }

      setTitle("");
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(msg);
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

        {/* Hierarchy warning — shown when campus/department is null */}
        {missingHierarchy && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Your profile is missing campus or department information. Please
              contact your coordinator to complete your profile before creating a
              project.
            </p>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Title / Working Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI-driven Content Management System"
              disabled={loading || missingHierarchy}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || missingHierarchy}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
