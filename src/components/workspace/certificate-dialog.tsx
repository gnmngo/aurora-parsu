"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Printer, CheckCircle, Award, ExternalLink } from "lucide-react";
import { VerificationQRCode } from "@/components/workspace/verification-qr-code";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: any;
  projectTitle: string;
  stageName: string;
  panelistName: string;
}

export function CertificateDialog({
  open,
  onOpenChange,
  evaluation,
  projectTitle,
  stageName,
  panelistName,
}: CertificateDialogProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function resolveSignature() {
      if (!evaluation?.signature_image) {
        setSignatureUrl(null);
        return;
      }

      const sigImg = evaluation.signature_image as string;
      if (sigImg.startsWith("data:image") || sigImg.startsWith("http")) {
        setSignatureUrl(sigImg);
        return;
      }

      const cleanPath = sigImg.replace(/^signatures\//, "").replace(/^\/+/, "");
      try {
        const { data, error } = await supabase.storage
          .from("signatures")
          .createSignedUrl(cleanPath, 7200);

        if (!error && data?.signedUrl) {
          setSignatureUrl(data.signedUrl);
          return;
        }
      } catch {}

      try {
        const { data: pubData } = supabase.storage.from("signatures").getPublicUrl(cleanPath);
        if (pubData?.publicUrl) {
          setSignatureUrl(pubData.publicUrl);
          return;
        }
      } catch {}

      setSignatureUrl(null);
    }

    if (open && evaluation) {
      resolveSignature();
    }
  }, [open, evaluation, supabase]);

  if (!evaluation) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>AURORA Defense Verification Certificate - ${evaluation.certificate_serial || "Cert"}</title>
            <style>
              @page {
                size: letter portrait;
                margin: 20mm;
              }
              body {
                font-family: 'Times New Roman', Times, serif, system-ui;
                padding: 0;
                margin: 0;
                color: #0f172a;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .border-frame {
                border: 6px double #1e3a8a;
                padding: 30px;
                border-radius: 4px;
                position: relative;
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 25px;
              }
              .inst-name {
                font-size: 11px;
                color: #475569;
                font-family: system-ui, sans-serif;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 4px;
              }
              .title {
                font-size: 22px;
                font-weight: 900;
                color: #1e3a8a;
                letter-spacing: 1px;
                font-family: system-ui, sans-serif;
                margin: 4px 0;
              }
              .subtitle {
                font-size: 10px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                font-family: system-ui, sans-serif;
              }
              .content {
                text-align: center;
                margin: 30px 0;
                line-height: 1.6;
              }
              .target-title {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                margin: 12px auto;
                max-width: 90%;
              }
              .stage-name {
                font-size: 13px;
                font-weight: 700;
                color: #1e3a8a;
                text-transform: uppercase;
              }
              .signature-container {
                margin: 20px auto 5px auto;
                text-align: center;
              }
              .signature-img {
                height: 50px;
                max-width: 180px;
                object-contain: fit;
                margin: 0 auto;
                display: block;
              }
              .panelist {
                font-size: 15px;
                font-weight: 800;
                color: #0f172a;
                text-decoration: underline;
                margin: 4px 0 2px 0;
              }
              .panelist-role {
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                font-family: system-ui, sans-serif;
              }
              .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px 15px;
                max-width: 440px;
                margin: 25px auto;
                text-align: left;
                font-size: 11px;
                font-family: system-ui, sans-serif;
                border-top: 1px solid #e2e8f0;
                border-bottom: 1px solid #e2e8f0;
                padding: 12px 0;
              }
              .details-grid dt {
                color: #64748b;
                font-weight: 600;
              }
              .details-grid dd {
                font-weight: 700;
                margin: 0;
                color: #0f172a;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 25px;
                padding-top: 15px;
                border-top: 1px solid #f1f5f9;
              }
              .hash-box {
                font-family: monospace;
                font-size: 8px;
                color: #64748b;
                word-break: break-all;
                max-width: 320px;
                text-align: left;
              }
              .qr-box {
                text-align: center;
                font-size: 8px;
                color: #64748b;
                font-family: system-ui, sans-serif;
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const formattedDate = evaluation.signed_at
    ? new Date(evaluation.signed_at).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "N/A";

  const publicVerifyUrl = evaluation.certificate_serial
    ? `/verify/${encodeURIComponent(evaluation.certificate_serial)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] overflow-y-auto max-h-[90vh]">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <Award className="h-5 w-5 text-primary" />
            Digital Defense Verification Certificate
          </DialogTitle>
        </DialogHeader>

        {/* Certificate Display Area */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-inner">
          <div
            ref={printAreaRef}
            className="bg-white border-4 border-double border-primary/40 p-6 sm:p-8 rounded-lg shadow-md relative"
          >
            {/* Watermark decoration */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
              <Award className="h-[280px] w-[280px]" />
            </div>

            {/* Institutional Header */}
            <div className="text-center space-y-1.5">
              <div className="flex justify-center mb-1">
                <ShieldCheck className="h-9 w-9 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                Partido State University
              </p>
              <h2 className="text-lg sm:text-xl font-black text-primary tracking-wide">
                DEFENSE VERIFICATION CERTIFICATE
              </h2>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                AURORA Paperless Defense Verification System
              </p>
            </div>

            {/* Certification Body */}
            <div className="my-6 text-center text-xs space-y-3 leading-relaxed text-slate-700">
              <p className="text-[11px] font-medium text-slate-500">
                This document certifies that the academic research manuscript titled
              </p>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 px-4 max-w-lg mx-auto leading-snug">
                "{projectTitle}"
              </h4>
              <p className="text-[11px] font-medium text-slate-500">
                has been officially evaluated and signed electronically for the defense stage
              </p>
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {stageName}
              </h5>
              <p className="text-[11px] font-medium text-slate-500">
                by the assigned panel evaluator
              </p>

              {/* Panelist Electronic Signature & Title */}
              <div className="pt-2 pb-1">
                {signatureUrl ? (
                  <div className="flex justify-center mb-1 h-12">
                    <img
                      src={signatureUrl}
                      alt={`Signature of ${panelistName}`}
                      className="max-h-full max-w-[180px] object-contain pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="h-6" />
                )}
                <h5 className="text-sm font-extrabold text-primary underline">
                  {panelistName}
                </h5>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  {evaluation.position_role || "Defense Panel Member"}
                </p>
              </div>
            </div>

            {/* Certificate Meta Details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-slate-100 py-3 my-4 text-[11px] max-w-md mx-auto">
              <div className="text-slate-500 font-semibold">Certificate Number:</div>
              <div className="font-bold font-mono text-slate-950">{evaluation.certificate_serial}</div>

              <div className="text-slate-500 font-semibold">Status:</div>
              <div className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> VERIFIED AUTHENTIC
              </div>

              <div className="text-slate-500 font-semibold">Defense Score:</div>
              <div className="font-black text-primary">
                {Number(evaluation.total_score || evaluation.weighted_score || 0).toFixed(1)} / 100
              </div>

              <div className="text-slate-500 font-semibold">Signing Date:</div>
              <div className="font-bold text-slate-900">{formattedDate}</div>

              <div className="text-slate-500 font-semibold">Evaluation ID:</div>
              <div className="font-mono text-[9px] text-slate-600 truncate">{evaluation.id}</div>
            </div>

            {/* Certificate Footer */}
            <div className="flex justify-between items-end pt-3 mt-4 border-t border-slate-50">
              {/* SHA-256 Hash box */}
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Integrity Signature Hash (SHA-256)</p>
                <p className="font-mono text-[8px] text-slate-500 max-w-[260px] sm:max-w-[300px] break-all leading-normal select-all bg-slate-50 p-1.5 rounded border border-slate-100 font-semibold">
                  {evaluation.signature_hash}
                </p>
              </div>

              {/* QR Code box */}
              <div className="flex flex-col items-center space-y-1">
                {evaluation.certificate_serial ? (
                  <VerificationQRCode
                    certificateSerial={evaluation.certificate_serial}
                    size={56}
                  />
                ) : (
                  <div className="h-14 w-14 border border-slate-100 rounded bg-slate-50" />
                )}
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">AURORA QR VERIFY</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden flex flex-col sm:flex-row justify-between items-center gap-2">
          {publicVerifyUrl ? (
            <Link
              href={publicVerifyUrl}
              target="_blank"
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Public Verification Link
            </Link>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-xl">
              Close
            </Button>
            <Button onClick={handlePrint} className="h-9 text-xs rounded-xl shadow-lg shadow-primary/10 gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print Certificate
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
