"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  FileCheck,
  Lock,
  QrCode,
  GraduationCap,
} from "lucide-react";

export default function VerifyPortalPage() {
  const router = useRouter();
  const [serialInput, setSerialInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = serialInput.trim().toUpperCase();

    if (!clean) {
      setError("Please enter a certificate serial number.");
      return;
    }

    // Standard AURORA serial regex: AURORA-YYYY-XXXXXX
    if (!clean.startsWith("AURORA-")) {
      setError('Serial number must start with "AURORA-" (e.g. AURORA-2026-000049)');
      return;
    }

    setError(null);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Brand Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-wider uppercase text-white block">
              AURORA
            </span>
            <span className="text-[10px] text-white/50 block tracking-wider uppercase">
              Partido State University
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
        >
          Faculty / Student Login
        </Link>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto w-full my-auto py-12">
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

        {/* Verification Form Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl">
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
                  placeholder="e.g. AURORA-2026-000049"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-white/15 rounded-xl text-white placeholder-white/30 font-mono text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase"
                />
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
