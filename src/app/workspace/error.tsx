"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 text-foreground">
      <Card className="w-full max-w-lg shadow-xl border-border bg-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
            <AlertCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Workspace Render Interrupted
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            An issue occurred while rendering the manuscript review &amp; evaluation workspace.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {error?.message && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 font-mono text-[11px] text-destructive break-words">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => reset()}
              className="flex-1 gap-2 font-bold rounded-xl h-9 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry Workspace
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 gap-2 font-bold rounded-xl h-9 text-xs"
            >
              <Link href="/workspace">
                <BookOpen className="h-3.5 w-3.5" /> All Projects
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="gap-2 font-bold rounded-xl h-9 text-xs"
            >
              <Link href="/dashboard">
                <Home className="h-3.5 w-3.5" /> Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
