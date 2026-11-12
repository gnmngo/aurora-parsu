import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ serial: string }>;
}

function extractName(field: unknown): string | null {
  if (!field) return null;
  if (Array.isArray(field) && field.length > 0) {
    const item = field[0];
    return typeof item === "object" && item !== null && "name" in item ? String((item as { name: unknown }).name) : null;
  }
  if (typeof field === "object" && field !== null && "name" in field) {
    return String((field as { name: unknown }).name);
  }
  return null;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { serial: rawSerial } = await params;
  if (!rawSerial) {
    return NextResponse.json(
      { success: false, error: "Missing certificate serial parameter." },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const serial = decodeURIComponent(rawSerial).trim().toUpperCase();

  try {
    const supabase = createServiceClient();

    // 1. Primary lookup: digital_signatures table
    const { data: sig, error: sigErr } = await supabase
      .from("digital_signatures")
      .select(`
        id,
        certificate_serial,
        payload_hash,
        signature_hash,
        hash_algorithm,
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
          stages ( title ),
          projects (
            title,
            colleges ( name ),
            departments ( name )
          )
        )
      `)
      .ilike("certificate_serial", serial)
      .eq("status", "active")
      .maybeSingle();

    if (sig && !sigErr) {
      const evalData: any = Array.isArray(sig.evaluations) ? sig.evaluations[0] : sig.evaluations;
      const proj: any = evalData?.projects ? (Array.isArray(evalData.projects) ? evalData.projects[0] : evalData.projects) : null;
      const prof: any = Array.isArray(sig.profiles) ? sig.profiles[0] : sig.profiles;
      const stage: any = evalData?.stages ? (Array.isArray(evalData.stages) ? evalData.stages[0] : evalData.stages) : null;

      const collegeName = extractName(proj?.colleges) || "College of Engineering and Computational Sciences";
      const departmentName = extractName(proj?.departments) || "Department of Computational Sciences";

      return NextResponse.json(
        {
          success: true,
          found: true,
          certificateSerial: sig.certificate_serial,
          projectTitle: proj?.title || "Research Defense Manuscript",
          stage: stage?.title || "Oral Defense",
          verdict: evalData?.verdict_code || "approved",
          score: evalData?.weighted_score ?? evalData?.total_score ?? null,
          panelistName: prof ? `${prof.first_name} ${prof.last_name}` : "Faculty Panelist",
          signedAt: sig.signed_at,
          hashAlgorithm: sig.hash_algorithm || "SHA-256",
          signatureHash: sig.payload_hash || sig.signature_hash,
          verificationStatus: "AUTHENTIC_AND_VERIFIED",
          institution: "Partido State University — Goa Campus",
          college: collegeName,
          department: departmentName,
        },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }

    // 2. Secondary fallback lookup: evaluations table
    const { data: ev, error: evErr } = await supabase
      .from("evaluations")
      .select(`
        id,
        certificate_serial,
        signature_hash,
        signed_at,
        total_score,
        weighted_score,
        verdict_code,
        profiles!panelist_id ( first_name, last_name, email ),
        stages ( title ),
        projects (
          title,
          colleges ( name ),
          departments ( name )
        )
      `)
      .ilike("certificate_serial", serial)
      .maybeSingle();

    if (ev && !evErr) {
      const evData: any = ev;
      const proj: any = evData.projects ? (Array.isArray(evData.projects) ? evData.projects[0] : evData.projects) : null;
      const prof: any = evData.profiles ? (Array.isArray(evData.profiles) ? evData.profiles[0] : evData.profiles) : null;
      const stage: any = evData.stages ? (Array.isArray(evData.stages) ? evData.stages[0] : evData.stages) : null;

      const collegeName = extractName(proj?.colleges) || "College of Engineering and Computational Sciences";
      const departmentName = extractName(proj?.departments) || "Department of Computational Sciences";

      return NextResponse.json(
        {
          success: true,
          found: true,
          certificateSerial: evData.certificate_serial,
          projectTitle: proj?.title || "Research Defense Manuscript",
          stage: stage?.title || "Oral Defense",
          verdict: evData.verdict_code || "approved",
          score: evData.weighted_score ?? evData.total_score ?? null,
          panelistName: prof ? `${prof.first_name} ${prof.last_name}` : "Faculty Panelist",
          signedAt: evData.signed_at,
          hashAlgorithm: "SHA-256",
          signatureHash: evData.signature_hash,
          verificationStatus: "AUTHENTIC_AND_VERIFIED",
          institution: "Partido State University — Goa Campus",
          college: collegeName,
          department: departmentName,
        },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        found: false,
        certificateSerial: serial,
        verificationStatus: "RECORD_NOT_FOUND",
        error: "Certificate record not found or has been revoked.",
      },
      {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal verification error";
    return NextResponse.json(
      {
        success: false,
        found: false,
        error: message,
      },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
