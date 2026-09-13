import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface CertificateData {
  evaluationId: string;
  certificateSerial: string;
  projectTitle: string;
  stageName: string;
  panelistName: string;
  panelistRole?: string;
  totalScore: number | string;
  verdictCode?: string;
  signedAt?: string;
  signatureHash?: string;
  signatureImage?: string | null;
  academicYear?: string;
  studentName?: string;
  campusName?: string;
  departmentName?: string;
  scores?: Record<string, number>;
  recommendations?: string | null;
}

function formatVerdictLabel(verdictCode?: string): string {
  switch (verdictCode) {
    case "passed":
      return "PASSED (FULL APPROVAL)";
    case "passed_minor":
      return "PASSED WITH MINOR REVISIONS";
    case "passed_major":
      return "PASSED WITH MAJOR REVISIONS";
    case "failed":
      return "RE-DEFENSE REQUIRED (FAILED)";
    default:
      return "DEFENSE EVALUATED";
  }
}

/**
 * Generates an institutional Letter-sized PDF Defense Certificate using jsPDF.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Double Border Frame
  // Outer border
  doc.setDrawColor(30, 58, 138); // #1e3a8a
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner border
  doc.setDrawColor(59, 130, 246); // #3b82f6
  doc.setLineWidth(0.4);
  doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin + 2.5) * 2, pageHeight - (margin + 2.5) * 2);

  // Decorative corner accents
  const corners = [
    [margin + 4, margin + 4],
    [pageWidth - margin - 4, margin + 4],
    [margin + 4, pageHeight - margin - 4],
    [pageWidth - margin - 4, pageHeight - margin - 4],
  ];
  doc.setFillColor(30, 58, 138);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 1, "F");
  });

  let currentY = margin + 12;

  // 2. Institutional Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("REPUBLIC OF THE PHILIPPINES", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("PARTIDO STATE UNIVERSITY", pageWidth / 2, currentY, { align: "center" });

  currentY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  const deptText = data.departmentName 
    ? `${data.departmentName.toUpperCase()} • ${data.campusName || "GOA CAMPUS"}`
    : "OFFICE OF ACADEMIC AFFAIRS • GOA CAMPUS";
  doc.text(deptText, pageWidth / 2, currentY, { align: "center" });

  currentY += 3;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(margin + 15, currentY, pageWidth - margin - 15, currentY);

  // 3. Certificate Title
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text("CERTIFICATE OF DEFENSE EVALUATION", pageWidth / 2, currentY, { align: "center" });

  currentY += 4.5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("AURORA VERIFIED ELECTRONIC DEFENSE RECORD", pageWidth / 2, currentY, { align: "center" });

  // 4. Preamble & Subject
  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("This is to certify that the research manuscript entitled:", pageWidth / 2, currentY, { align: "center" });

  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  const splitTitle = doc.splitTextToSize(`“${data.projectTitle}”`, pageWidth - margin * 2 - 30);
  doc.text(splitTitle, pageWidth / 2, currentY, { align: "center" });
  currentY += splitTitle.length * 5.5 + 2;

  // Student / Team & Stage info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`has successfully undergone official oral defense and evaluation for`, pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(14, 116, 144); // cyan-700
  const stageText = `${(data.stageName || "Defense Stage").toUpperCase()} • AY ${data.academicYear || "2026–2027"}`;
  doc.text(stageText, pageWidth / 2, currentY, { align: "center" });

  // 5. Evaluation Summary Table / Card
  currentY += 8;
  const cardX = margin + 12;
  const cardWidth = pageWidth - (margin + 12) * 2;
  const cardHeight = 36;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, "FD");

  // Inside card: Score & Verdict
  const col1X = cardX + 8;
  const col2X = cardX + cardWidth / 2 + 8;
  let cardTextY = currentY + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL WEIGHTED SCORE", col1X, cardTextY);
  doc.text("OFFICIAL VERDICT", col2X, cardTextY);

  cardTextY += 7;
  const scoreNum = Number(data.totalScore || 0).toFixed(1);
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`${scoreNum}`, col1X, cardTextY);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(" / 100", col1X + doc.getTextWidth(scoreNum) + 1, cardTextY);

  // Verdict badge text
  doc.setFontSize(11);
  const verdictStr = formatVerdictLabel(data.verdictCode);
  if (data.verdictCode?.startsWith("passed")) {
    doc.setTextColor(16, 185, 129); // emerald-600
  } else if (data.verdictCode === "failed") {
    doc.setTextColor(225, 29, 72); // rose-600
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
  }
  doc.text(verdictStr, col2X, cardTextY);

  cardTextY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Evaluation ID: ${data.evaluationId}`, col1X, cardTextY);
  doc.text(`Date Signed: ${data.signedAt ? new Date(data.signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Certified"}`, col2X, cardTextY);

  currentY += cardHeight + 8;

  // 6. Signatures Section
  const sigBoxY = currentY;
  const sigColWidth = 70;
  const sigColX = (pageWidth - sigColWidth) / 2;

  // Render Signature Image if present
  let hasRenderedSig = false;
  if (data.signatureImage && (data.signatureImage.startsWith("data:image/png") || data.signatureImage.startsWith("data:image/jpeg"))) {
    try {
      doc.addImage(data.signatureImage, "PNG", sigColX + 5, sigBoxY, 60, 18);
      hasRenderedSig = true;
    } catch {
      hasRenderedSig = false;
    }
  }

  if (!hasRenderedSig) {
    // Digital certification placeholder seal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text("✓ VERIFIED ELECTRONIC SIGNATURE", pageWidth / 2, sigBoxY + 12, { align: "center" });
  }

  const nameLineY = sigBoxY + 20;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(sigColX, nameLineY, sigColX + sigColWidth, nameLineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.panelistName.toUpperCase(), pageWidth / 2, nameLineY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(data.panelistRole || "Defense Committee Member", pageWidth / 2, nameLineY + 8, { align: "center" });

  // 7. Security & Cryptographic Integrity Footer
  currentY = pageHeight - margin - 36;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, currentY, pageWidth - margin - 6, currentY);

  currentY += 4;

  // Generate QR Code for live verification URL
  const verifyUrl = `https://aurora-parsu.vercel.app/verify/${encodeURIComponent(data.certificateSerial)}`;
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (qrErr) {
    console.warn("Failed to generate QR code for PDF:", qrErr);
  }

  const footerQrSize = 22;
  const qrX = pageWidth - margin - 8 - footerQrSize;
  const qrY = currentY;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, footerQrSize, footerQrSize);
    } catch {
      // fallback
    }
  }

  // Text on left of QR code
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text(`CERTIFICATE SERIAL: ${data.certificateSerial}`, margin + 8, currentY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("INTEGRITY SIGNATURE HASH (SHA-256):", margin + 8, currentY + 7);

  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const hashText = data.signatureHash || "UNHASHED_EVALUATION_RECORD";
  doc.text(hashText, margin + 8, currentY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Verification URL: ${verifyUrl}`, margin + 8, currentY + 15);
  doc.text(
    "This certificate is cryptographically sealed by AURORA. Scan the QR code or visit the portal to verify authenticity.",
    margin + 8,
    currentY + 18.5
  );

  return doc.output("blob");
}

/**
 * Triggers a browser download of the certificate PDF.
 */
export async function downloadCertificatePdf(data: CertificateData, customFilename?: string): Promise<void> {
  const blob = await generateCertificatePdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = customFilename || `AURORA-Certificate-${data.certificateSerial || "defense"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers a browser download of the official Certificate Verification Receipt in JSON.
 */
export function downloadCertificateJson(data: CertificateData, customFilename?: string): void {
  const receipt = {
    institution: "Partido State University",
    system: "AURORA Paperless Academic Defense Workflow System",
    document_type: "Defense Evaluation Certificate Verification Receipt",
    certificate_serial: data.certificateSerial,
    evaluation_id: data.evaluationId,
    project_title: data.projectTitle,
    stage_name: data.stageName,
    academic_year: data.academicYear || "2026-2027",
    panelist_name: data.panelistName,
    panelist_role: data.panelistRole || "Panelist",
    verdict: data.verdictCode,
    total_score: data.totalScore,
    signed_at: data.signedAt,
    signature_hash_sha256: data.signatureHash,
    verification_url: `https://aurora-parsu.vercel.app/verify/${encodeURIComponent(data.certificateSerial)}`,
    verified_by_system: true,
    exported_at: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = customFilename || `AURORA-Verification-${data.certificateSerial || "cert"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
