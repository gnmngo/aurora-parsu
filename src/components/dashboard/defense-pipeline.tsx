"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DefensePipelineProps {
  templateId?: string;
}

export function DefensePipeline({ templateId }: DefensePipelineProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [localTemplateId, setLocalTemplateId] = useState<string>(
    templateId && templateId !== "all" ? templateId : "70000000-0000-0000-0000-000000000001"
  );
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuthReady();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (templateId && templateId !== "all") {
      setLocalTemplateId(templateId);
    }
  }, [templateId]);

  useEffect(() => {
    if (!isReady) return;

    async function loadTemplatesAndStages() {
      try {
        setLoading(true);
        const { data: tplData } = await supabase
          .from("workflow_templates")
          .select("id, name, programs(code, name), colleges(code, name)")
          .order("name");

        if (tplData && tplData.length > 0) {
          setTemplates(tplData);
        }

        const effectiveTemplateId =
          templateId && templateId !== "all"
            ? templateId
            : localTemplateId || tplData?.[0]?.id || "70000000-0000-0000-0000-000000000001";

        let query = supabase
          .from("defense_stages")
          .select("*")
          .eq("is_enabled", true)
          .order("sequence_order");

        if (effectiveTemplateId) {
          query = query.eq("workflow_template_id", effectiveTemplateId);
        }

        const { data: dbStages } = await query;

        if (!dbStages) return;

        const stageIds = dbStages.map((s) => s.id);
        const [docsRes, evalsRes] = await Promise.all([
          stageIds.length > 0
            ? supabase.from("documents").select("stage_id").in("stage_id", stageIds)
            : Promise.resolve({ data: [] }),
          stageIds.length > 0
            ? supabase.from("evaluations").select("stage_id, status").in("stage_id", stageIds)
            : Promise.resolve({ data: [] }),
        ]);

        const docs = docsRes.data || [];
        const evals = evalsRes.data || [];

        const stagesData = dbStages.map((stage) => {
          const stageDocs = docs.filter((d) => d.stage_id === stage.id);
          const stageEvals = evals.filter((e) => e.stage_id === stage.id && e.status === "submitted");

          return {
            id: stage.id,
            code: stage.code,
            name: stage.name,
            sequence: stage.sequence_order,
            status: stageDocs.length > 0 ? "completed" : "current",
            completionPct: stageDocs.length > 0 ? 100 : 0,
            submissionCount: stageDocs.length,
            reviewCount: stageEvals.length,
            deadline: null,
          };
        });

        setStages(stagesData);
      } catch (err) {
        logSupabaseError("DefensePipeline.fetchStages", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplatesAndStages();
  }, [isReady, supabase, templateId, localTemplateId]);

  if (loading && stages.length === 0) {
    return (
      <Card className="h-64 animate-pulse bg-muted/30" />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Defense Pipeline
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track progress across customized college &amp; program defense stages
          </p>
        </div>

        {(!templateId || templateId === "all") && templates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Workflow:</span>
            <select
              value={localTemplateId}
              onChange={(e) => setLocalTemplateId(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {templates.map((t) => {
                const prog = Array.isArray(t.programs) ? t.programs[0] : t.programs;
                const col = Array.isArray(t.colleges) ? t.colleges[0] : t.colleges;
                const prefix = prog?.code || col?.code;
                return (
                  <option key={t.id} value={t.id}>
                    {prefix ? `[${prefix}] ${t.name}` : t.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-border lg:block" />

          <div
            className={cn(
              "grid gap-4",
              stages.length === 3 ? "lg:grid-cols-3" : stages.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"
            )}
          >
            {stages.map((stage, i) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <div
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-200",
                    stage.status === "completed" &&
                      "border-success/30 bg-success/5",
                    stage.status === "current" &&
                      "border-info/40 bg-info/5 shadow-md ring-2 ring-info/20",
                    stage.status === "pending" && "border-border bg-muted/30"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        stage.status === "completed" && "bg-success text-white",
                        stage.status === "current" && "bg-info text-white",
                        stage.status === "pending" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {stage.status === "completed" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <Badge
                      variant={
                        stage.status === "completed"
                          ? "success"
                          : "info"
                      }
                    >
                      {stage.status}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold">{stage.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stage {stage.sequence}
                  </p>

                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{stage.completionPct}%</span>
                    </div>
                    <Progress value={stage.completionPct} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Submissions</p>
                      <p className="font-semibold">{stage.submissionCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reviews</p>
                      <p className="font-semibold">{stage.reviewCount}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
