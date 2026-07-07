"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { Inbox, FileCheck } from "lucide-react";
import { format } from "date-fns";

export default function GradesPage() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadGrades() {
      try {
        const { data, error } = await supabase
          .from("evaluations")
          .select(`
            id,
            total_score,
            recommendations,
            panel_notes,
            submitted_at,
            scores,
            projects ( title ),
            profiles ( first_name, last_name, email ),
            rubric_templates ( title, criteria )
          `)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        if (data) {
          setEvaluations(data);
        }
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGrades();
  }, [supabase]);

  return (
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
            const criteria = evalItem.rubric_templates?.criteria || [];
            const scoresMap = evalItem.scores || {};

            return (
              <Card key={evalItem.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">{projectTitle}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Evaluated by {panelistName} • Submitted {format(new Date(evalItem.submitted_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Badge variant="success" className="text-base py-1 px-3 self-start sm:self-auto">
                      Score: {Number(evalItem.total_score).toFixed(1)} / 100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {criteria.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No criteria details found for this evaluation.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {criteria.map((c: any) => {
                        const score = Number(scoresMap[c.id] || 0);
                        return (
                          <div key={c.id} className="rounded-xl border border-border p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm">{c.name}</span>
                              <span className="font-bold text-sm">{score.toFixed(1)} / 100</span>
                            </div>
                            <Progress value={score} />
                            <p className="text-[10px] text-muted-foreground">Weight: {c.weight}%</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(evalItem.recommendations || evalItem.panel_notes) && (
                    <div className="border-t border-border pt-4 grid gap-4 sm:grid-cols-2 text-sm">
                      {evalItem.recommendations && (
                        <div>
                          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Recommendations</h4>
                          <p className="text-muted-foreground">{evalItem.recommendations}</p>
                        </div>
                      )}
                      {evalItem.panel_notes && (
                        <div>
                          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Panel Notes</h4>
                          <p className="text-muted-foreground">{evalItem.panel_notes}</p>
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
  );
}
