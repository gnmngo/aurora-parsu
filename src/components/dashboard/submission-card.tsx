"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Download,
  History,
  GitCompare,
  ExternalLink,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SubmissionCardProps {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  studentName: string;
  version: number;
  submittedAt: string;
  stage: string;
  reviewStatus: string;
  score: number | null;
  commentCount: number;
  department: string;
  hasDocument?: boolean;
  storagePath?: string | null;
  fileName?: string | null;
}

const statusConfig: Record<
  string,
  { label: string; variant: "secondary" | "info" | "warning" | "success" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "secondary" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "info" },
  revision_required: { label: "Revision Required", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  passed: { label: "Passed", variant: "success" },
  passed_minor: { label: "Passed (Minor)", variant: "success" },
  passed_major: { label: "Passed (Major)", variant: "warning" },
  failed: { label: "Failed", variant: "warning" },
};

export function SubmissionCard({
  projectId,
  stageId,
  title,
  studentName,
  version,
  submittedAt,
  stage,
  reviewStatus,
  score,
  commentCount,
  department,
  hasDocument = true,
  storagePath,
  fileName: _fileName,
}: SubmissionCardProps) {
  const [downloading, setDownloading] = useState(false);

  const status = statusConfig[reviewStatus] ?? {
    label: reviewStatus.replace(/_/g, " "),
    variant: "outline" as const,
  };

  const canOpenWorkspace = Boolean(stageId) && hasDocument;

  // Defensive date formatting to prevent RangeError: Invalid time value
  let formattedDate = "Recently";
  if (submittedAt) {
    const d = new Date(submittedAt);
    if (!isNaN(d.getTime())) {
      formattedDate = format(d, "MMM d, yyyy 'at' h:mm a");
    }
  }

  const handleDownload = async () => {
    if (!hasDocument) return;
    setDownloading(true);
    try {
      const supabase = createClient();
      let targetPath = storagePath;

      if (!targetPath) {
        // Query latest version storage_path if not directly passed in props
        const { data: docData } = await supabase
          .from("documents")
          .select("document_versions(storage_path, file_name, is_current)")
          .eq("project_id", projectId)
          .maybeSingle();

        const vers = (docData as any)?.document_versions || [];
        const curVer = vers.find((v: any) => v.is_current) || vers[0];
        targetPath = curVer?.storage_path;
      }

      if (!targetPath) {
        toast.error("Manuscript file storage path could not be located.");
        return;
      }

      const { data, error } = await supabase.storage
        .from("manuscripts")
        .createSignedUrl(targetPath, 3600);

      if (error || !data?.signedUrl) {
        toast.error("Failed to generate download link: " + (error?.message || "Storage error"));
        return;
      }

      window.open(data.signedUrl, "_blank");
      toast.success("Opening manuscript PDF...");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download manuscript.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="group transition-all hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
              <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {studentName} • {department}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {hasDocument ? `v${version}` : "No manuscript"}
                </Badge>
                <Badge variant="secondary">{stage}</Badge>
                <Badge variant={status.variant}>{status.label}</Badge>
                {score !== null && (
                  <Badge variant="success">{score.toFixed(1)}%</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {hasDocument ? (
                  <>Submitted {formattedDate}</>
                ) : (
                  "Upload a PDF to begin review"
                )}
                {commentCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {commentCount} comments
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canOpenWorkspace ? (
              <Button size="sm" asChild>
                <Link href={`/workspace/${projectId}/${stageId}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Review
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled title="Upload a PDF manuscript first">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Review
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={!hasDocument || downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? "Preparing..." : "Download"}
            </Button>

            {canOpenWorkspace ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/workspace/${projectId}/${stageId}?tab=history`}>
                  <History className="h-3.5 w-3.5" />
                  History
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            )}

            {canOpenWorkspace ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/workspace/${projectId}/${stageId}?tab=compare`}>
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
