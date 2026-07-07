"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Download,
  History,
  GitCompare,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}: SubmissionCardProps) {
  const status = statusConfig[reviewStatus] ?? {
    label: reviewStatus.replace(/_/g, " "),
    variant: "outline" as const,
  };

  const canOpenWorkspace = Boolean(stageId) && hasDocument;

  return (
    <Card className="group">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
              <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{title}</h3>
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
                  <>
                    Submitted{" "}
                    {format(new Date(submittedAt), "MMM d, yyyy 'at' h:mm a")}
                  </>
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
              <Button size="sm" disabled title="Upload a PDF first">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Review
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={!hasDocument}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button size="sm" variant="outline" disabled={!hasDocument}>
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button size="sm" variant="outline" disabled={!hasDocument}>
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
