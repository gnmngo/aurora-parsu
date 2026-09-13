"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  FileCheck,
  Lock,
  QrCode,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileJson,
} from "lucide-react";
import { AuroraLogo } from "@/components/ui/aurora-logo";
import { lookupCertificateByHashOrSerialAction, VerificationLookupResult } from "@/lib/certificates/verification-actions";

export default function VerifyPortalPage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"serial" | "upload">("serial");
  const [serialInput, setSerialInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Upload verification state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadMatch, setUploadMatch] = useState<VerificationLookupResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = serialInput.trim().toUpperCase();

    if (!clean) {
      setError("Please enter a certificate serial number.");
      return;
    }

    // Automatically prepend AURORA- if user entered only the year & serial (e.g. 2026-000052)
    if (!clean.startsWith("AURORA-")) {
      if (/^\d{4}-\d+$/.test(clean)) {
        clean = `AURORA-${clean}`;
      } else {
        setError("Serial number format should be AURORA-YYYY-XXXXXX (e.g. AURORA-2026-000063)");
        return;
      }
    }

    setError(null);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  // Process uploaded certificate file (JSON receipt, PDF certificate, or Image)
  const processUploadedFile = async (file: File) => {
    setUploadedFile(file);
    setUploading(true);
    setUploadError(null);
    setUploadMatch(null);

    try {
      // 1. If JSON receipt
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        const text = await file.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("The uploaded file is not a valid JSON document.");
        }

        const serial = json.certificate_serial || json.certificateSerial || json.serial;
        const hash = json.signature_hash_sha256 || json.signature_hash || json.payload_hash || json.hash;

        if (!serial && !hash) {
          throw new Error("This JSON file does not contain an AURORA certificate serial number or integrity hash.");
        }

        const res = await lookupCertificateByHashOrSerialAction({ serial, hash });
        if (res.found) {
          setUploadMatch(res);
          return;
        } else {
          throw new Error("No authentic institutional defense certificate matches the metadata in this file.");
        }
      }

      // 2. If PDF document
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Read buffer to compute SHA-256 and search for embedded text string
        const arrayBuffer = await file.arrayBuffer();
        
        // Compute SHA-256 of file
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // Check if raw binary contains the ASCII string AURORA-YYYY-XXXXXX
        const textDecoder = new TextDecoder("latin1");
        const rawString = textDecoder.decode(arrayBuffer);
        const serialMatch = rawString.match(/AURORA-\d{4}-\d+/i);
        const detectedSerial = serialMatch ? serialMatch[0].toUpperCase() : undefined;

        const res = await lookupCertificateByHashOrSerialAction({
          serial: detectedSerial,
          hash: fileHashHex,
        });

        if (res.found) {
          setUploadMatch(res);
          return;
        } else {
          throw new Error(
            detectedSerial
              ? `Extracted serial ${detectedSerial}, but no matching active certificate was found in the university registry.`
              : "Could not detect an authentic AURORA certificate serial or cryptographic signature hash in this PDF."
          );
        }
      }

      // 3. Image file (.png, .jpg, .jpeg, etc.)
      if (file.type.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const res = await lookupCertificateByHashOrSerialAction({
          hash: fileHashHex,
        });

        if (res.found) {
          setUploadMatch(res);
          return;
        } else {
          throw new Error("No defense certificate in the university registry matches this signature or image file.");
        }
      }

      throw new Error("Unsupported file format. Please upload an official Certificate PDF (.pdf), Verification Receipt (.json), or Image (.png, .jpg).");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to verify uploaded certificate file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Brand Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <AuroraLogo size="md" showText={true} textColor="text-white" subtext="Partido State University" />
        </Link>

        <Link
          href="/login"
          className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
        >
          Faculty / Student Login
        </Link>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8 sm:py-12">
        {/* Title & Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase">
              Institutional Document Verification Portal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Verify Defense Certificates
          </h1>
          <p className="text-sm sm:text-base text-white/60 mt-2 max-w-xl mx-auto leading-relaxed">
            Verify the authenticity of undergraduate thesis, capstone, and graduate defense certificates issued by Partido State University.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setActiveMode("serial");
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "serial"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search Serial Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode("upload");
                setUploadError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "upload"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload File for Verification</span>
            </button>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl">
          {activeMode === "serial" ? (
            /* Mode 1: Search by Serial */
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="serial-input"
                  className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2"
                >
                  Certificate Serial Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    id="serial-input"
                    type="text"
                    placeholder="e.g. AURORA-2026-000063"
                    value={serialInput}
                    onChange={(e) => {
                      setSerialInput(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-white/15 rounded-xl text-white placeholder-white/30 font-mono text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] text-white/40 uppercase font-semibold">Try sample:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSerialInput("AURORA-2026-000063");
                      setError(null);
                    }}
                    className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    AURORA-2026-000063
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer text-sm"
              >
                <span>Verify Authenticity</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            /* Mode 2: Upload File Verification */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                  isDragOver
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/20 bg-slate-900/50 hover:border-white/40 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-400 mb-3">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-white">
                  {uploading ? "Analyzing Certificate Authenticity..." : "Upload Certificate for Verification"}
                </h3>
                <p className="text-xs text-white/50 mt-1 max-w-sm">
                  Drag and drop your official Certificate PDF, Verification Receipt (.json), or certificate scan here, or click to browse.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[10px] text-white/40">
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">.PDF Certificates</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">.JSON Receipts</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">.PNG / .JPG Scans</span>
                </div>
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Verification Failed</span>
                    <p className="mt-0.5 opacity-90">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Upload Match Success Result */}
              {uploadMatch && uploadMatch.serial && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Authentic Institutional Certificate Verified!
                    </span>
                  </div>

                  <div className="bg-slate-900/80 rounded-lg p-3 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Certificate Serial:</span>
                      <span className="font-mono font-bold text-emerald-300">{uploadMatch.serial}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Research Title:</span>
                      <span className="font-semibold text-white truncate max-w-[240px]">{uploadMatch.projectTitle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Evaluating Panelist:</span>
                      <span className="font-semibold text-white">{uploadMatch.panelistName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Score:</span>
                      <span className="font-black text-emerald-400">{Number(uploadMatch.totalScore || 0).toFixed(1)} / 100</span>
                    </div>
                  </div>

                  <Link
                    href={`/verify/${encodeURIComponent(uploadMatch.serial)}`}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all"
                  >
                    <span>Open Official Public Audit Report</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Quick Info / Security Seal */}
          <div className="mt-8 pt-6 border-t border-white/10 grid sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/80">
                <Lock className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold">SHA-256 Integrity</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Cryptographically hashed score sheets prevent post-defense modification.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/80">
                <QrCode className="h-4 w-4 text-teal-400" />
                <span className="text-xs font-bold">Instant QR Verification</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Direct lookup via scannable QR code embedded on certificates.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/80">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold">Immutable Audit Trail</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Every defense approval is permanently sealed in the institutional ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Guidance */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            Having trouble? You can also scan the QR code located at the bottom-right corner of any physical or PDF certificate.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full py-4 text-center border-t border-white/10 text-white/40 text-xs">
        <p>
          AURORA — Academic Unified Review, Observation, Rating, and Assessment System
        </p>
        <p className="mt-1 text-[11px] text-white/30">
          Partido State University • Goa, Camarines Sur, Philippines
        </p>
      </footer>
    </main>
  );
}
