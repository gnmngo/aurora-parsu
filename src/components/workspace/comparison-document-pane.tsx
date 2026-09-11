"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import {
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  AlertCircle,
  Highlighter,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Configure local PDF worker
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface ComparisonAnnotation {
  id: string;
  document_version_id: string;
  page_number: number;
  type?: string;
  severity: "info" | "minor" | "major" | "critical";
  status: "open" | "in_progress" | "addressed" | "verified" | "resolved" | "closed";
  content: string;
  selected_text?: string | null;
  coordinates?: {
    isDrawing?: boolean;
    svgPath?: string;
    strokeColor?: string;
    strokeWidth?: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ComparisonDocumentPaneProps {
  paneId: "base" | "revised";
  title: string;
  versionNumber: number | string;
  badgeText?: string;
  badgeVariant?: "outline" | "default" | "success" | "secondary";
  dotColor?: string;
  fileUrl?: string;
  annotations?: ComparisonAnnotation[];
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (annotation: ComparisonAnnotation) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  onTotalPagesLoaded?: (count: number) => void;
}

export function ComparisonDocumentPane({
  paneId,
  title,
  versionNumber,
  badgeText,
  badgeVariant = "outline",
  dotColor = "bg-primary",
  fileUrl,
  annotations = [],
  activeAnnotationId,
  onSelectAnnotation,
  containerRef: externalContainerRef,
  onScroll,
  scale = 0.85,
  onScaleChange,
  onTotalPagesLoaded,
}: ComparisonDocumentPaneProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"interactive" | "native">("interactive");
  const localContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = externalContainerRef || localContainerRef;

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      onTotalPagesLoaded?.(numPages);
    },
    [onTotalPagesLoaded]
  );

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
      {/* Pane Header Toolbar */}
      <div className="px-3 py-1.5 border-b border-border bg-muted/40 flex items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-border", dotColor)} />
          <span className="font-bold text-foreground truncate text-xs">
            {title}
          </span>
          {badgeText && (
            <Badge variant={badgeVariant as any} className="text-[9px] font-bold shrink-0">
              {badgeText}
            </Badge>
          )}
          {annotations.length > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-bold shrink-0 gap-1",
                paneId === "base"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              )}
            >
              <Highlighter className="h-2.5 w-2.5" />
              {annotations.length} {annotations.length === 1 ? "line mark" : "line marks"}
            </Badge>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom controls (interactive mode only) */}
          {viewMode === "interactive" && (
            <div className="flex items-center bg-background/80 rounded-md p-0.5 border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-xs cursor-pointer"
                onClick={() => onScaleChange?.(Math.max(0.55, Number((scale - 0.1).toFixed(2))))}
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-bold px-1.5 text-muted-foreground w-10 text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-xs cursor-pointer"
                onClick={() => onScaleChange?.(Math.min(1.6, Number((scale + 0.1).toFixed(2))))}
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Toggle Interactive vs Native */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode((prev) => (prev === "interactive" ? "native" : "interactive"))}
            className="h-6 text-[10px] font-semibold gap-1 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
            title={viewMode === "interactive" ? "Switch to browser's native PDF player" : "Switch to interactive line-highlight view"}
          >
            {viewMode === "interactive" ? (
              <>
                <Layers className="h-3 w-3 text-amber-500" />
                <span className="hidden sm:inline">Highlights On</span>
              </>
            ) : (
              <>
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="hidden sm:inline">Native PDF</span>
              </>
            )}
          </Button>

          {/* New Tab Button */}
          {fileUrl && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 cursor-pointer" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Open manuscript in separate browser tab">
                <ExternalLink className="h-3 w-3" />
                <span className="hidden md:inline">Tab</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Pane Body */}
      <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950/40 relative overflow-hidden select-text">
        {!fileUrl ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Document preview not available.
          </div>
        ) : viewMode === "native" ? (
          /* Native browser iframe fallback */
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={title}
          />
        ) : (
          /* Interactive High-Fidelity PDF with In-Document Visual Line Highlights */
          <div
            ref={scrollContainerRef}
            onScroll={onScroll}
            className="w-full h-full overflow-y-auto p-3 flex flex-col items-center relative"
          >
            <Document
              file={fileUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-[11px] font-semibold">Rendering manuscript pages with text layer...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground text-center px-4">
                  <AlertCircle className="h-6 w-6 text-rose-500" />
                  <p className="text-xs font-bold text-foreground">Could not render PDF canvas</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] mt-1"
                    onClick={() => setViewMode("native")}
                  >
                    Switch to Native View
                  </Button>
                </div>
              }
              className="flex flex-col items-center gap-6"
            >
              {Array.from(new Array(numPages || 0), (_, index) => {
                const pageNum = index + 1;
                const pageAnnotations = annotations.filter((a) => a.page_number === pageNum);

                return (
                  <div
                    key={`pane_${paneId}_page_${pageNum}`}
                    data-pane-id={paneId}
                    data-page-number={pageNum}
                    className="relative bg-white shadow-lg rounded-md border border-slate-200 dark:border-slate-800 transition-shadow select-text"
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      loading=""
                      className="rounded-md overflow-hidden"
                    />

                    {/* ── Visual Highlight Overlays directly on Document Text ── */}
                    {pageAnnotations
                      .filter((ann) => ann.coordinates && !ann.coordinates.isDrawing)
                      .map((ann) => {
                        const isCurrent = activeAnnotationId === ann.id;
                        const isVerified = ["verified", "resolved", "closed"].includes(ann.status);
                        const coords = ann.coordinates!;
                        const globalIndex = annotations.findIndex((a) => a.id === ann.id);

                        return (
                          <div
                            key={ann.id}
                            id={`highlight-${paneId}-${ann.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAnnotation?.(ann);
                            }}
                            style={{
                              left: `${coords.left}%`,
                              top: `${coords.top}%`,
                              width: `${coords.width}%`,
                              height: `${coords.height}%`,
                            }}
                            title={`Revision #${globalIndex + 1} (Page ${pageNum}): ${ann.content}`}
                            className={cn(
                              "absolute rounded-xs cursor-pointer transition-all pointer-events-auto",
                              isCurrent
                                ? "bg-amber-400/80 ring-4 ring-amber-500 border border-amber-600 shadow-xl z-30 animate-pulse scale-[1.01]"
                                : isVerified
                                ? "bg-emerald-300/40 border-b-2 border-emerald-500 hover:bg-emerald-400/60 z-10"
                                : "bg-amber-300/50 border-b-2 border-amber-500 hover:bg-amber-400/75 z-10 shadow-[0_0_6px_rgba(245,158,11,0.25)]"
                            )}
                          >
                            {/* Margin Pin Badge (#1, #2...) */}
                            <div
                              className={cn(
                                "absolute -right-7 -top-1 transform flex items-center justify-center h-5 px-1.5 rounded-full text-[9px] font-black shadow-md cursor-pointer transition-transform hover:scale-110 select-none",
                                isCurrent
                                  ? "bg-amber-500 text-white ring-2 ring-amber-300 scale-115 shadow-lg"
                                  : isVerified
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "bg-amber-600 text-white hover:bg-amber-500"
                              )}
                              title={`Revision #${globalIndex + 1}: ${ann.content}`}
                            >
                              #{globalIndex + 1}
                            </div>
                          </div>
                        );
                      })}

                    {/* ── Freehand Vector SVG Drawings Layer ──────────────── */}
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none z-20"
                    >
                      {pageAnnotations
                        .filter((ann) => ann.coordinates?.isDrawing && ann.coordinates.svgPath)
                        .map((ann) => {
                          const coords = ann.coordinates!;
                          const isCurrent = activeAnnotationId === ann.id;
                          const isVerified = ["verified", "resolved", "closed"].includes(ann.status);
                          const strokeColor = isVerified ? "#10b981" : coords.strokeColor || "#ef4444";

                          return (
                            <g key={`svg_draw_${ann.id}`} className="pointer-events-auto">
                              {isCurrent && (
                                <path
                                  d={coords.svgPath}
                                  stroke="#f59e0b"
                                  strokeWidth={(coords.strokeWidth || 3) + 3}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="opacity-80 animate-pulse"
                                />
                              )}
                              <path
                                d={coords.svgPath}
                                stroke={strokeColor}
                                strokeWidth={coords.strokeWidth || 3}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={cn(
                                  "cursor-pointer transition-all hover:stroke-[4.5px]",
                                  isCurrent && "filter drop-shadow-md"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAnnotation?.(ann);
                                }}
                              >
                                <title>{`${ann.content} (by ${ann.profiles?.first_name || "Faculty"})`}</title>
                              </path>
                            </g>
                          );
                        })}
                    </svg>

                    {/* Page Number Label in Footer */}
                    <div className="absolute -bottom-5 right-2 text-[10px] font-bold text-muted-foreground select-none">
                      Page {pageNum} of {numPages}
                    </div>
                  </div>
                );
              })}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
