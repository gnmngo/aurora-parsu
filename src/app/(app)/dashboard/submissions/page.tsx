"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SubmissionCard } from "@/components/dashboard/submission-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Inbox, AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useAuth } from "@/hooks/use-auth";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const { isReady } = useAuthReady();
  const { roles } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const isStudent = Boolean(roles?.includes("student") && !roles?.some(r => ["coordinator", "sys_admin", "adviser"].includes(r)));
  const isManagement = Boolean(roles?.some(r => ["coordinator", "sys_admin"].includes(r)));
  const isAdviser = Boolean(roles?.includes("adviser"));

  const loadSubmissions = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchSubmissions(supabase);
      setSubmissionsList(rows);
    } catch (err: unknown) {
      logSupabaseError("Submissions.loadSubmissions", err);
      const msg = err instanceof Error ? err.message : "Failed to load submissions from database.";
      setErrorMessage(msg);
      toast.error("Failed to load submissions. Check network or permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) {
      return;
    }
    loadSubmissions();
    // loadSubmissions is defined in component body; isReady is the correct trigger dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const filteredSubmissions = submissionsList.filter(
    (sub) =>
      sub.title.toLowerCase().includes(filterText.toLowerCase()) ||
      sub.studentName.toLowerCase().includes(filterText.toLowerCase()) ||
      sub.stage.toLowerCase().includes(filterText.toLowerCase()) ||
      sub.department.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <RoleGuard
      allowedRoles={["coordinator", "adviser", "panelist", "student", "sys_admin", "college_dean"]}
      fallback={<AccessDenied />}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isStudent ? "My Research Submissions" : "Submissions"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isStudent
                ? "Track and manage your submitted manuscripts, revisions, and defense review status"
                : "Manage, configure, and review research projects and manuscripts"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {isManagement && (
              <>
                <CreateProjectDialog onProjectCreated={loadSubmissions} />
                <RubricBuilder onRubricCreated={loadSubmissions} />
              </>
            )}
            {isAdviser && !isManagement && (
              <CreateProjectDialog onProjectCreated={loadSubmissions} />
            )}
            {isStudent && (
              <Button variant="outline" size="sm" asChild className="gap-1.5 h-8">
                <Link href="/dashboard/my-project">
                  <BookOpen className="h-4 w-4" />
                  My Project Hub
                </Link>
              </Button>
            )}
            <PdfUploader
              onUploadCompleted={loadSubmissions}
              buttonText={isStudent ? "Upload Manuscript" : "Upload PDF"}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter submissions by title, author, stage..."
              className="pl-9"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          {filteredSubmissions.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium">
              Showing {filteredSubmissions.length} of {submissionsList.length} submissions
            </p>
          )}
        </div>

        {errorMessage ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="text-base font-bold text-slate-900">Failed to Retrieve Submissions</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {errorMessage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSubmissions}
              className="mt-4 gap-2 bg-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Query
            </Button>
          </div>
        ) : !isReady || loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Submissions Found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              {isStudent
                ? "You have not submitted a manuscript yet. Upload your PDF manuscript or configure your project in My Project to begin."
                : "Create a project, configure a grading rubric, and upload a PDF manuscript to begin the review workflow."}
            </p>
            {isStudent && (
              <Button asChild size="sm" className="mt-4 gap-2">
                <Link href="/dashboard/my-project">
                  <BookOpen className="h-4 w-4" />
                  Go to My Project
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((sub, i) => (
              <motion.div
                key={sub.projectId + "-" + sub.stageId + "-" + sub.version}
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
