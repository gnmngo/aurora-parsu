"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface JoinProjectModalProps {
  onSuccess: () => void;
  studentId: string;
}

export function JoinProjectModal({ onSuccess, studentId }: JoinProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || joinCode.length < 6) {
      toast.error("Please enter a valid join code");
      return;
    }
    
    setLoading(true);
    try {
      // Find project by join code
      const { data: project, error: searchErr } = await supabase
        .from("projects")
        .select("id")
        .eq("join_code", joinCode.toUpperCase())
        .single();
        
      if (searchErr || !project) {
        toast.error("Invalid join code or project not found");
        return;
      }

      // Add to project members
      const { error: joinErr } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          student_id: studentId,
          role: "member"
        });

      if (joinErr) {
        toast.error(joinErr.message || "Failed to join project");
        return;
      }

      toast.success("Successfully joined project!");
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
              placeholder="e.g. ABCDEF"
              maxLength={8}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Ask your project leader or adviser for the 6-8 character join code.
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
