"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface VerificationLookupResult {
  found: boolean;
  serial?: string;
  verdictCode?: string;
  totalScore?: number;
  signedAt?: string;
  panelistName?: string;
  projectTitle?: string;
  hash?: string;
  error?: string;
}

/**
 * Server action to look up a certificate by either its Serial Number or Cryptographic SHA-256 Hash.
 * Accessible without authentication so external verifiers and document uploaders can verify.
 */
export async function lookupCertificateByHashOrSerialAction(input: {
  serial?: string;
  hash?: string;
}): Promise<VerificationLookupResult> {
  const supabase = createServiceClient();
  const cleanSerial = input.serial?.trim().toUpperCase();
  const cleanHash = input.hash?.trim().toLowerCase();

  if (!cleanSerial && !cleanHash) {
    return { found: false, error: "Please provide either a serial number or hash." };
  }

  try {
    // 1. Check digital_signatures table first
    let sigQuery = supabase
      .from("digital_signatures")
      .select(`
        id,
        certificate_serial,
        payload_hash,
        signature_hash,
        signed_at,
        profiles!panelist_id ( first_name, last_name ),
        evaluations (
          total_score,
          verdict_code,
          projects ( title )
        )
      `)
      .eq("status", "active");

    if (cleanSerial) {
      sigQuery = sigQuery.ilike("certificate_serial", cleanSerial);
    } else if (cleanHash) {
      sigQuery = sigQuery.or(`payload_hash.eq.${cleanHash},signature_hash.eq.${cleanHash}`);
    }

    const { data: sig, error: sigErr } = await sigQuery.maybeSingle();

    if (sig && !sigErr) {
      const evalData = Array.isArray(sig.evaluations) ? sig.evaluations[0] : sig.evaluations;
      const proj = evalData?.projects ? (Array.isArray(evalData.projects) ? evalData.projects[0] : evalData.projects) : null;
      const prof = Array.isArray(sig.profiles) ? sig.profiles[0] : sig.profiles;

      return {
        found: true,
        serial: sig.certificate_serial,
        verdictCode: evalData?.verdict_code,
        totalScore: evalData?.total_score,
        signedAt: sig.signed_at,
        panelistName: prof ? `${prof.first_name} ${prof.last_name}` : "Faculty Panelist",
        projectTitle: proj?.title || "Research Defense Manuscript",
        hash: sig.payload_hash || sig.signature_hash,
      };
    }

    // 2. Check evaluations table fallback
    let evalQuery = supabase
      .from("evaluations")
      .select(`
        id,
        certificate_serial,
        signature_hash,
        signed_at,
        total_score,
        verdict_code,
        profiles!panelist_id ( first_name, last_name ),
        projects ( title )
      `)
      .eq("status", "submitted");

    if (cleanSerial) {
      evalQuery = evalQuery.ilike("certificate_serial", cleanSerial);
    } else if (cleanHash) {
      evalQuery = evalQuery.eq("signature_hash", cleanHash);
    }

    const { data: ev, error: evErr } = await evalQuery.maybeSingle();

    if (ev && !evErr) {
      const proj = ev.projects ? (Array.isArray(ev.projects) ? ev.projects[0] : ev.projects) : null;
      const prof = ev.profiles ? (Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles) : null;

      return {
        found: true,
        serial: ev.certificate_serial,
        verdictCode: ev.verdict_code,
        totalScore: ev.total_score,
        signedAt: ev.signed_at,
        panelistName: prof ? `${prof.first_name} ${prof.last_name}` : "Faculty Panelist",
        projectTitle: proj?.title || "Research Defense Manuscript",
        hash: ev.signature_hash,
      };
    }

    return { found: false };
  } catch (err: unknown) {
    return {
      found: false,
      error: err instanceof Error ? err.message : "Lookup failed",
    };
  }
}
