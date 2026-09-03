"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, AlertTriangle, UserCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createProjectAction } from "@/lib/projects/actions";

interface StudentRecord {
  id: string;
  profile_id: string;
  campus_id: string | null;
  college_id: string | null;
  department_id: string | null;
  program_id: string | null;
  major_id: string | null;
}

interface FacultyOption {
  profile_id: string;
  name: string;
  email: string;
}

interface CreateProjectModalProps {
  onSuccess: () => void;
  student: StudentRecord | null;
}

export function CreateProjectModal({ onSuccess, student }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [selectedAdviser, setSelectedAdviser] = useState("");
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    title: string;
    join_code: string | null;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const supabase = createClient();
  const missingHierarchy = !student;

  useEffect(() => {
    if (!open) return;

    async function loadFaculty() {
      setLoadingFaculty(true);
      try {
        const { data, error } = await supabase
          .from("faculty")
          .select("profile_id, profiles(first_name, last_name, email, status)")
          .order("created_at", { ascending: true });

        if (!error && data) {
          const list: FacultyOption[] = [];
          for (const item of data) {
            const prof = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            if (prof && prof.status === "approved") {
              list.push({
                profile_id: item.profile_id,
                name: `${prof.first_name} ${prof.last_name}`,
                email: prof.email,
              });
            }
          }
          setFacultyList(list);
        }
      } catch (err) {
        console.error("Failed to load faculty options:", err);
      } finally {
        setLoadingFaculty(false);
      }
    }

    loadFaculty();
  }, [open, supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    setLoading(true);
    try {
      const res = await createProjectAction({
        title: title.trim(),
        abstract: abstract.trim() || undefined,
        adviserProfileId: selectedAdviser || undefined,
      });

      if (!res.success || !res.project) {
        toast.error(res.error || "Failed to create project.");
        return;
      }

      setCreatedProject({
        id: res.project.id,
        title: res.project.title,
        join_code: res.project.join_code,
      });

      toast.success(
        `Project created! Join code: ${res.project.join_code || "Generated"}`
      );
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdProject?.join_code) return;
    navigator.clipboard.writeText(createdProject.join_code);
    setCopiedCode(true);
    toast.success("Join code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setTitle("");
    setAbstract("");
    setSelectedAdviser("");
    setCreatedProject(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start gap-2 font-bold shadow-sm">
          <Plus className="w-4 h-4" />
          Create New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Create Research Project
          </DialogTitle>
          <DialogDescription className="text-xs">
            Register your capstone or thesis topic, select an adviser, and generate team credentials.
          </DialogDescription>
        </DialogHeader>

        {createdProject ? (
          <div className="space-y-4 py-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 text-center space-y-2">
              <p className="font-bold text-sm text-emerald-900">Project Successfully Initialized!</p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                &ldquo;{createdProject.title}&rdquo; is now registered at <strong>Stage 1 (Concept Defense)</strong>.
              </p>
            </div>

            {createdProject.join_code && (
              <div className="p-3.5 bg-muted/60 rounded-xl border border-border space-y-2">
                <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                  Team Join Code (Share with Co-Authors)
                </p>
                <div className="flex items-center justify-between gap-2 bg-background p-2.5 rounded-lg border border-border">
                  <span className="font-mono text-lg font-black tracking-widest text-primary">
                    {createdProject.join_code}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs font-bold"
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Your teammates can enter this code in the &quot;Join Existing Project&quot; dialog to link their accounts to this submission.
                </p>
              </div>
            )}

            <Button className="w-full font-bold" onClick={handleClose}>
              Proceed to Project Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3.5 pt-1">
            {missingHierarchy && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>Loading student profile information. Please wait a moment...</p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Project Title / Working Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AI-driven Academic Defense Management System"
                disabled={loading || missingHierarchy}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Research Adviser</Label>
              <select
                value={selectedAdviser}
                onChange={(e) => setSelectedAdviser(e.target.value)}
                disabled={loading || loadingFaculty}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">-- Select Research Adviser (Optional) --</option>
                {facultyList.map((f) => (
                  <option key={f.profile_id} value={f.profile_id}>
                    {f.name} ({f.email})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                You can also assign or change your adviser later from your project dashboard.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Scope / Brief Abstract (Optional)</Label>
              <textarea
                value={abstract}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAbstract(e.target.value)}
                placeholder="Provide a brief background or overview of your research objectives..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full font-bold h-9 mt-2"
              disabled={loading || missingHierarchy}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Research Project
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
