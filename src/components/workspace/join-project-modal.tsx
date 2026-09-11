"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { joinProjectAction } from "@/lib/projects/actions";

interface JoinProjectModalProps {
  onSuccess: () => void;
  studentId?: string;
}

export function JoinProjectModal({ onSuccess, studentId }: JoinProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = joinCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code || code.length < 4) {
      toast.error("Please enter a valid join code");
      return;
    }

    setLoading(true);
    try {
      const res = await joinProjectAction(code);

      if (!res.success) {
        toast.error(res.error || "Failed to join project.");
        return;
      }

      if (res.alreadyMember) {
        toast.info(`You are already a member of "${res.project?.title}". Loading your project...`);
      } else {
        toast.success(`Successfully joined "${res.project?.title}"!`);
      }

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
