"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  FileCheck,
  Lock,
  QrCode,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { lookupCertificateByHashOrSerialAction, VerificationLookupResult } from "@/lib/certificates/verification-actions";

export default function VerifyPortalPage() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
        const arrayBuffer = await file.arrayBuffer();
        
        // Compute SHA-256 of file
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // Attempt text decoding to extract AURORA serial
        let extractedSerial: string | null = null;
        try {
          const rawText = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer));
          const serialMatch = rawText.match(/AURORA-\d{4}-\d+/i);
          if (serialMatch) {
            extractedSerial = serialMatch[0].toUpperCase();
          }
        } catch {
          // ignore extraction error
        }

        const res = await lookupCertificateByHashOrSerialAction({
          serial: extractedSerial || undefined,
          hash: sha256Hex,
        });

        if (res.found) {
          setUploadMatch(res);
          return;
        } else {
          throw new Error("Could not verify authenticity. The PDF does not match an institutional certificate registered in AURORA.");
        }
      }

      // 3. Fallback for image scans
      if (file.type.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const res = await lookupCertificateByHashOrSerialAction({ hash: sha256Hex });
        if (res.found) {
          setUploadMatch(res);
          return;
        } else {
          throw new Error("No certificate matches the image signature hash. For physical scans, please enter the printed serial number directly.");
        }
      }

      throw new Error("Unsupported file format. Please upload a .pdf, .json, or image certificate.");
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
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-[#050505] dark:text-[#F5F5F5] flex flex-col justify-between font-sans antialiased transition-colors duration-200">
      {/* Top Brand Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-zinc-200 dark:border-[#222226] transition-colors">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Geometric A Symbol + Wordmark */}
          <Link href="/" className="flex items-center gap-3 group select-none">
            <div className="relative h-8 w-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/aurora-symbol-transparent.png"
                alt="AURORA Symbol"
                width={30}
                height={30}
                priority
                className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-[0.25em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
                  AURORA
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  Paperless
                </span>
              </div>
              <span className="text-[9px] font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
                Partido State University
              </span>
            </div>
          </Link>

          {/* Right: Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Home
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#27272a] hover:bg-zinc-100 dark:hover:bg-[#18181c] text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Faculty / Student Login
            </Link>

            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="p-2 rounded-xl border border-zinc-200 dark:border-[#27272a] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#18181c] transition-colors cursor-pointer"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto w-full my-auto px-4 py-10 sm:py-14">
        {/* Title & Institutional Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3.5 py-1 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tracking-wider uppercase">
              Institutional Document Verification Portal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Verify Defense Certificates
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2 max-w-xl mx-auto leading-relaxed">
            Verify the authenticity, panel signatures, and cryptographic integrity of thesis, capstone, and oral defense clearance certificates issued by AURORA at Partido State University.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#111115] border border-zinc-200 dark:border-[#222226]">
            <button
              type="button"
              onClick={() => {
                setActiveMode("serial");
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === "serial"
                  ? "bg-white dark:bg-[#1c1c22] text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
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
                  ? "bg-white dark:bg-[#1c1c22] text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Certificate File</span>
            </button>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] rounded-2xl p-6 sm:p-8 shadow-sm">
          {activeMode === "serial" ? (
            /* Mode 1: Search by Serial */
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="serial-input"
                  className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2"
                >
                  Certificate Serial Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-zinc-400" />
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
                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-[#18181c] border border-zinc-200 dark:border-[#27272a] rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono text-base focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all uppercase"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Try sample:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSerialInput("AURORA-2026-000063");
                      setError(null);
                    }}
                    className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2 py-0.5 rounded-lg cursor-pointer transition-colors font-medium"
                  >
                    AURORA-2026-000063
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-[#F5F5F5] dark:hover:bg-white dark:text-zinc-900 font-bold py-3.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer text-sm"
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
                    ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20"
                    : "border-zinc-200 dark:border-[#27272a] bg-zinc-50/50 dark:bg-[#18181c]/50 hover:border-zinc-400 dark:hover:border-zinc-500"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-[#222226] text-zinc-700 dark:text-zinc-300 mb-3">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-900 dark:text-white" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {uploading ? "Analyzing Certificate Authenticity..." : "Upload Certificate for Verification"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                  Drag and drop your official Certificate PDF, Verification Receipt (.json), or certificate scan here, or click to browse.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className="bg-zinc-100 dark:bg-[#222226] px-2 py-0.5 rounded border border-zinc-200 dark:border-[#27272a]">.PDF Certificates</span>
                  <span className="bg-zinc-100 dark:bg-[#222226] px-2 py-0.5 rounded border border-zinc-200 dark:border-[#27272a]">.JSON Receipts</span>
                  <span className="bg-zinc-100 dark:bg-[#222226] px-2 py-0.5 rounded border border-zinc-200 dark:border-[#27272a]">.PNG / .JPG Scans</span>
                </div>
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <span className="font-bold block">Verification Failed</span>
                    <p className="mt-0.5 opacity-90">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Upload Match Success Result */}
              {uploadMatch && uploadMatch.serial && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Authentic Institutional Certificate Verified!
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#18181c] rounded-xl p-3 border border-zinc-200 dark:border-[#27272a] space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 dark:text-zinc-400">Certificate Serial:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{uploadMatch.serial}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 dark:text-zinc-400">Research Title:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[240px]">{uploadMatch.projectTitle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 dark:text-zinc-400">Evaluating Panelist:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{uploadMatch.panelistName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 dark:text-zinc-400">Total Score:</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400">{Number(uploadMatch.totalScore || 0).toFixed(1)} / 100</span>
                    </div>
                  </div>

                  <Link
                    href={`/verify/${encodeURIComponent(uploadMatch.serial)}`}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all"
                  >
                    <span>Open Official Public Audit Report</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Quick Info / Security Seal */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-[#222226] grid sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-zinc-900 dark:text-zinc-100">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold">SHA-256 Integrity</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Cryptographically hashed score sheets prevent post-defense modification.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-zinc-900 dark:text-zinc-100">
                <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">Instant QR Verification</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Direct lookup via scannable QR code embedded on certificates.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-zinc-900 dark:text-zinc-100">
                <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold">Immutable Audit Trail</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Every defense approval is permanently sealed in the institutional ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Guidance */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Having trouble? You can also scan the QR code located at the bottom-right corner of any physical or PDF certificate.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full py-6 text-center border-t border-zinc-200 dark:border-[#222226] text-zinc-500 dark:text-zinc-400 text-xs">
        <p className="font-medium">
          AURORA — Academic Unified Review, Observation, Rating, and Assessment System
        </p>
        <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          Partido State University • Goa, Camarines Sur, Philippines
        </p>
      </footer>
    </main>
  );
}
