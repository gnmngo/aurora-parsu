"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SubmissionCard } from "@/components/dashboard/submission-card";
import { Input } from "@/components/ui/input";
import { Search, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { RubricBuilder } from "@/components/grading/rubric-builder";
import { PdfUploader } from "@/components/documents/pdf-uploader";
import {
  fetchSubmissions,
  type SubmissionRow,
} from "@/lib/projects/queries";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function SubmissionsPage() {
  const [submissionsList, setSubmissionsList] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const { isReady } = useAuthReady();
  const supabase = createClient();

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const rows = await fetchSubmissions(supabase);
      setSubmissionsList(rows);
    } catch (err: unknown) {
      logSupabaseError("Submissions.loadSubmissions", err);
      toast.error("Failed to load submissions. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) {
      return;
    }
    loadSubmissions();
  }, [isReady, supabase]);

  const filteredSubmissions = submissionsList.filter(
    (sub) =>
      sub.title.toLowerCase().includes(filterText.toLowerCase()) ||
      sub.studentName.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["coordinator", "adviser", "sys_admin"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Submissions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage, configure, and review research projects and manuscripts
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <CreateProjectDialog onProjectCreated={loadSubmissions} />
            <RubricBuilder onRubricCreated={loadSubmissions} />
            <PdfUploader onUploadCompleted={loadSubmissions} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter submissions..."
              className="pl-9"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        {!isReady || loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Submissions Found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md font-semibold">
              Create a project, configure a grading rubric, and upload a PDF
              manuscript to begin the review workflow.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((sub, i) => (
              <motion.div
                key={sub.projectId + "-" + sub.stageId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <SubmissionCard {...sub} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
