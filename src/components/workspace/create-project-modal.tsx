"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { currentAcademicYear } from "@/lib/utils/academic-year";

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

  // Check if student profile has explicit hierarchy or needs auto-resolution
  const missingHierarchy = !student;

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

    setLoading(true);
    try {
      let resolvedCampusId = student.campus_id;
      let resolvedDeptId = student.department_id;
      let resolvedCollegeId = student.college_id;
      let resolvedProgId = student.program_id;

      // Gracefully resolve default hierarchy if not already populated on student record
      if (!resolvedCampusId || !resolvedDeptId) {
        const { data: defaultDept } = await supabase
          .from("departments")
          .select("id, college_id, colleges(campus_id)")
          .limit(1)
          .maybeSingle();

        if (defaultDept) {
          resolvedDeptId = resolvedDeptId || defaultDept.id;
          resolvedCollegeId = resolvedCollegeId || defaultDept.college_id;
          const campus = Array.isArray(defaultDept.colleges) ? defaultDept.colleges[0] : defaultDept.colleges;
          resolvedCampusId = resolvedCampusId || (campus as { campus_id: string })?.campus_id || "00000000-0000-0000-0000-000000000001";

          // Auto-save to student record in background
          await supabase
            .from("students")
            .update({
              campus_id: resolvedCampusId,
              college_id: resolvedCollegeId,
              department_id: resolvedDeptId,
            })
            .eq("id", student.id);
        } else {
          resolvedCampusId = resolvedCampusId || "00000000-0000-0000-0000-000000000001";
        }
      }

      // 1. Look up a workflow template for this student's program (optional).
      let workflowTemplateId: string | null = null;
      if (resolvedProgId) {
        const { data: workflows } = await supabase
          .from("workflow_templates")
          .select("id")
          .eq("program_id", resolvedProgId)
          .limit(1);
        workflowTemplateId = workflows?.[0]?.id ?? null;
      }

      // 2. Insert the project.
      const currentYear = new Date().getFullYear();
      const { data: project, error: insertErr } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          student_id: student.id,                // students.id → projects.student_id FK
          campus_id: resolvedCampusId,
          college_id: resolvedCollegeId,
          department_id: resolvedDeptId,
          program_id: resolvedProgId,
          major_id: student.major_id,
          academic_year: currentAcademicYear(),
          workflow_template_id: workflowTemplateId,
        })
        .select("id, title, join_code")
        .single();

      if (insertErr || !project) {
        toast.error(insertErr?.message ?? "Failed to create project");
        return;
      }

      // 3. Insert creator as project member (student_leader).
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          profile_id: student.profile_id,        // profiles.id — NOT students.id
          member_role: "student_leader",          // valid member_role enum value
          is_primary: true,
        });

      if (memberErr) {
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

        {/* Notice if student profile is still loading */}
        {missingHierarchy && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Loading student profile information. Please wait a moment...
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
