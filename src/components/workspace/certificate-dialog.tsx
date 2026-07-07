"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Printer, CheckCircle, Award } from "lucide-react";

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

  if (!evaluation) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>AURORA Defense Verification Certificate - ${evaluation.certificate_serial || "Cert"}</title>
            <style>
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                padding: 40px;
                color: #0f172a;
                background: #fff;
              }
              .border-frame {
                border: 8px double #1e3a8a;
                padding: 40px;
                border-radius: 4px;
                position: relative;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .title {
                font-size: 26px;
                font-weight: 800;
                color: #1e3a8a;
                letter-spacing: 1px;
                margin-top: 10px;
              }
              .subtitle {
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .content {
                text-align: center;
                margin: 40px 0;
                line-height: 1.8;
              }
              .target-title {
                font-size: 18px;
                font-weight: 700;
                color: #0f172a;
                margin: 15px 0;
              }
              .panelist {
                font-size: 18px;
                font-weight: 700;
                color: #1e3a8a;
                text-decoration: underline;
              }
              .details-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 15px;
                max-width: 500px;
                margin: 30px auto;
                text-align: left;
                font-size: 12px;
                border-top: 1px solid #e2e8f0;
                border-bottom: 1px solid #e2e8f0;
                padding: 15px 0;
              }
              .details-grid dt {
                color: #64748b;
                font-weight: 600;
              }
              .details-grid dd {
                font-weight: 700;
                margin: 0;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 40px;
              }
              .qr-box {
                text-align: center;
                font-size: 9px;
                color: #64748b;
              }
              .hash-box {
                font-family: monospace;
                font-size: 9px;
                color: #64748b;
                word-break: break-all;
                max-width: 350px;
                text-align: left;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <Award className="h-5 w-5 text-primary" />
            Digital Verification Certificate
          </DialogTitle>
        </DialogHeader>

        {/* Certificate Display Area */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner">
          <div
            ref={printAreaRef}
            className="bg-white border-4 border-double border-primary/40 p-6 sm:p-8 rounded-lg shadow-md relative"
          >
            {/* Background Watermark decoration */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
              <Award className="h-[300px] w-[300px]" />
            </div>

            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                Partido State University
              </p>
              <h2 className="text-xl font-black text-primary tracking-wide">
                DEFENSE VERIFICATION CERTIFICATE
              </h2>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                AURORA Paperless Defense Verification System
              </p>
            </div>

            <div className="my-8 text-center text-xs space-y-4 leading-relaxed text-slate-700">
              <p className="text-[11px] font-medium text-slate-500">
                This document certifies that the academic manuscript titled
              </p>
              <h4 className="text-sm font-extrabold text-slate-900 px-4 max-w-lg mx-auto leading-snug">
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
              <h5 className="text-sm font-extrabold text-primary underline">
                {panelistName}
              </h5>
            </div>

            {/* Certificate Details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-slate-100 py-4 my-6 text-[11px] max-w-md mx-auto">
              <div className="text-slate-500 font-semibold">Certificate Number:</div>
              <div className="font-bold font-mono text-slate-950">{evaluation.certificate_serial}</div>

              <div className="text-slate-500 font-semibold">Status:</div>
              <div className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> VERIFIED AUTHENTIC
              </div>

              <div className="text-slate-500 font-semibold">Defense Score:</div>
              <div className="font-black text-primary">{Number(evaluation.total_score).toFixed(1)} / 100</div>

              <div className="text-slate-500 font-semibold">Signing Date:</div>
              <div className="font-bold text-slate-900">{formattedDate}</div>

              <div className="text-slate-500 font-semibold">Evaluation ID:</div>
              <div className="font-mono text-[9px] text-slate-600 truncate">{evaluation.id}</div>
            </div>

            {/* Certificate Footer */}
            <div className="flex justify-between items-end pt-4 mt-6">
              {/* SHA-256 Hash box */}
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Integrity Signature Hash</p>
                <p className="font-mono text-[8px] text-slate-500 max-w-[280px] break-all leading-normal select-all bg-slate-50 p-1.5 rounded border border-slate-100 font-semibold">
                  {evaluation.signature_hash}
                </p>
              </div>

              {/* QR Code box */}
              <div className="flex flex-col items-center space-y-1">
                {/* SVG simulated QR Code */}
                <svg className="h-14 w-14 border border-slate-100 p-1 bg-white rounded" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  {/* Outer boundaries */}
                  <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  {/* Random pixels for simulation */}
                  <rect x="35" y="5" width="10" height="10" fill="#0f172a" />
                  <rect x="45" y="15" width="10" height="5" fill="#0f172a" />
                  <rect x="55" y="5" width="5" height="20" fill="#0f172a" />
                  <rect x="35" y="35" width="30" height="30" fill="#0f172a" />
                  <rect x="40" y="40" width="20" height="20" fill="white" />
                  <rect x="45" y="45" width="10" height="10" fill="#0f172a" />
                  <rect x="5" y="45" width="15" height="15" fill="#0f172a" />
                  <rect x="70" y="45" width="15" height="20" fill="#0f172a" />
                  <rect x="45" y="80" width="25" height="10" fill="#0f172a" />
                  <rect x="80" y="80" width="15" height="15" fill="#0f172a" />
                </svg>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">AURORA QR VERIFY</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-xl">
            Close
          </Button>
          <Button onClick={handlePrint} className="h-9 text-xs rounded-xl shadow-lg shadow-primary/10 gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
