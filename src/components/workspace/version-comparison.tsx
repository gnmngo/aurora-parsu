"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, BookOpen, ExternalLink, Columns } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionComparisonProps {
  documentVersions: { id: string; file_url?: string; storage_path?: string; version_number?: number }[];
}

export function VersionComparison({ documentVersions }: VersionComparisonProps) {
  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");

  useEffect(() => {
    if (documentVersions && documentVersions.length >= 2) {
      setLeftVersionId(documentVersions[documentVersions.length - 2].id);
      setRightVersionId(documentVersions[documentVersions.length - 1].id);
    } else if (documentVersions && documentVersions.length > 0) {
      setLeftVersionId(documentVersions[0].id);
      setRightVersionId(documentVersions[0].id);
    }
  }, [documentVersions]);

  if (!documentVersions || documentVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground">
        <AlertTriangle className="h-8 w-8 opacity-30 mb-2" />
        <p>No manuscript versions available to compare.</p>
      </div>
    );
  }

  const leftVer = documentVersions.find((v) => v.id === leftVersionId);
  const rightVer = documentVersions.find((v) => v.id === rightVersionId);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Selection Header */}
      <Card className="shadow-xs shrink-0 border-border">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Left Version */}
            <div className="space-y-1 w-full sm:w-40">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Base Manuscript</label>
              <select
                value={leftVersionId}
                onChange={(e) => setLeftVersionId(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-semibold focus:outline-none"
              >
                {documentVersions.map((v, idx) => (
                  <option key={v.id} value={v.id}>
                    Version {v.version_number || idx + 1} (Previous)
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground mt-3 shrink-0" />

            {/* Right Version */}
            <div className="space-y-1 w-full sm:w-40">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Revised Manuscript</label>
              <select
                value={rightVersionId}
                onChange={(e) => setRightVersionId(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-input bg-card px-2 font-semibold focus:outline-none"
              >
                {documentVersions.map((v, idx) => (
                  <option key={v.id} value={v.id}>
                    Version {v.version_number || idx + 1} (Latest)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold text-primary gap-1">
              <Columns className="h-3 w-3" />
              Side-by-Side Review
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Dual Viewport */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Base Version Viewport */}
        <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">
              Base: Version {leftVer?.version_number || "1"}
            </span>
            {leftVer?.file_url && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" asChild>
                <a href={leftVer.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> New Tab
                </a>
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/30">
            {leftVer?.file_url ? (
              <iframe
                src={`${leftVer.file_url}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title="Base Version"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Base document preview not available.
              </div>
            )}
          </div>
        </div>

        {/* Revised Version Viewport */}
        <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
            <span className="font-bold text-primary">
              Revised: Version {rightVer?.version_number || "2"} (Latest)
            </span>
            {rightVer?.file_url && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" asChild>
                <a href={rightVer.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> New Tab
                </a>
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/30">
            {rightVer?.file_url ? (
              <iframe
                src={`${rightVer.file_url}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title="Revised Version"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Revised document preview not available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
