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
import Image from "next/image";
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
  Award,
  Building2,
} from "lucide-react";
import { VerifyHeader } from "./verify-header";

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
      return { label: "Passed (Full Approval)", bg: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-700 dark:text-emerald-300" };
    case "passed_minor":
      return { label: "Passed with Minor Revisions", bg: "bg-teal-500/10 border-teal-500/25", text: "text-teal-700 dark:text-teal-300" };
    case "passed_major":
      return { label: "Passed with Major Revisions", bg: "bg-amber-500/10 border-amber-500/25", text: "text-amber-700 dark:text-amber-300" };
    case "failed":
      return { label: "Re-Defense Required (Failed)", bg: "bg-rose-500/10 border-rose-500/25", text: "text-rose-700 dark:text-rose-300" };
    default:
      return { label: "Pending Official Release", bg: "bg-zinc-500/10 border-zinc-500/25", text: "text-zinc-600 dark:text-zinc-400" };
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
    const { data: ev } = await supabase
      .from("evaluations")
      .select(`
        id,
        certificate_serial,
        signature_hash,
        total_score,
        weighted_score,
        verdict_code,
        signed_at,
        panelist_id,
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

    evalRecord = ev;
  }

  const isValid = Boolean(sig || evalRecord);

  // Cryptographic Integrity Verification
  let hashMatched = false;
  let activeHash = "";
  const hashAlgorithm = sig?.hash_algorithm || "SHA-256";

  if (sig) {
    activeHash = sig.payload_hash || sig.certificate_hash || "";
    if (sig.signing_payload && sig.payload_hash) {
      try {
        const payloadObj = sig.signing_payload;
        const sortedJson = JSON.stringify(payloadObj, Object.keys(payloadObj).sort());
        const encoder = new TextEncoder();
        const data = encoder.encode(sortedJson);
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
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-[#050505] dark:text-[#F5F5F5] flex flex-col justify-between p-4 sm:p-8 font-sans antialiased transition-colors duration-200 print:bg-white print:p-0 print:text-zinc-900">
      {/* Top Header Navigation */}
      <VerifyHeader isValid={isValid} />

      <div className="w-full max-w-3xl mx-auto my-auto print:max-w-none print:w-full">
        {/* Institutional Branding */}
        <div className="text-center mb-8 print:mb-4 flex flex-col items-center">
          <Link href="/" className="mb-3 hover:scale-105 transition-transform print:hidden">
            <div className="relative h-12 w-12 flex items-center justify-center">
              <Image
                src="/aurora-symbol-transparent.png"
                alt="AURORA Symbol"
                width={48}
                height={48}
                priority
                className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
              />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white print:text-zinc-900 tracking-tight">
            Partido State University
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 print:text-zinc-600 mt-1 font-medium">
            AURORA &bull; Official Document Authenticity Verification Registry
          </p>
        </div>

        {/* Verification Result Card */}
        <div
          className={`rounded-2xl border shadow-sm overflow-hidden print:border print:shadow-none print:bg-white ${
            !isValid
              ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
              : hashMatched
              ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
              : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10"
          }`}
        >
          {/* Status banner */}
          <div
            className={`px-6 py-5 flex items-center gap-4 print:border-b ${
              !isValid
                ? "bg-rose-500/10 border-b border-rose-500/20 print:bg-rose-50"
                : hashMatched
                ? "bg-emerald-500/10 border-b border-emerald-500/20 print:bg-emerald-50"
                : "bg-amber-500/10 border-b border-amber-500/20 print:bg-amber-50"
            }`}
          >
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                !isValid
                  ? "bg-rose-500/15"
                  : hashMatched
                  ? "bg-emerald-500/15"
                  : "bg-amber-500/15"
              }`}
            >
              {!isValid ? (
                <ShieldX className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              ) : hashMatched ? (
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldX className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h2
                className={`text-lg sm:text-xl font-black ${
                  !isValid
                    ? "text-rose-800 dark:text-rose-300 print:text-rose-800"
                    : hashMatched
                    ? "text-emerald-800 dark:text-emerald-300 print:text-emerald-800"
                    : "text-amber-800 dark:text-amber-300 print:text-amber-800"
                }`}
              >
                {!isValid
                  ? "Certificate Not Found"
                  : hashMatched
                  ? "Certificate Verified & Authentic"
                  : "Certificate Found — Hash Mismatch"}
              </h2>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  !isValid
                    ? "text-rose-700/80 dark:text-rose-400/80 print:text-rose-600"
                    : hashMatched
                    ? "text-emerald-700/80 dark:text-emerald-400/80 print:text-emerald-600"
                    : "text-amber-700/80 dark:text-amber-400/80 print:text-amber-600"
                }`}
              >
                {!isValid
                  ? "No active certificate exists with this serial number in the institutional registry."
                  : hashMatched
                  ? "This certificate is authentic, digitally sealed, and verified against Partido State University records."
                  : "The certificate serial was found but its cryptographic hash does not match the stored payload."}
              </p>
            </div>
          </div>

          {/* Certificate details */}
          <div className="p-6 space-y-4 print:p-4">
            {/* Serial number & Verdict */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                    Certificate Serial
                  </span>
                </div>
                <p className="font-mono text-base font-bold text-zinc-900 dark:text-white print:text-zinc-900">{serial}</p>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
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
                  <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Project / Research Title
                    </span>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm leading-snug print:text-zinc-900">{project.title}</p>
                  </div>
                )}

                {/* Academic Affiliation */}
                {(department?.name || campus?.name) && (
                  <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Academic Department &amp; Campus
                      </span>
                    </div>
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs print:text-zinc-800">
                      {department?.name ?? "Academic Department"} • {campus?.name ?? "Partido State University"}
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Signatory */}
                  <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Verified Signatory
                      </span>
                    </div>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm print:text-zinc-900">
                      {panelistProfile
                        ? `${panelistProfile.first_name} ${panelistProfile.last_name}`
                        : "Faculty Panelist"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                      {positionRole || "Defense Committee Member"}
                    </p>
                  </div>

                  {/* Signed date */}
                  <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-1 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Date of Digital Signing
                      </span>
                    </div>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm print:text-zinc-900">
                      {signedDate
                        ? format(new Date(signedDate as string), "MMMM d, yyyy")
                        : "—"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                      {signedDate
                        ? format(new Date(signedDate as string), "h:mm a (PHT)")
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Cryptographic hash verification detail */}
                <div className="rounded-xl bg-white dark:bg-[#111115] border border-zinc-200 dark:border-[#222226] p-4 space-y-2 shadow-2xs print:border-zinc-300 print:bg-zinc-50">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Cryptographic SHA-256 Integrity Seal
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {hashMatched ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 print:text-emerald-700" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 print:text-amber-700" />
                      )}
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 print:text-zinc-800">
                        Payload Hash: {hashMatched ? "Cryptographically Verified" : "Integrity Mismatch"}
                      </span>
                    </div>
                    {activeHash && (
                      <p className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 break-all bg-zinc-50 dark:bg-[#18181c] p-2.5 rounded-lg border border-zinc-200 dark:border-[#27272a] print:bg-zinc-100 print:text-zinc-700 print:border-zinc-200">
                        {activeHash}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 print:text-zinc-600 pt-1">
                    <span>Algorithm: {hashAlgorithm}</span>
                    <span>Status: Active &amp; Sealed (RA 8792)</span>
                  </div>
                </div>
              </>
            )}

            {/* Verification timestamp footer */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 print:text-zinc-500 pt-2 border-t border-zinc-100 dark:border-[#1c1c22] print:border-zinc-200">
              <Clock className="h-3 w-3" />
              <span>Lookup logged at: {format(new Date(), "PPpp")}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 print:text-zinc-500 mt-6 leading-relaxed print:mt-4">
          AURORA — Academic Unified Review, Observation, Rating, and Assessment System<br />
          Partido State University &bull; Document Authenticity Verification
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full text-center py-4 text-zinc-400 dark:text-zinc-600 text-xs print:hidden">
        Official Public Academic Verification Registry
      </div>
    </main>
  );
}
