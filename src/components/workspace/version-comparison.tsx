"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface VersionComparisonProps {
  documentVersions: any[];
}

interface DiffToken {
  type: "added" | "removed" | "unchanged";
  value: string;
}

export function VersionComparison({ documentVersions }: VersionComparisonProps) {
  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [leftText, setLeftText] = useState<string>("");
  const [rightText, setRightText] = useState<string>("");
  const [diffResult, setDiffResult] = useState<DiffToken[]>([]);

  useEffect(() => {
    if (documentVersions && documentVersions.length >= 2) {
      setLeftVersionId(documentVersions[documentVersions.length - 2].id);
      setRightVersionId(documentVersions[documentVersions.length - 1].id);
    } else if (documentVersions && documentVersions.length > 0) {
      setLeftVersionId(documentVersions[0].id);
      setRightVersionId(documentVersions[0].id);
    }
  }, [documentVersions]);

  // LCS word diffing algorithm
  const computeWordDiff = (oldStr: string, newStr: string): DiffToken[] => {
    const oldWords = oldStr.trim().split(/\s+/).filter(Boolean);
    const newWords = newStr.trim().split(/\s+/).filter(Boolean);

    const dp: number[][] = Array(oldWords.length + 1)
      .fill(0)
      .map(() => Array(newWords.length + 1).fill(0));

    for (let i = 1; i <= oldWords.length; i++) {
      for (let j = 1; j <= newWords.length; j++) {
        if (oldWords[i - 1] === newWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffToken[] = [];
    let i = oldWords.length;
    let j = newWords.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
        result.unshift({ type: "unchanged", value: oldWords[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: "added", value: newWords[j - 1] });
        j--;
      } else {
        result.unshift({ type: "removed", value: oldWords[i - 1] });
        i--;
      }
    }

    return result;
  };

  const handleCompare = async () => {
    if (!leftVersionId || !rightVersionId) {
      toast.error("Please select both versions to compare.");
      return;
    }

    setLoading(true);
    try {
      const leftVer = documentVersions.find((v) => v.id === leftVersionId);
      const rightVer = documentVersions.find((v) => v.id === rightVersionId);

      if (!leftVer || !rightVer) throw new Error("Selected versions not found.");

      // Function to extract text from a single PDF version url
      const extractText = async (url: string): Promise<string> => {
        try {
          const loadingTask = pdfjsLib.getDocument({ url });
          const pdf = await loadingTask.promise;
          let fullText = "";

          for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
            const page = await pdf.getPage(pNum);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items
              .map((item: any) => item.str)
              .join(" ");
            fullText += pageStr + "\n\n";
          }
          return fullText;
        } catch (err) {
          console.error("Error reading PDF url:", url, err);
          return "Failed to extract PDF text.";
        }
      };

      const [textL, textR] = await Promise.all([
        extractText(leftVer.file_url),
        extractText(rightVer.file_url),
      ]);

      setLeftText(textL);
      setRightText(textR);

      // Perform word diff comparison
      const diffs = computeWordDiff(textL, textR);
      setDiffResult(diffs);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not compare versions. Check storage connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Run automatically when selections load
  useEffect(() => {
    if (leftVersionId && rightVersionId) {
      handleCompare();
    }
  }, [leftVersionId, rightVersionId]);

  if (!documentVersions || documentVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground">
        <AlertTriangle className="h-8 w-8 opacity-30 mb-2" />
        <p>No manuscript versions available to compare.</p>
      </div>
    );
  }

  const leftVerNum = documentVersions.findIndex((v) => v.id === leftVersionId) + 1;
  const rightVerNum = documentVersions.findIndex((v) => v.id === rightVersionId) + 1;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Selection Header */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Left Version */}
            <div className="space-y-1 w-full sm:w-36">
              <label className="text-[10px] text-muted-foreground uppercase">Base Version</label>
              <select
                value={leftVersionId}
                onChange={(e) => setLeftVersionId(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-card px-2 focus:outline-none"
              >
                {documentVersions.map((v, idx) => (
                  <option key={v.id} value={v.id}>
                    Version {idx + 1}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground mt-3 flex-shrink-0" />

            {/* Right Version */}
            <div className="space-y-1 w-full sm:w-36">
              <label className="text-[10px] text-muted-foreground uppercase">Revised Version</label>
              <select
                value={rightVersionId}
                onChange={(e) => setRightVersionId(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-card px-2 focus:outline-none"
              >
                {documentVersions.map((v, idx) => (
                  <option key={v.id} value={v.id}>
                    Version {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleCompare}
            disabled={loading}
            className="h-8 rounded-xl px-4 gap-1.5 mt-2 sm:mt-0 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Diffing...
              </>
            ) : (
              <>
                <BookOpen className="h-3.5 w-3.5" /> Re-Compare
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Diffs comparison panels */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 h-[550px] overflow-hidden">
        {/* Left Side: Removed text view */}
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="py-2.5 px-4 bg-rose-50/50 border-b border-border flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Base Version (v{leftVerNum})</span>
            <Badge variant="outline" className="text-[9px] border-rose-200 text-rose-600 bg-rose-50/30">
              Deletions View
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed font-mono">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : diffResult.length === 0 ? (
              <p className="italic text-muted-foreground text-center pt-20">Extracting base text...</p>
            ) : (
              <div className="flex flex-wrap gap-x-1 gap-y-1.5">
                {diffResult
                  .filter((tok) => tok.type !== "added")
                  .map((tok, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "rounded px-0.5",
                        tok.type === "removed" && "bg-rose-100 text-rose-800 border border-rose-200 line-through"
                      )}
                    >
                      {tok.value}
                    </span>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Added text view */}
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="py-2.5 px-4 bg-emerald-50/50 border-b border-border flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Revised Version (v{rightVerNum})</span>
            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-600 bg-emerald-50/30">
              Additions View
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed font-mono">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : diffResult.length === 0 ? (
              <p className="italic text-muted-foreground text-center pt-20">Extracting revised text...</p>
            ) : (
              <div className="flex flex-wrap gap-x-1 gap-y-1.5">
                {diffResult
                  .filter((tok) => tok.type !== "removed")
                  .map((tok, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "rounded px-0.5",
                        tok.type === "added" && "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      )}
                    >
                      {tok.value}
                    </span>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
