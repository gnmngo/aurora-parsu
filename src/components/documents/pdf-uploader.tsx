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
import { FileUp, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { computeFileSha256, getManuscriptSignedUrl } from "@/lib/documents";

interface ProjectOption {
  id: string;
  title: string;
  current_stage_id: string | null;
}

export function PdfUploader({
  onUploadCompleted,
}: {
  onUploadCompleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

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

        // 🚨 REAL ERROR LOGGING
        if (projRes.error) {
          console.error("PROJECT LOAD ERROR:", projRes.error);
          throw projRes.error;
        }

        if (stageRes.error) {
          console.error("STAGE LOAD ERROR:", stageRes.error);
          throw stageRes.error;
        }

        const projData = projRes.data ?? [];
        const stageData = stageRes.data ?? [];

        setProjects(projData);
        setStages(stageData);

        // safe defaults
        if (projData.length > 0) {
          const first = projData[0];
          setSelectedProject(first.id);

          if (first.current_stage_id) {
            setSelectedStage(first.current_stage_id);
          } else if (stageData.length > 0) {
            setSelectedStage(stageData[0].id);
          }
        }
      } catch (err: any) {
        console.log("FULL UPLOAD DATA ERROR:", err);
        console.log("STRINGIFIED:", JSON.stringify(err, null, 2));

        toast.error(
          err?.message || "Failed to load upload data (check console)"
        );
      }
    }

    loadData();
  }, [open, supabase]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);

    const project = projects.find((p) => p.id === projectId);
    if (project?.current_stage_id) {
      setSelectedStage(project.current_stage_id);
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
      toast.error("Please complete all fields.");
      return;
    }

    setUploading(true);
    let uploadedPath: string | null = null;

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;

      if (!userId) throw new Error("No active session");

      const checksum = await computeFileSha256(file);
      const fileName = `${Date.now()}_${checksum.slice(0, 8)}.pdf`;
      const filePath = `${selectedProject}/${selectedStage}/${fileName}`;
      uploadedPath = filePath;

      const { error: storageError } = await supabase.storage
        .from("manuscripts")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (storageError) throw storageError;

      const signedUrl = await getManuscriptSignedUrl(supabase, filePath);

      const { data: docData, error: docError } = await supabase
        .from("documents")
        .upsert(
          {
            project_id: selectedProject,
            stage_id: selectedStage,
            title: file.name.replace(/\.[^/.]+$/, ""),
            status: "under_review",
            created_by: userId,
          },
          { onConflict: "project_id,stage_id" }
        )
        .select()
        .single();

      if (docError) throw docError;

      const { data: versions, error: versionFetchError } = await supabase
        .from("document_versions")
        .select("version_number")
        .eq("document_id", docData.id)
        .order("version_number", { ascending: false });

      if (versionFetchError) throw versionFetchError;

      const nextVersion =
        versions && versions.length > 0
          ? versions[0].version_number + 1
          : 1;

      await supabase
        .from("document_versions")
        .update({ is_current: false })
        .eq("document_id", docData.id);

      const { data: verData, error: verError } = await supabase
        .from("document_versions")
        .insert({
          document_id: docData.id,
          version_number: nextVersion,
          storage_path: filePath,
          file_url: signedUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          checksum_sha256: checksum,
          uploaded_by: userId,
          is_current: true,
          change_summary:
            nextVersion === 1
              ? "Initial upload"
              : `Revision v${nextVersion}`,
        })
        .select()
        .single();

      if (verError) throw verError;

      await supabase.from("document_upload_history").insert({
        document_id: docData.id,
        version_id: verData.id,
        performed_by: userId,
        action: "upload",
      });

      await supabase.from("evaluation_events").insert({
        project_id: selectedProject,
        stage_id: selectedStage,
        event_type: "document_version_uploaded",
        payload: {
          document_id: docData.id,
          document_version_id: verData.id,
          version_number: nextVersion,
          storage_path: filePath,
        },
      });

      await supabase
        .from("projects")
        .update({
          status: "under_review",
          current_stage_id: selectedStage,
        })
        .eq("id", selectedProject);

      toast.success(`PDF v${nextVersion} uploaded successfully.`, {
        action: {
          label: "Open Workspace",
          onClick: () =>
            router.push(`/workspace/${selectedProject}/${selectedStage}`),
        },
      });

      setFile(null);
      setOpen(false);
      onUploadCompleted();
    } catch (err: any) {
      console.log("UPLOAD ERROR:", err);
      console.log(JSON.stringify(err, null, 2));

      if (uploadedPath) {
        await supabase.storage
          .from("manuscripts")
          .remove([uploadedPath]);
      }

      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileUp className="mr-1.5 h-4 w-4" />
          Upload PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Research Manuscript</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          {/* PROJECT */}
          <div className="space-y-1">
            <Label>Select Project</Label>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-xl border p-2 text-sm"
            >
              {projects.length === 0 ? (
                <option>No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>

            {projects.length === 0 && (
              <p className="text-xs text-red-500">
                No projects found (check RLS or seed data)
              </p>
            )}
          </div>

          {/* STAGE */}
          <div className="space-y-1">
            <Label>Select Stage</Label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full rounded-xl border p-2 text-sm"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* FILE */}
          <div className="space-y-2">
            <Label>PDF File</Label>

            <input type="file" accept="application/pdf" onChange={handleFileChange} />

            {file && (
              <p className="text-xs text-primary">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Submit PDF"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}