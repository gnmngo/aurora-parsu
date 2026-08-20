/**
 * AURORA Certificate Verification Page
 * Sprint 2F
 *
 * Public (unauthenticated) page accessible at:
 *   /verify/[serial]
 *
 * Anyone (external verifiers, accreditation bodies) can verify
 * an AURORA-issued evaluation certificate by serial number.
 *
 * Verification steps:
 * 1. Lookup digital_signatures by certificate_serial
 * 2. Recompute payload hash and compare
 * 3. Log the verification attempt to certificate_verifications
 * 4. Return verification result
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import {
  ShieldCheck,
  ShieldX,
  Hash,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface VerifyPageProps {
  params: Promise<{ serial: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Certificate Verification — ${serial} | AURORA`,
    description: `Verify the authenticity of AURORA evaluation certificate ${serial}`,
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { serial } = await params;
  if (!serial) notFound();

  const supabase = await createClient();

  // Lookup the certificate
  const { data: sig } = await supabase
    .from("digital_signatures")
    .select(`
      id,
      certificate_serial,
      payload_hash,
      certificate_hash,
      hash_algorithm,
      signing_payload,
      signed_at,
      status,
      panelist_id,
      profiles!panelist_id ( first_name, last_name, email ),
      evaluation_id,
      evaluations (
        total_score,
        verdict_code,
        project_id,
        projects ( title )
      )
    `)
    .eq("certificate_serial", serial)
    .eq("status", "active")
    .maybeSingle();

  const isValid = !!sig;
  let hashMatched = false;

  if (sig?.signing_payload && sig.payload_hash) {
    // Re-derive the payload hash for independent verification
    const payload = sig.signing_payload as Record<string, unknown>;
    const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());

    // Use Web Crypto API (available in Node.js 18+ / Edge Runtime)
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadJson);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const recomputedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    hashMatched = recomputedHash === sig.payload_hash;
  }

  // Log verification attempt
  await supabase.from("certificate_verifications").insert({
    serial,
    is_valid: isValid,
    hash_matched: hashMatched,
    purpose: "web_verification",
  });

  const panelistProfile = sig
    ? (sig as unknown as { profiles: { first_name: string; last_name: string; email: string } | null }).profiles
    : null;
  const evaluation = sig
    ? (sig as unknown as { evaluations: { total_score: number | null; verdict_code: string | null; project_id: string; projects: { title: string } | null } | null }).evaluations
    : null;
  const project = evaluation?.projects ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white/80 tracking-widest uppercase">
              Aurora Certificate Verifier
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Partido State University
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Academic Defense Workflow System — Document Authenticity Portal
          </p>
        </div>

        {/* Verification Result Card */}
        <div
          className={`rounded-2xl border shadow-2xl overflow-hidden ${
            !isValid
              ? "border-red-500/30 bg-red-950/20"
              : hashMatched
              ? "border-emerald-500/30 bg-emerald-950/20"
              : "border-amber-500/30 bg-amber-950/20"
          }`}
        >
          {/* Status banner */}
          <div
            className={`px-6 py-5 flex items-center gap-4 ${
              !isValid
                ? "bg-red-600/20 border-b border-red-500/30"
                : hashMatched
                ? "bg-emerald-600/20 border-b border-emerald-500/30"
                : "bg-amber-600/20 border-b border-amber-500/30"
            }`}
          >
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${
              !isValid ? "bg-red-500/20" : hashMatched ? "bg-emerald-500/20" : "bg-amber-500/20"
            }`}>
              {!isValid ? (
                <ShieldX className="h-7 w-7 text-red-400" />
              ) : hashMatched ? (
                <ShieldCheck className="h-7 w-7 text-emerald-400" />
              ) : (
                <ShieldX className="h-7 w-7 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-black ${
                !isValid ? "text-red-300" : hashMatched ? "text-emerald-300" : "text-amber-300"
              }`}>
                {!isValid
                  ? "Certificate Not Found"
                  : hashMatched
                  ? "Certificate Verified"
                  : "Certificate Found — Hash Mismatch"}
              </h2>
              <p className={`text-sm mt-0.5 ${
                !isValid ? "text-red-400/70" : hashMatched ? "text-emerald-400/70" : "text-amber-400/70"
              }`}>
                {!isValid
                  ? "No active certificate exists with this serial number."
                  : hashMatched
                  ? "This certificate is authentic and cryptographically verified."
                  : "The certificate exists but the cryptographic hash could not be verified."}
              </p>
            </div>
          </div>

          {/* Certificate details */}
          <div className="p-6 space-y-4">
            {/* Serial number */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-white/40" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Certificate Serial</span>
              </div>
              <p className="font-mono text-lg font-bold text-white">{serial}</p>
            </div>

            {isValid && sig && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Signatory */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Signed By</span>
                    </div>
                    <p className="font-bold text-white text-sm">
                      {panelistProfile
                        ? `${panelistProfile.first_name} ${panelistProfile.last_name}`
                        : "Unknown"}
                    </p>
                    {panelistProfile?.email && (
                      <p className="text-xs text-white/50">{panelistProfile.email}</p>
                    )}
                  </div>

                  {/* Signed date */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Signed At</span>
                    </div>
                    <p className="font-bold text-white text-sm">
                      {sig.signed_at
                        ? format(new Date(sig.signed_at as string), "MMMM d, yyyy")
                        : "—"}
                    </p>
                    <p className="text-xs text-white/50">
                      {sig.signed_at
                        ? format(new Date(sig.signed_at as string), "h:mm a")
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Project */}
                {project?.title && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Project / Research Title</span>
                    <p className="font-bold text-white text-sm">{project.title}</p>
                  </div>
                )}

                {/* Hash verification detail */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Cryptographic Verification</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {hashMatched ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-amber-400" />
                      )}
                      <span className="text-xs text-white/60">
                        Payload hash: {hashMatched ? "Verified" : "Mismatch"}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-white/30 break-all">
                      {sig.payload_hash}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs text-white/60">
                        Algorithm: {sig.hash_algorithm}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Verification timestamp footer */}
            <div className="flex items-center gap-2 text-[10px] text-white/30 pt-2">
              <Clock className="h-3 w-3" />
              <span>Verified at: {format(new Date(), "PPpp")}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/20 mt-6 leading-relaxed">
          AURORA — Paperless Academic Defense Workflow System for Research, Capstone, Thesis &amp; Dissertation Papers<br />
          Partido State University • Cryptographic Authenticity Verification
        </p>
      </div>
    </main>
  );
}
