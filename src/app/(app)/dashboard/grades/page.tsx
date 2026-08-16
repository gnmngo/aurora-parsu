"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { Inbox, FileCheck, Award } from "lucide-react";
import { format } from "date-fns";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/hooks/use-auth";

/**
 * GradesPage — displays submitted evaluation score sheets.
 *
 * BUG-C2 fix: evaluations.panelist_id is the FK to profiles (not profile_id).
 *             Select `panelist_id` and join `profiles!panelist_id(...)`.
 *             Filter by `.eq("panelist_id", user.id)` for panelists.
 *
 * BUG-H2 fix: Use `rubric_templates.passing_score` for verdict threshold
 *             instead of the hardcoded value of 75.
 */

interface CriterionScore {
  id: string;
  name: string;
  weight: number;
}

interface EvaluationRow {
  id: string;
  total_score: number | null;
  recommendations: string | null;
  panel_notes: string | null;
  submitted_at: string | null;
  scores: Record<string, number> | null;
  panelist_id: string;
  project_id: string;
  projects: { id: string; title: string; student_id: string } | null;
  profiles: { first_name: string; last_name: string; email: string } | null;
  rubric_templates: { title: string; criteria: CriterionScore[]; passing_score: number } | null;
}

export default function GradesPage() {
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { user, roles } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function loadGrades() {
      try {
        const isCoordinatorOrAdmin = roles.some((r) =>
          ["coordinator", "sys_admin", "college_dean"].includes(r)
        );
        const isPanelist = roles.includes("panelist");
        const isStudent = roles.includes("student");
        const isAdviser = roles.includes("adviser");

        // BUG-C2: Use `panelist_id` (actual FK) — not `profile_id` (non-existent column)
        const baseQuery = supabase
          .from("evaluations")
          .select(`
            id,
            total_score,
            recommendations,
            panel_notes,
            submitted_at,
            scores,
            panelist_id,
            project_id,
            projects ( id, title, student_id ),
            profiles!panelist_id ( first_name, last_name, email ),
            rubric_templates ( title, criteria, passing_score )
          `)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false });

        if (isCoordinatorOrAdmin) {
          // Full access
          const { data, error } = await baseQuery;
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else if (isPanelist) {
          // BUG-C2: Filter by `panelist_id` not `profile_id`
          const { data, error } = await baseQuery.eq("panelist_id", user!.id);
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else if (isAdviser) {
          // Get projects where user is adviser member
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id)
            .eq("member_role", "adviser");

          const projectIds = (memberProjects || []).map((m: { project_id: string }) => m.project_id);
          if (projectIds.length === 0) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await baseQuery.in("project_id", projectIds);
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else if (isStudent) {
          // Get student record → project → evaluations for that project
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user!.id)
            .maybeSingle();

          if (!studentRecord) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data: project } = await supabase
            .from("projects")
            .select("id")
            .eq("student_id", studentRecord.id)
            .maybeSingle();

          if (!project) {
            setEvaluations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await baseQuery.eq("project_id", project.id);
          if (error) throw error;
          setEvaluations((data as unknown as EvaluationRow[]) || []);

        } else {
          setEvaluations([]);
        }
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setLoading(false);
      }
    }

    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roles.join(",")]);

  return (
    <RoleGuard allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "student", "college_dean"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Evaluation scores and rubric breakdown for submitted defenses
          </p>
        </div>

        {loading ? (
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
        ) : evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Evaluations Submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No grading sheets or rubric reviews have been finalized yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {evaluations.map((evalItem) => {
              const projectTitle = evalItem.projects?.title || "Unknown Project";
              const panelistName = evalItem.profiles
                ? `${evalItem.profiles.first_name} ${evalItem.profiles.last_name}`
                : "Unknown Panelist";
              const criteria: CriterionScore[] = evalItem.rubric_templates?.criteria || [];
              const scoresMap = evalItem.scores || {};
              const totalScore = Number(evalItem.total_score || 0);

              // BUG-H2: Use rubric's configurable passing_score instead of hardcoded 75
              const passingScore = Number(evalItem.rubric_templates?.passing_score ?? 75);
              const verdict = totalScore >= passingScore ? "PASSED" : "NEEDS REVISION";
              const verdictVariant: "success" | "warning" = totalScore >= passingScore ? "success" : "warning";

              return (
                <Card key={evalItem.id} className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <CardHeader className="bg-muted/30 border-b border-border pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{projectTitle}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                          Evaluated by {panelistName} • {evalItem.submitted_at ? format(new Date(evalItem.submitted_at), "MMM d, yyyy h:mm a") : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="font-black text-sm text-foreground">{totalScore.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                        <Badge variant={verdictVariant} className="text-xs py-1 px-3">
                          {verdict}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Rubric passing threshold info */}
                    {evalItem.rubric_templates && (
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        <FileCheck className="inline h-3 w-3 mr-1" />
                        Rubric: <span className="text-foreground">{evalItem.rubric_templates.title}</span>
                        {" · "}Passing threshold: <span className="text-foreground">{passingScore}</span>
                      </p>
                    )}

                    {criteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-semibold">No criteria details found for this evaluation.</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {criteria.map((c) => {
                          const score = Number(scoresMap[c.id] || 0);
                          return (
                            <div key={c.id} className="rounded-xl border border-border p-4 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-foreground">{c.name}</span>
                                <span className="font-bold text-sm">{score.toFixed(1)} / 100</span>
                              </div>
                              <Progress value={score} />
                              <p className="text-[10px] text-muted-foreground font-semibold">Weight: {c.weight}%</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(evalItem.recommendations || evalItem.panel_notes) && (
                      <div className="border-t border-border pt-4 grid gap-4 sm:grid-cols-2 text-xs font-semibold">
                        {evalItem.recommendations && (
                          <div>
                            <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-1">Recommendations</h4>
                            <p className="text-foreground/80 leading-relaxed">{evalItem.recommendations}</p>
                          </div>
                        )}
                        {evalItem.panel_notes && (
                          <div>
                            <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-1">Panel Notes</h4>
                            <p className="text-foreground/80 leading-relaxed">{evalItem.panel_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
