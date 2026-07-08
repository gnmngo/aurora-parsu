"use client";

import { useEffect, useState } from "react";
import { DefensePipeline } from "@/components/dashboard/defense-pipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { cn } from "@/lib/utils";
import { Loader2, Settings } from "lucide-react";

export default function DefensesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stages" | "calendar">("stages");
  const { roles } = useAuth();
  const supabase = createClient();
  const isCoordinator = roles.includes("coordinator") || roles.includes("sys_admin");

  // Fetch workflow templates list
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data } = await supabase
          .from("workflow_templates")
          .select("id, name, program_id, programs(name, departments(name))")
          .order("name");
        if (data && data.length > 0) {
          setTemplates(data);
          // Auto-select first template — no hardcoding
          setSelectedTemplateId((prev) => prev || data[0].id);
        }
      } catch (err) {
        console.error("Error loading workflow templates:", err);
      }
    }
    fetchTemplates();
  }, [supabase]);

  // Fetch stages dynamically based on template filter
  useEffect(() => {
    async function fetchStages() {
      setLoading(true);
      try {
        let query = supabase
          .from("defense_stages")
          .select("*")
          .order("sequence_order");

        if (selectedTemplateId) {
          query = query.eq("workflow_template_id", selectedTemplateId);
        }

        const { data: dbStages } = await query;
        if (!dbStages) return;

        const { data: docs } = await supabase.from("documents").select("stage_id");
        const { data: evals } = await supabase.from("evaluations").select("stage_id, status");

        const stagesData = dbStages.map((stage) => {
          const stageDocs = docs?.filter((d) => d.stage_id === stage.id) || [];
          const stageEvals = evals?.filter((e) => e.stage_id === stage.id && e.status === "submitted") || [];

          return {
            id: stage.id,
            code: stage.code,
            name: stage.name,
            sequence: stage.sequence_order,
            status: stageDocs.length > 0 ? "completed" : "current",
            completionPct: stageDocs.length > 0 ? 100 : 0,
            submissionCount: stageDocs.length,
            reviewCount: stageEvals.length,
          };
        });

        setStages(stagesData);
      } catch (err) {
        console.error("Error loading stages for defenses page:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStages();
  }, [supabase, selectedTemplateId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Defenses Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Monitor defense progress across dynamic stages workflows.
          </p>
        </div>
        
        <div className="flex gap-2 items-center print:hidden">
          {/* Workflow template selector */}
          <div className="flex items-center gap-1.5 mr-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-[10px] font-bold focus:outline-none cursor-pointer"
            >
          {templates.map((t) => {
                const department = (t.programs as any)?.departments?.name;
                const program = (t.programs as any)?.name;
                const label = department && program
                  ? `${program} — ${department}`
                  : t.name;
                return (
                  <option key={t.id} value={t.id}>{label}</option>
                );
              })}
            </select>
          </div>

          {isCoordinator && (
            <Link href="/dashboard/defenses/schedule">
              <Button className="rounded-xl h-9 text-xs">
                Schedule Defense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("stages")}
          className={cn(
            "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
            activeTab === "stages" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
          )}
        >
          Defense Stages
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
            activeTab === "calendar" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
          )}
        >
          Defense Calendar
        </button>
      </div>

      {activeTab === "stages" ? (
        <>
          <DefensePipeline templateId={selectedTemplateId} />

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No stages configured for this academic workflow template.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stages.map((stage) => (
                <Card key={stage.id} className="border border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                      {stage.name}
                    </CardTitle>
                    <Badge variant={stage.status === "completed" ? "success" : "info"} className="text-[9px] font-extrabold uppercase">
                      {stage.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-600">
                      <div>
                        <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Progress</dt>
                        <dd className="text-sm font-black text-slate-800">{stage.completionPct}%</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Uploads</dt>
                        <dd className="text-sm font-black text-slate-800">{stage.submissionCount}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground font-semibold uppercase text-[8px]">Reviews</dt>
                        <dd className="text-sm font-black text-slate-800">{stage.reviewCount}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <CalendarView userRole={roles[0] || "student"} />
      )}
    </div>
  );
}
