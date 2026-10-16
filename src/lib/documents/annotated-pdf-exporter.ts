import { jsPDF } from "jspdf";

export interface ExportAnnotationItem {
  id: string;
  page_number: number;
  content: string;
  severity: "info" | "minor" | "major" | "critical";
  status: string;
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
  profiles?: {
    first_name?: string;
    last_name?: string;
  } | null;
  created_at?: string;
}

export interface ExportAnnotatedPdfOptions {
  manuscriptTitle: string;
  numPages: number;
  annotations: ExportAnnotationItem[];
  onProgress?: (current: number, total: number) => void;
}

/**
 * Captures rendered PDF pages and bakes all freehand pen tool markings,
 * Google Docs-style highlights, and reviewer revision remarks directly
 * onto the PDF pages using jsPDF and Canvas.
 */
export async function exportAnnotatedManuscriptPdf({
  manuscriptTitle,
  numPages,
  annotations,
  onProgress,
}: ExportAnnotatedPdfOptions): Promise<void> {
  if (typeof window === "undefined" || numPages <= 0) return;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter", // 612 x 792 pt
  });

  const pdfWidthPt = pdf.internal.pageSize.getWidth();
  const pdfHeightPt = pdf.internal.pageSize.getHeight();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);

    // Locate the rendered PDF page container in the DOM
    const pageContainer =
      document.getElementById(`pdf-page-${pageNum}`) ||
      document.querySelector(`[data-page-number="${pageNum}"]`);
    const pageCanvas = pageContainer?.querySelector("canvas");

    if (pageCanvas) {
      const cWidth = pageCanvas.width;
      const cHeight = pageCanvas.height;

      // Create offscreen canvas with identical dimensions
      const offCanvas = document.createElement("canvas");
      offCanvas.width = cWidth;
      offCanvas.height = cHeight;
      const ctx = offCanvas.getContext("2d");

      if (ctx) {
        // 1. Draw base PDF page image
        ctx.drawImage(pageCanvas, 0, 0);

        // Filter annotations belonging to this page
        const pageAnns = annotations.filter((a) => a.page_number === pageNum);

        // 2. Burn Highlight Overlays (Text comments)
        pageAnns
          .filter((a) => a.coordinates && !a.coordinates.isDrawing)
          .forEach((ann, idx) => {
            const coords = ann.coordinates!;
            const left = (coords.left / 100) * cWidth;
            const top = (coords.top / 100) * cHeight;
            const width = (coords.width / 100) * cWidth;
            const height = (coords.height / 100) * cHeight;
            const isResolved = ["verified", "resolved", "closed"].includes(ann.status);

            // Highlight fill
            ctx.fillStyle = isResolved ? "rgba(16, 185, 129, 0.35)" : "rgba(250, 204, 21, 0.45)";
            ctx.fillRect(left, top, width, height);

            // Border stroke
            ctx.strokeStyle = isResolved ? "#059669" : "#d97706";
            ctx.lineWidth = Math.max(1.5, cWidth / 600);
            ctx.strokeRect(left, top, width, height);

            // Marker callout index tag
            const tagRadius = Math.max(10, cWidth / 80);
            ctx.fillStyle = isResolved ? "#10b981" : "#f59e0b";
            ctx.beginPath();
            ctx.arc(left + width, top, tagRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(tagRadius * 1.2)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(idx + 1), left + width, top);
          });

        // 3. Burn Freehand Pen Tool Drawings (Vector strokes)
        pageAnns
          .filter((a) => a.coordinates?.isDrawing && a.coordinates.svgPath)
          .forEach((ann) => {
            const coords = ann.coordinates!;
            const isResolved = ["verified", "resolved", "closed"].includes(ann.status);
            const strokeColor = isResolved ? "#10b981" : (coords.strokeColor || "#ef4444");
            const strokeWidth = (coords.strokeWidth || 3) * (cWidth / 800);

            try {
              ctx.save();
              // Scale context from percentage coordinates (0..100) to actual canvas pixel dimensions
              ctx.scale(cWidth / 100, cHeight / 100);
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth / (cWidth / 100); // Normalize stroke width
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              if (typeof Path2D !== "undefined") {
                const pathObj = new Path2D(coords.svgPath);
                ctx.stroke(pathObj);
              }
              ctx.restore();
            } catch (pathErr) {
              console.warn("Could not render SVG path to canvas:", pathErr);
            }
          });

        // 4. Stamp watermark footer on annotated pages
        ctx.fillStyle = "rgba(100, 116, 139, 0.75)";
        ctx.font = `600 ${Math.max(12, Math.round(cWidth / 70))}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(
          `AURORA Review Copy • Page ${pageNum} of ${numPages} • Contains Verified Faculty Markings`,
          cWidth * 0.04,
          cHeight * 0.98
        );

        // Convert page with burned markings to image data
        const imgData = offCanvas.toDataURL("image/jpeg", 0.92);

        if (pageNum > 1) {
          pdf.addPage("letter", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthPt, pdfHeightPt, undefined, "FAST");
      }
    }
  }

  // 5. Append Official "Faculty Reviewer Notes & Revision Matrix" summary page
  if (annotations.length > 0) {
    pdf.addPage("letter", "portrait");

    // Header banner
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, pdfWidthPt, 70, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("AURORA DEFENSE SYSTEM — FACULTY REVISION MATRIX", 36, 32);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(203, 213, 225); // slate-300
    pdf.text(
      `Manuscript: "${manuscriptTitle || "Research Manuscript"}" • Exported on ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`,
      36,
      48
    );

    // Table Header
    let y = 95;
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(36, y - 12, pdfWidthPt - 72, 20, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85); // slate-700
    pdf.text("PAGE", 42, y);
    pdf.text("TYPE", 75, y);
    pdf.text("SEVERITY", 130, y);
    pdf.text("STATUS", 185, y);
    pdf.text("REVIEWER & COMMENT / INSTRUCTIONS", 240, y);

    y += 14;
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);

    annotations.forEach((ann, idx) => {
      if (y > pdfHeightPt - 50) {
        pdf.addPage("letter", "portrait");
        y = 40;
      }

      const isDrawing = ann.coordinates?.isDrawing;
      const typeLabel = isDrawing ? "Pen Markup" : "Highlight";
      const reviewer = ann.profiles ? `${ann.profiles.first_name || ""} ${ann.profiles.last_name || ""}`.trim() : "Reviewer";

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);

      pdf.text(`P. ${ann.page_number}`, 42, y);
      pdf.text(typeLabel, 75, y);

      // Severity tag
      const sevUpper = (ann.severity || "minor").toUpperCase();
      if (sevUpper === "CRITICAL" || sevUpper === "MAJOR") {
        pdf.setTextColor(225, 29, 72); // rose-600
      } else {
        pdf.setTextColor(100, 116, 139);
      }
      pdf.setFont("helvetica", "bold");
      pdf.text(sevUpper, 130, y);

      // Status tag
      const isResolved = ["verified", "resolved", "closed"].includes(ann.status);
      if (isResolved) {
        pdf.setTextColor(16, 185, 129); // emerald-600
        pdf.text("RESOLVED", 185, y);
      } else if (ann.status === "addressed") {
        pdf.setTextColor(14, 165, 233); // sky-600
        pdf.text("ADDRESSED", 185, y);
      } else {
        pdf.setTextColor(217, 119, 6); // amber-600
        pdf.text("OPEN", 185, y);
      }

      // Reviewer & Comment
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${reviewer}:`, 240, y);

      pdf.setFont("helvetica", "normal");
      const commentLines = pdf.splitTextToSize(ann.content || "No comment content", pdfWidthPt - 240 - 45);
      pdf.text(commentLines, 240, y + 10);

      const blockHeight = Math.max(22, commentLines.length * 10 + 12);
      y += blockHeight;
      pdf.line(36, y - 4, pdfWidthPt - 36, y - 4);
    });
  }

  // Sanitize filename
  const safeName = (manuscriptTitle || "Manuscript")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  pdf.save(`${safeName}_annotated_with_markings.pdf`);
}
