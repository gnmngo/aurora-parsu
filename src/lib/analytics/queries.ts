import type { SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseError } from "@/lib/supabase/errors";

export interface SubmissionTrendPoint {
  month: string;
  submissions: number;
  defenses: number;
}

export interface SuccessRateSlice {
  name: string;
  value: number;
  color: string;
}

export interface CollegeComparisonPoint {
  college: string;
  avgScore: number;
  defenses: number;
}

export interface ReviewerActivityPoint {
  name: string;
  reviews: number;
  annotations: number;
}

export interface DepartmentComparisonPoint {
  department: string;
  avgScore: number;
}

export interface FacultyWorkloadPoint {
  name: string;
  workload: number;
}

export interface RevisionCountPoint {
  title: string;
  count: number;
}

export interface AnalyticsDataset {
  submissionTrends: SubmissionTrendPoint[];
  successRate: SuccessRateSlice[];
  collegeComparison: CollegeComparisonPoint[];
  reviewerActivity: ReviewerActivityPoint[];
  departmentComparison: DepartmentComparisonPoint[];
  facultyWorkload: FacultyWorkloadPoint[];
  revisionCount: RevisionCountPoint[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(date: Date): string {
  return MONTH_LABELS[date.getMonth()];
}

export async function fetchAnalyticsData(
  supabase: SupabaseClient
): Promise<AnalyticsDataset> {
  const empty: AnalyticsDataset = {
    submissionTrends: [],
    successRate: [],
    collegeComparison: [],
    reviewerActivity: [],
    departmentComparison: [],
    facultyWorkload: [],
    revisionCount: [],
  };

  try {
    const [versionsRes, evalsRes, projectsRes, annotationsRes] =
      await Promise.all([
        supabase
          .from("document_versions")
          .select("created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("evaluations")
          .select("project_id, total_score, verdict_code, status, panelist_id, submitted_at")
          .eq("status", "submitted"),
        supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            final_verdict,
            department_id,
            departments (
              name,
              college_id,
              colleges ( code, name )
            )
          `),
        supabase
          .from("annotations")
          .select("id, created_by, document_version_id, document_versions(document_id, documents(id, title))"),
      ]);

    // Submission trends (last 6 months)
    const trendMap = new Map<string, { submissions: number; defenses: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(monthKey(d), { submissions: 0, defenses: 0 });
    }

    versionsRes.data?.forEach((v) => {
      const key = monthKey(new Date(v.created_at));
      if (trendMap.has(key)) {
        trendMap.get(key)!.submissions += 1;
      }
    });

    evalsRes.data?.forEach((e) => {
      if (!e.submitted_at) return;
      const key = monthKey(new Date(e.submitted_at));
      if (trendMap.has(key)) {
        trendMap.get(key)!.defenses += 1;
      }
    });

    const submissionTrends = Array.from(trendMap.entries()).map(
      ([month, counts]) => ({ month, ...counts })
    );

    // Success rate
    const projects = projectsRes.data || [];
    let passed = 0;
    let withRevisions = 0;
    let failed = 0;

    projects.forEach((p: any) => {
      const v = (p.final_verdict || "").toLowerCase();
      if (v.includes("fail")) failed++;
      else if (v.includes("revision") || v.includes("minor") || v.includes("major"))
        withRevisions++;
      else if (v.includes("pass") || p.status === "archived") passed++;
    });

    if (passed + withRevisions + failed === 0 && evalsRes.data?.length) {
      evalsRes.data.forEach((e) => {
        const v = (e.verdict_code || "").toLowerCase();
        if (v === "failed") failed++;
        else if (v.includes("revision")) withRevisions++;
        else passed++;
      });
    }

    const totalVerdicts = passed + withRevisions + failed;
    const successRate: SuccessRateSlice[] =
      totalVerdicts === 0
        ? []
        : [
            { name: "Passed", value: Math.round((passed / totalVerdicts) * 100), color: "#22C55E" },
            { name: "With Revisions", value: Math.round((withRevisions / totalVerdicts) * 100), color: "#F59E0B" },
            { name: "Failed", value: Math.round((failed / totalVerdicts) * 100), color: "#EF4444" },
          ].filter((s) => s.value > 0);

    // College & Department comparisons
    const collegeScores = new Map<string, { total: number; count: number; defenses: number }>();
    const deptScores = new Map<string, { total: number; count: number }>();
    const projectInfoMap = new Map<string, { college: string; dept: string }>();

    projects.forEach((p: any) => {
      const colCode = p.departments?.colleges?.code || "Unknown";
      const deptName = p.departments?.name || "Unknown Department";
      projectInfoMap.set(p.id, { college: colCode, dept: deptName });

      if (!collegeScores.has(colCode)) {
        collegeScores.set(colCode, { total: 0, count: 0, defenses: 0 });
      }
      collegeScores.get(colCode)!.defenses += 1;
    });

    evalsRes.data?.forEach((e) => {
      const info = projectInfoMap.get(e.project_id);
      if (info) {
        // College score
        const colEntry = collegeScores.get(info.college)!;
        colEntry.total += Number(e.total_score || 0);
        colEntry.count += 1;

        // Department score
        if (!deptScores.has(info.dept)) {
          deptScores.set(info.dept, { total: 0, count: 0 });
        }
        const deptEntry = deptScores.get(info.dept)!;
        deptEntry.total += Number(e.total_score || 0);
        deptEntry.count += 1;
      }
    });

    const collegeComparison: CollegeComparisonPoint[] = Array.from(
      collegeScores.entries()
    ).map(([college, stats]) => ({
      college,
      avgScore: stats.count > 0 ? Number((stats.total / stats.count).toFixed(1)) : 0,
      defenses: stats.defenses,
    }));

    const departmentComparison: DepartmentComparisonPoint[] = Array.from(
      deptScores.entries()
    ).map(([department, stats]) => ({
      department,
      avgScore: stats.count > 0 ? Number((stats.total / stats.count).toFixed(1)) : 0,
    }));

    // Reviewer activity & Faculty Workloads
    const reviewerMap = new Map<string, { reviews: number; annotations: number }>();
    evalsRes.data?.forEach((e) => {
      if (!e.panelist_id) return;
      if (!reviewerMap.has(e.panelist_id)) {
        reviewerMap.set(e.panelist_id, { reviews: 0, annotations: 0 });
      }
      reviewerMap.get(e.panelist_id)!.reviews += 1;
    });

    annotationsRes.data?.forEach((a) => {
      if (!a.created_by) return;
      if (!reviewerMap.has(a.created_by)) {
        reviewerMap.set(a.created_by, { reviews: 0, annotations: 0 });
      }
      reviewerMap.get(a.created_by)!.annotations += 1;
    });

    const reviewerIds = Array.from(reviewerMap.keys());
    let reviewerActivity: ReviewerActivityPoint[] = [];
    let facultyWorkload: FacultyWorkloadPoint[] = [];

    if (reviewerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", reviewerIds);

      reviewerActivity = reviewerIds.map((id) => {
        const profile = profiles?.find((p) => p.id === id);
        const stats = reviewerMap.get(id)!;
        return {
          name: profile ? `${profile.first_name} ${profile.last_name}` : "Faculty",
          reviews: stats.reviews,
          annotations: stats.annotations,
        };
      });

      facultyWorkload = reviewerIds.map((id) => {
        const profile = profiles?.find((p) => p.id === id);
        const stats = reviewerMap.get(id)!;
        return {
          name: profile ? `${profile.first_name} ${profile.last_name}` : "Faculty",
          workload: stats.reviews,
        };
      });
    }

    // Revision counts per project
    const projectRevisions = new Map<string, { title: string; count: number }>();
    annotationsRes.data?.forEach((a: any) => {
      const projId = a.document_versions?.documents?.id;
      const projTitle = a.document_versions?.documents?.title;
      if (projId && projTitle) {
        if (!projectRevisions.has(projId)) {
          projectRevisions.set(projId, { title: projTitle, count: 0 });
        }
        projectRevisions.get(projId)!.count += 1;
      }
    });

    const revisionCount: RevisionCountPoint[] = Array.from(
      projectRevisions.values()
    ).map((r) => ({
      title: r.title,
      count: r.count,
    })).slice(0, 5);

    return {
      submissionTrends,
      successRate,
      collegeComparison,
      reviewerActivity,
      departmentComparison,
      facultyWorkload,
      revisionCount,
    };
  } catch (err) {
    logSupabaseError("fetchAnalyticsData", err);
    return empty;
  }
}
