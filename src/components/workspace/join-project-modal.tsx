"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface JoinProjectModalProps {
  onSuccess: () => void;
  studentId?: string;
}

export function JoinProjectModal({ onSuccess, studentId }: JoinProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      toast.error("Please enter a valid join code");
      return;
    }

    setLoading(true);
    try {
      // 1. Get current authenticated user
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        toast.error("You must be signed in to join a project");
        return;
      }

      // 2. Look up the project by join code
      const { data: project, error: searchErr } = await supabase
        .from("projects")
        .select("id, title, student_id")
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

      // 3. Ensure student record exists
      let profileId = user.id;
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id, profile_id")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (!existingStudent) {
        // Create student row if missing
        await supabase.from("students").insert({
          profile_id: profileId,
          year_level: 4,
        });
      }

      // 4. Check for duplicate membership
      const { data: existingMember } = await supabase
        .from("project_members")
        .select("id, member_role")
        .eq("project_id", project.id)
        .eq("profile_id", profileId)
        .maybeSingle();

      if (existingMember) {
        toast.info(`You are already a member of "${project.title}". Loading your project...`);
        setJoinCode("");
        setOpen(false);
        onSuccess();
        return;
      }

      // 5. Insert project member
      const { error: joinErr } = await supabase.from("project_members").insert({
        project_id: project.id,
        profile_id: profileId,
        member_role: "student",
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
        <Button variant="outline" className="w-full justify-center gap-2 font-bold h-10">
          <UserPlus className="w-4 h-4 text-primary" />
          Join Existing Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Join Research Team
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Enter 6-Character Join Code
            </label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3F9K"
              maxLength={8}
              className="text-center text-lg font-black tracking-[0.25em] h-12 uppercase"
              disabled={loading}
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ask your project leader for their 6-character code (found on their project Overview page).
            </p>
          </div>
          <Button type="submit" className="w-full font-bold h-10" disabled={loading || !joinCode.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
