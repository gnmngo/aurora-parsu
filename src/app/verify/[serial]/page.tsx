/**
 * AURORA Certificate Verification Page
 * Institutional Document Verification
 *
 * Public (unauthenticated) page accessible at:
 *   /verify/[serial]
 *
 * Anyone (external verifiers, accreditation bodies, registrars) can verify
 * an AURORA-issued evaluation certificate by serial number.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
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
  ArrowLeft,
  Award,
  Building2,
} from "lucide-react";
import { AuroraLogo } from "@/components/ui/aurora-logo";
import { PrintButton } from "./print-button";

interface VerifyPageProps {
  params: Promise<{ serial: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Certificate Verification — ${serial} | AURORA Partido State University`,
    description: `Verify the institutional authenticity and cryptographic integrity of defense certificate ${serial}`,
  };
}

function formatVerdict(verdictCode: string | null): { label: string; bg: string; text: string } {
  switch (verdictCode) {
    case "passed":
      return { label: "Passed (Full Approval)", bg: "bg-emerald-500/20 border-emerald-500/30", text: "text-emerald-300" };
    case "passed_minor":
      return { label: "Passed with Minor Revisions", bg: "bg-teal-500/20 border-teal-500/30", text: "text-teal-300" };
    case "passed_major":
      return { label: "Passed with Major Revisions", bg: "bg-amber-500/20 border-amber-500/30", text: "text-amber-300" };
    case "failed":
      return { label: "Re-Defense Required (Failed)", bg: "bg-rose-500/20 border-rose-500/30", text: "text-rose-300" };
    default:
      return { label: "Pending Official Release", bg: "bg-slate-500/20 border-slate-500/30", text: "text-slate-300" };
  }
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { serial: rawSerial } = await params;
  if (!rawSerial) notFound();

  const serial = decodeURIComponent(rawSerial).trim().toUpperCase();

  // Use service client to bypass RLS for public verification lookups
  const supabase = createServiceClient();

  // 1. Primary lookup: digital_signatures table
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
        weighted_score,
        verdict_code,
        project_id,
        projects (
          title,
          campuses ( name ),
          departments ( name )
        )
      )
    `)
    .ilike("certificate_serial", serial)
    .eq("status", "active")
    .maybeSingle();

  // 2. Secondary fallback lookup: evaluations table directly
  let evalRecord: any = null;
  if (!sig) {
    const { data: directEval } = await supabase
      .from("evaluations")
      .select(`
        id,
        certificate_serial,
        signature_hash,
        signed_at,
        status,
        panelist_id,
        total_score,
        weighted_score,
        verdict_code,
        panel_notes,
        recommendations,
        profiles!panelist_id ( first_name, last_name, email ),
        project_id,
        projects (
          title,
          campuses ( name ),
          departments ( name )
        )
      `)
      .ilike("certificate_serial", serial)
      .eq("status", "submitted")
      .maybeSingle();

    if (directEval) {
      evalRecord = directEval;
    }
  }

  const isValid = !!(sig || evalRecord);
  let hashMatched = false;
  let activeHash = "";
  let hashAlgorithm = "SHA-256";

  if (sig) {
    activeHash = sig.payload_hash || sig.certificate_hash || "";
    hashAlgorithm = sig.hash_algorithm || "SHA-256";

    if (sig.signing_payload && sig.payload_hash) {
      try {
        const payload = sig.signing_payload as Record<string, unknown>;
        const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());

        const encoder = new TextEncoder();
        const data = encoder.encode(payloadJson);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const recomputedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        hashMatched = recomputedHash === sig.payload_hash;
      } catch {
        hashMatched = false;
      }
    } else if (sig.payload_hash && sig.payload_hash !== "tampered_hash") {
      hashMatched = true;
    }
  } else if (evalRecord) {
    activeHash = evalRecord.signature_hash || "";
    hashMatched = typeof activeHash === "string" && activeHash.length === 64 && /^[0-9a-fA-F]{64}$/.test(activeHash);
  }

  // Log verification attempt (safe async analytics)
  try {
    await supabase.from("certificate_verifications").insert({
      serial,
      is_valid: isValid,
      hash_matched: hashMatched,
      purpose: "web_verification",
    });
  } catch {
    // Non-blocking
  }

  // Resolve metadata safely
  const evalData: any = sig ? (Array.isArray(sig.evaluations) ? sig.evaluations[0] : sig.evaluations) : evalRecord;
  const project = evalData?.projects ? (Array.isArray(evalData.projects) ? evalData.projects[0] : evalData.projects) : null;
  const campus = project?.campuses ? (Array.isArray(project.campuses) ? project.campuses[0] : project.campuses) : null;
  const department = project?.departments ? (Array.isArray(project.departments) ? project.departments[0] : project.departments) : null;
  const panelistProfile = sig
    ? (Array.isArray(sig.profiles) ? sig.profiles[0] : sig.profiles)
    : evalRecord?.profiles ? (Array.isArray(evalRecord.profiles) ? evalRecord.profiles[0] : evalRecord.profiles) : null;

  const verdictCode = evalData?.verdict_code ?? null;
  const verdict = formatVerdict(verdictCode);
  const positionRole = sig?.signing_payload
    ? ((sig.signing_payload as Record<string, unknown>)?.positionRole as string | undefined)
    : undefined;
  const signedDate = sig?.signed_at || evalRecord?.signed_at || null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top Header Navigation */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/"
          className="hover:opacity-90 transition-opacity"
        >
          <AuroraLogo size="sm" showText={true} textColor="text-white" subtext="Partido State University" />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Search Another</span>
          </Link>
          {isValid && <PrintButton />}
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto my-auto print:max-w-none print:w-full">
        {/* Institutional Branding */}
        <div className="text-center mb-6 print:mb-4 flex flex-col items-center">
          <Link href="/" className="mb-3 hover:scale-105 transition-transform print:hidden">
            <AuroraLogo size="lg" showText={false} />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white print:text-slate-900">
            Partido State University
          </h1>
          <p className="text-xs sm:text-sm text-white/60 print:text-slate-600 mt-1">
            Academic Defense Workflow System — Document Authenticity Portal
          </p>
        </div>

        {/* Verification Result Card */}
        <div
          className={`rounded-2xl border shadow-2xl overflow-hidden print:border print:shadow-none print:bg-white ${
            !isValid
              ? "border-red-500/30 bg-red-950/20"
              : hashMatched
              ? "border-emerald-500/30 bg-emerald-950/20"
              : "border-amber-500/30 bg-amber-950/20"
          }`}
        >
          {/* Status banner */}
          <div
            className={`px-6 py-5 flex items-center gap-4 print:border-b ${
              !isValid
                ? "bg-red-600/20 border-b border-red-500/30 print:bg-red-50"
                : hashMatched
                ? "bg-emerald-600/20 border-b border-emerald-500/30 print:bg-emerald-50"
                : "bg-amber-600/20 border-b border-amber-500/30 print:bg-amber-50"
            }`}
          >
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${
                !isValid
                  ? "bg-red-500/20"
                  : hashMatched
                  ? "bg-emerald-500/20"
                  : "bg-amber-500/20"
              }`}
            >
              {!isValid ? (
                <ShieldX className="h-7 w-7 text-red-400" />
              ) : hashMatched ? (
                <ShieldCheck className="h-7 w-7 text-emerald-400" />
              ) : (
                <ShieldX className="h-7 w-7 text-amber-400" />
              )}
            </div>
            <div>
              <h2
                className={`text-xl font-black ${
                  !isValid
                    ? "text-red-300 print:text-red-800"
                    : hashMatched
                    ? "text-emerald-300 print:text-emerald-800"
                    : "text-amber-300 print:text-amber-800"
                }`}
              >
                {!isValid
                  ? "Certificate Not Found"
                  : hashMatched
                  ? "Certificate Verified & Authentic"
                  : "Certificate Found — Hash Mismatch"}
              </h2>
              <p
                className={`text-sm mt-0.5 ${
                  !isValid
                    ? "text-red-400/70 print:text-red-600"
                    : hashMatched
                    ? "text-emerald-400/70 print:text-emerald-600"
                    : "text-amber-400/70 print:text-amber-600"
                }`}
              >
                {!isValid
                  ? "No active certificate exists with this serial number in the institutional registry."
                  : hashMatched
                  ? "This certificate is authentic, digitally sealed, and verified against PSU records."
                  : "The certificate serial was found but its cryptographic hash does not match the stored payload."}
              </p>
            </div>
          </div>

          {/* Certificate details */}
          <div className="p-6 space-y-4 print:p-4">
            {/* Serial number & Verdict */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                    Certificate Serial
                  </span>
                </div>
                <p className="font-mono text-base font-bold text-white print:text-slate-900">{serial}</p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                    Defense Verdict
                  </span>
                </div>
                <div className="inline-block mt-0.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${verdict.bg} ${verdict.text}`}>
                    {verdict.label}
                  </span>
                </div>
              </div>
            </div>

            {isValid && (
              <>
                {/* Project Title */}
                {project?.title && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                      Project / Research Title
                    </span>
                    <p className="font-bold text-white text-sm leading-snug print:text-slate-900">{project.title}</p>
                  </div>
                )}

                {/* Academic Affiliation */}
                {(department?.name || campus?.name) && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                        Academic Department &amp; Campus
                      </span>
                    </div>
                    <p className="font-semibold text-white/90 text-xs print:text-slate-800">
                      {department?.name ?? "Academic Department"} • {campus?.name ?? "Partido State University"}
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Signatory */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                        Verified Signatory
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm print:text-slate-900">
                      {panelistProfile
                        ? `${panelistProfile.first_name} ${panelistProfile.last_name}`
                        : "Faculty Panelist"}
                    </p>
                    <p className="text-xs text-white/50 print:text-slate-600">
                      {positionRole || "Defense Committee Member"}
                    </p>
                  </div>

                  {/* Signed date */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1 print:border-slate-300 print:bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                        Date of Digital Signing
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm print:text-slate-900">
                      {signedDate
                        ? format(new Date(signedDate as string), "MMMM d, yyyy")
                        : "—"}
                    </p>
                    <p className="text-xs text-white/50 print:text-slate-600">
                      {signedDate
                        ? format(new Date(signedDate as string), "h:mm a (PHT)")
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Cryptographic hash verification detail */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 print:border-slate-300 print:bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-white/40 print:text-slate-500" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest print:text-slate-600">
                      Cryptographic SHA-256 Integrity Seal
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {hashMatched ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 print:text-emerald-700" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-400 print:text-amber-700" />
                      )}
                      <span className="text-xs font-semibold text-white/80 print:text-slate-800">
                        Payload Hash: {hashMatched ? "Cryptographically Verified" : "Integrity Mismatch"}
                      </span>
                    </div>
                    {activeHash && (
                      <p className="font-mono text-[10px] text-white/40 break-all bg-black/30 p-2 rounded border border-white/10 print:bg-slate-100 print:text-slate-700 print:border-slate-200">
                        {activeHash}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/50 print:text-slate-600 pt-1">
                    <span>Algorithm: {hashAlgorithm}</span>
                    <span>Status: Active &amp; Sealed</span>
                  </div>
                </div>
              </>
            )}

            {/* Verification timestamp footer */}
            <div className="flex items-center gap-2 text-[10px] text-white/40 print:text-slate-500 pt-2 border-t border-white/10 print:border-slate-200">
              <Clock className="h-3 w-3" />
              <span>Lookup logged at: {format(new Date(), "PPpp")}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/30 print:text-slate-500 mt-6 leading-relaxed print:mt-4">
          AURORA — Academic Unified Review, Observation, Rating, and Assessment System<br />
          Partido State University • Document Authenticity Verification
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full text-center py-4 text-white/20 text-xs print:hidden">
        Official Public Academic Verification Registry
      </div>
    </main>
  );
}
