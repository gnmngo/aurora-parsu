import type { SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseError } from "@/lib/supabase/errors";

export interface SubmissionRow {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  studentName: string;
  version: number;
  submittedAt: string;
  stage: string;
  reviewStatus: string;
  score: number | null;
  commentCount: number;
  department: string;
  hasDocument: boolean;
}

function resolveStudentName(students: unknown): string {
  if (!students || typeof students !== "object") return "Unknown Student";
  const s = students as { profiles?: unknown };
  const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
  if (!profile || typeof profile !== "object") return "Unknown Student";
  const p = profile as { first_name?: string; last_name?: string };
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown Student";
}

function resolveScoreCache(cache: unknown): number | null {
  if (!cache) return null;
  const row = Array.isArray(cache) ? cache[0] : cache;
  if (!row || typeof row !== "object") return null;
  const score = (row as { avg_score?: number }).avg_score;
  return score != null ? Number(score) : null;
}

/** Map raw Supabase project rows to submission cards */
export function mapProjectsToSubmissions(projects: any[]): SubmissionRow[] {
  return projects.map((proj) => {
    const docs = proj.documents ?? [];
    const stageDoc =
      docs.find((d: any) => d.stage_id === proj.current_stage_id) ?? docs[0] ?? null;

    const versions = stageDoc?.document_versions ?? [];
    const currentVer =
      versions.find((v: any) => v.is_current) ?? versions[versions.length - 1] ?? null;

    const stageId = stageDoc?.stage_id ?? proj.current_stage_id;
    const stageName =
      stageDoc?.defense_stages?.name ??
      (proj.current_stage_id ? "Assigned stage" : "No stage assigned");

    return {
      id: currentVer?.id ?? proj.id,
      projectId: proj.id,
      stageId: stageId ?? "",
      title: proj.title,
      studentName: resolveStudentName(proj.students),
      version: currentVer?.version_number ?? 0,
      submittedAt:
        currentVer?.created_at ?? proj.created_at ?? new Date().toISOString(),
      stage: stageName,
      reviewStatus: proj.status ?? "draft",
      score: resolveScoreCache(proj.project_score_cache),
      commentCount: currentVer?.annotation_count ?? 0,
      department: proj.departments?.name ?? "General",
      hasDocument: Boolean(currentVer),
    };
  });
}

export async function fetchSubmissions(
  supabase: SupabaseClient
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      title,
      status,
      academic_year,
      current_stage_id,
      created_at,
      departments ( name ),
      students (
        profiles ( first_name, last_name )
      ),
      documents (
        id,
        stage_id,
        defense_stages ( id, name, code ),
        document_versions (
          id,
          version_number,
          file_name,
          created_at,
          is_current
        )
      ),
      project_score_cache (
        avg_score,
        compliance_rate,
        readiness_level
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("fetchSubmissions", error);
    throw error;
  }
  if (!data) return [];

  const rows = mapProjectsToSubmissions(data);

  // Attach annotation counts per current version
  const versionIds = rows
    .filter((r) => r.hasDocument)
    .map((r) => r.id)
    .filter((id) => id && id.length === 36);

  if (versionIds.length > 0) {
    const { data: annCounts } = await supabase
      .from("annotations")
      .select("document_version_id")
      .in("document_version_id", versionIds);

    if (annCounts) {
      const countMap = annCounts.reduce<Record<string, number>>((acc, a) => {
        acc[a.document_version_id] = (acc[a.document_version_id] ?? 0) + 1;
        return acc;
      }, {});
      rows.forEach((r) => {
        if (r.hasDocument) {
          r.commentCount = countMap[r.id] ?? 0;
        }
      });
    }
  }

  return rows;
}

export interface ProjectLookupData {
  students: Array<{
    id: string;
    profile_id: string;
    profiles: { first_name: string; last_name: string } | null;
  }>;
  faculty: Array<{
    id: string;
    profile_id: string;
    profiles: { first_name: string; last_name: string } | null;
  }>;
  departments: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string; sequence_order: number }>;
}

export async function fetchProjectLookups(
  supabase: SupabaseClient
): Promise<ProjectLookupData> {
  const [studentsRes, facultyRes, deptRes, stageRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, profile_id, profiles(first_name, last_name)")
      .order("id"),
    supabase
      .from("faculty")
      .select("id, profile_id, profiles(first_name, last_name)")
      .order("id"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("defense_stages")
      .select("id, name, sequence_order")
      .eq("is_enabled", true)
      .order("sequence_order"),
  ]);

  if (studentsRes.error) {
    logSupabaseError("fetchProjectLookups.students", studentsRes.error);
    throw studentsRes.error;
  }
  if (facultyRes.error) {
    logSupabaseError("fetchProjectLookups.faculty", facultyRes.error);
    throw facultyRes.error;
  }
  if (deptRes.error) {
    logSupabaseError("fetchProjectLookups.departments", deptRes.error);
    throw deptRes.error;
  }
  if (stageRes.error) {
    logSupabaseError("fetchProjectLookups.defense_stages", stageRes.error);
    throw stageRes.error;
  }

  return {
    students: (studentsRes.data ?? []).map((s: any) => ({
      id: s.id,
      profile_id: s.profile_id,
      profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
    })),
    faculty: (facultyRes.data ?? []).map((f: any) => ({
      id: f.id,
      profile_id: f.profile_id,
      profiles: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles,
    })),
    departments: deptRes.data ?? [],
    stages: stageRes.data ?? [],
  };
}

export interface CreateProjectInput {
  title: string;
  studentId: string;
  facultyId: string;
  departmentId: string;
  stageId: string;
  campusId: string;
  academicYear?: string;
}

export async function createProject(
  supabase: SupabaseClient,
  input: CreateProjectInput
) {
  // Diagnostics: Before Insert
  console.log("PROJECT CREATION DIAGNOSTIC: Before Insert");
  console.log("PROJECT CREATION DIAGNOSTIC: Insert Payload", {
    campus_id: input.campusId,
    department_id: input.departmentId,
    student_id: input.studentId,
    title: input.title.trim(),
    current_stage_id: input.stageId,
    academic_year: input.academicYear ?? "2025-2026",
    status: "draft",
  });

  const { data, error } = await supabase
    .from("projects")
    .insert({
      campus_id: input.campusId,
      department_id: input.departmentId,
      student_id: input.studentId,
      title: input.title.trim(),
      current_stage_id: input.stageId,
      academic_year: input.academicYear ?? "2025-2026",
      status: "draft",
    })
    .select("id, title, current_stage_id")
    .single();

  if (error) {
    console.error("PROJECT CREATION DIAGNOSTIC: Insert Error", error);
    throw error;
  }

  console.log("PROJECT CREATION DIAGNOSTIC: Insert Result", data);

  // Link student as project member
  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", input.studentId)
    .single();

  if (student?.profile_id) {
    await supabase.from("project_members").upsert(
      {
        project_id: data.id,
        profile_id: student.profile_id,
        member_role: "student",
        is_primary: true,
      },
      { onConflict: "project_id,profile_id,member_role" }
    );
  }

  // Link faculty adviser as project member
  const { data: faculty } = await supabase
    .from("faculty")
    .select("profile_id")
    .eq("id", input.facultyId)
    .single();

  if (faculty?.profile_id) {
    await supabase.from("project_members").upsert(
      {
        project_id: data.id,
        profile_id: faculty.profile_id,
        member_role: "adviser",
        is_primary: true,
      },
      { onConflict: "project_id,profile_id,member_role" }
    );
  }

  return data;
}
