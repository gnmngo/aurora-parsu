"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { FileUp, UploadCloud, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { computeFileSha256 } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { notifyAdviserManuscriptUploadedAction } from "@/lib/projects/actions";

interface ProjectOption {
  id: string;
  title: string;
  current_stage_id: string | null;
}

interface PdfUploaderProps {
  onUploadCompleted?: () => void;
  projectId?: string;
  stageId?: string;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg";
  className?: string;
}

export function PdfUploader({
  onUploadCompleted,
  projectId,
  stageId,
  buttonText = "Upload PDF",
  buttonVariant = "default",
  buttonSize = "default",
  className,
}: PdfUploaderProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || "");
  const [selectedStage, setSelectedStage] = useState(stageId || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Sync props if passed
  useEffect(() => {
    if (projectId) setSelectedProject(projectId);
    if (stageId) setSelectedStage(stageId);
  }, [projectId, stageId]);

  useEffect(() => {
    if (!open) return;

    async function loadData() {
      try {
        const [projRes, stageRes] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, current_stage_id")
            .order("created_at", { ascending: false }),

          supabase
            .from("defense_stages")
            .select("id, name")
            .order("sequence_order", { ascending: true }),
        ]);

        if (projRes.error) throw projRes.error;
        if (stageRes.error) throw stageRes.error;

        const projData = projRes.data ?? [];
        const stageData = stageRes.data ?? [];

        setProjects(projData);
        setStages(stageData);

        // Safe defaults if not already set
        if (!selectedProject && projData.length > 0) {
          const first = projData[0];
          setSelectedProject(first.id);
          if (first.current_stage_id) {
            setSelectedStage(first.current_stage_id);
          } else if (stageData.length > 0) {
            setSelectedStage(stageData[0].id);
          }
        } else if (selectedProject && !selectedStage) {
          const activeProj = projData.find((p) => p.id === selectedProject);
          if (activeProj?.current_stage_id) {
            setSelectedStage(activeProj.current_stage_id);
          } else if (stageData.length > 0) {
            setSelectedStage(stageData[0].id);
          }
        }
      } catch (err: unknown) {
        console.error("Error loading project/stage data for upload:", err);
      }
    }

    loadData();
  }, [open, supabase, selectedProject, selectedStage]);

  const handleProjectChange = (projId: string) => {
    setSelectedProject(projId);
    const p = projects.find((x) => x.id === projId);
    if (p?.current_stage_id) {
      setSelectedStage(p.current_stage_id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB limit.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !selectedProject || !selectedStage) {
      toast.error("Please select a file and ensure project/stage are assigned.");
      return;
    }

    setUploading(true);
    let uploadedPath: string | null = null;

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) throw new Error("Not authenticated. Please log in.");
      const userId = authUser.id;

      // Ensure target project and stage are resolved
      let targetProjectId = selectedProject;
      let targetStageId = selectedStage;

      if (!targetProjectId && projects.length > 0) {
        targetProjectId = projects[0].id;
      }

      if (!targetStageId) {
        if (targetProjectId) {
          const activeProj = projects.find((p) => p.id === targetProjectId);
          if (activeProj?.current_stage_id) {
            targetStageId = activeProj.current_stage_id;
          }
        }
        if (!targetStageId && stages.length > 0) {
          targetStageId = stages[0].id;
        }
      }

      if (!targetProjectId || !targetStageId) {
        throw new Error("Unable to determine active defense stage. Please select a stage.");
      }

      const checksum = await computeFileSha256(file);
      const fileName = `${Date.now()}_${checksum.slice(0, 8)}.pdf`;
      const filePath = `${targetProjectId}/${targetStageId}/${fileName}`;
      uploadedPath = filePath;

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("manuscripts")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (storageError) throw storageError;

      // 2. Query or create document record
      let docData: { id: string } | null = null;
      const { data: existingDoc } = await supabase
        .from("documents")
        .select("id")
        .eq("project_id", targetProjectId)
        .eq("stage_id", targetStageId)
        .maybeSingle();

      if (existingDoc) {
        const { data: updatedDoc, error: updDocErr } = await supabase
          .from("documents")
          .update({
            title: file.name.replace(/\.[^/.]+$/, ""),
            status: "under_review",
          })
          .eq("id", existingDoc.id)
          .select()
          .maybeSingle();

        if (updDocErr) throw updDocErr;
        docData = updatedDoc;
      } else {
        const { data: insertedDoc, error: insDocErr } = await supabase
          .from("documents")
          .insert({
            project_id: targetProjectId,
            stage_id: targetStageId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            status: "under_review",
            created_by: userId,
          })
          .select()
          .maybeSingle();

        if (insDocErr) throw insDocErr;
        docData = insertedDoc;
      }

      if (!docData) throw new Error("Failed to record manuscript document metadata.");

      // 3. Fetch version numbers
      const { data: versions, error: versionFetchError } = await supabase
        .from("document_versions")
        .select("version_number")
        .eq("document_id", docData.id)
        .order("version_number", { ascending: false });

      if (versionFetchError) throw versionFetchError;

      const nextVersion =
        versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // 4. Mark existing versions as not current
      await supabase
        .from("document_versions")
        .update({ is_current: false })
        .eq("document_id", docData.id);

      // 5. Insert new document version
      const { data: verData, error: verError } = await supabase
        .from("document_versions")
        .insert({
          document_id: docData.id,
          version_number: nextVersion,
          storage_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          checksum_sha256: checksum,
          uploaded_by: userId,
          is_current: true,
          change_summary:
            nextVersion === 1 ? "Initial upload" : `Revision v${nextVersion}`,
        })
        .select()
        .maybeSingle();

      if (verError || !verData) throw verError || new Error("Failed to register document version.");

      // 6. Record upload history and event
      await supabase.from("document_upload_history").insert({
        document_id: docData.id,
        version_id: verData.id,
        performed_by: userId,
        action: "upload",
      });

      await supabase.from("evaluation_events").insert({
        project_id: targetProjectId,
        stage_id: targetStageId,
        event_type: "document_version_uploaded",
        payload: {
          document_id: docData.id,
          document_version_id: verData.id,
          version_number: nextVersion,
          storage_path: filePath,
        },
      });

      // 7. Update project current stage and status
      await supabase
        .from("projects")
        .update({
          status: "under_review",
          current_stage_id: targetStageId,
        })
        .eq("id", targetProjectId);

      // 8. Notify assigned adviser asynchronously
      notifyAdviserManuscriptUploadedAction(targetProjectId, nextVersion).catch((e) =>
        console.error("Adviser notification failed:", e)
      );

      toast.success(`Manuscript PDF v${nextVersion} uploaded successfully!`, {
        action: {
          label: "View Manuscript",
          onClick: () => router.push(`/workspace/${targetProjectId}/${targetStageId}`),
        },
      });

      setFile(null);
      setOpen(false);
      if (onUploadCompleted) onUploadCompleted();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      if (uploadedPath) {
        await supabase.storage.from("manuscripts").remove([uploadedPath]);
      }
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant} className={cn("gap-2 font-bold shadow-sm", className)}>
          <UploadCloud className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Upload Research Manuscript
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          {/* Project selector only if not pre-bound */}
          {!projectId && (
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Select Project</Label>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {projects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Stage selector only if not pre-bound */}
          {!stageId && (
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Defense Stage</Label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Enhanced PDF Drag & Drop / File Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Manuscript PDF File</Label>

            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40 hover:border-primary/50 cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              {file ? (
                <div className="flex flex-col items-center space-y-2 text-primary">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground truncate max-w-[280px]">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to submit
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Click to browse or drag and drop your PDF
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      PDF documents up to 50MB
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" disabled={uploading}>
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" size="sm" disabled={uploading || !file}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit Manuscript"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}