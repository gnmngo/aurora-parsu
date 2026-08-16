"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * studentId = students.id (NOT profiles.id).
 *
 * UUID chain verified from live DB:
 *   students.id        → projects.student_id (FK)
 *   students.profile_id → profiles.id = auth.users.id
 *   project_members.profile_id → profiles.id   ← we must look this up
 *
 * The modal resolves profile_id from students before inserting project_members.
 */
interface JoinProjectModalProps {
  onSuccess: () => void;
  studentId: string; // students.id — used only to look up students.profile_id
}

export function JoinProjectModal({ onSuccess, studentId }: JoinProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 6) {
      toast.error("Please enter a valid 6-character join code");
      return;
    }

    if (!studentId) {
      toast.error("Student profile not loaded. Please refresh the page.");
      return;
    }

    setLoading(true);
    try {
      // 1. Look up the project by join code.
      //    Using maybeSingle() so a missing code returns null (not an error).
      //    join_code has a UNIQUE constraint in the DB.
      const { data: project, error: searchErr } = await supabase
        .from("projects")
        .select("id, title")
        .eq("join_code", code)
        .maybeSingle();

      if (searchErr) {
        toast.error(`Error searching for project: ${searchErr.message}`);
        return;
      }
      if (!project) {
        toast.error("Invalid join code. No project found with that code.");
        return;
      }

      // 2. Resolve the student's profile_id.
      //    studentId = students.id (passed from parent page)
      //    project_members.profile_id requires profiles.id
      const { data: studentRecord, error: stuErr } = await supabase
        .from("students")
        .select("profile_id")
        .eq("id", studentId)
        .maybeSingle();

      if (stuErr || !studentRecord?.profile_id) {
        toast.error("Could not load your student profile. Please refresh the page.");
        return;
      }

      // 3. Check for duplicate membership.
      //    The unique constraint is (project_id, profile_id, member_role).
      //    We check any membership first to avoid confusing error messages.
      const { data: existing } = await supabase
        .from("project_members")
        .select("id, member_role")
        .eq("project_id", project.id)
        .eq("profile_id", studentRecord.profile_id)
        .maybeSingle();

      if (existing) {
        toast.error(
          `You are already a member of this project (role: ${existing.member_role}).`
        );
        return;
      }

      // 4. Insert the student as a project member.
      //    member_role 'student' is a valid member_role enum value.
      //    profile_id = profiles.id (verified from students.profile_id above)
      const { error: joinErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          profile_id: studentRecord.profile_id,  // profiles.id — NOT students.id
          member_role: "student",                 // valid member_role enum value
          is_primary: false,
        });

      if (joinErr) {
        toast.error(`Failed to join project: ${joinErr.message}`);
        return;
      }

      toast.success(`Successfully joined "${project.title}"!`);
      setJoinCode("");
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
        <Button variant="outline" className="w-full justify-start gap-2">
          <UserPlus className="w-4 h-4" />
          Join Existing Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Join Code</label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3F9K"
              maxLength={8}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ask your project leader or adviser for the 6-character join code.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
