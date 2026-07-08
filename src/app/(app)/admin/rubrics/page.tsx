"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  Inbox, 
  Layers, 
  Copy, 
  Plus, 
  Send, 
  Archive, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { 
  cloneRubricAction,
  versionRubricAction,
  publishRubricAction,
  toggleActiveRubricAction,
  archiveRubricAction,
  deleteRubricAction
} from "@/lib/rubrics/actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const supabase = createClient();

  const loadRubrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rubric_templates")
        .select(`
          id,
          title,
          criteria,
          passing_score,
          excellent_score,
          target_compliance_rate,
          min_compliance_rate,
          max_major_unresolved,
          is_published,
          is_active,
          is_archived,
          version,
          parent_template_id,
          projects ( title )
        `)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setRubrics(data);
      }
    } catch (err) {
      console.error("Error loading rubrics:", err);
      toast.error("Failed to load rubrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRubrics();
  }, [supabase]);

  const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    setLoading(true);
    try {
      await actionFn();
      toast.success(successMsg);
      loadRubrics();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Operation failed.");
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rubrics Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage configured grading criteria, publish changes, clone layouts, and version templates.
          </p>
        </div>
      </div>

      {loading && rubrics.length === 0 ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Custom Rubrics Defined</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No grading rubrics have been configured in the database yet. Go to Submissions to define a rubric.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {rubrics.map((rubric) => {
            const projectTitle = rubric.projects?.title || "No project bound";
            const criteria = rubric.criteria || [];
            
            return (
              <Card key={rubric.id}>
                <CardHeader className="border-b border-border bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold text-slate-900">{rubric.title}</CardTitle>
                        <Badge variant="outline" className="text-[8px] font-extrabold uppercase">
                          v{rubric.version || 1}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Project: {projectTitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {rubric.is_published ? (
                        <Badge variant="success" className="text-[8px] font-extrabold uppercase">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] font-extrabold uppercase">Draft</Badge>
                      )}
                      {rubric.is_active ? (
                        <Badge variant="info" className="text-[8px] font-extrabold uppercase">Active</Badge>
                      ) : (
                        <Badge variant="warning" className="text-[8px] font-extrabold uppercase">Inactive</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 print:hidden text-[10px]">
                      {!rubric.is_published && (
                        <Button 
                          onClick={() => handleAction(() => publishRubricAction(rubric.id), "Rubric published successfully!")}
                          size="sm" 
                          className="h-8 gap-1 rounded-lg"
                        >
                          <Send className="h-3.5 w-3.5" /> Publish
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleAction(() => cloneRubricAction(rubric.id), "Rubric cloned successfully!")}
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 rounded-lg"
                      >
                        <Copy className="h-3.5 w-3.5" /> Clone
                      </Button>
                      <Button 
                        onClick={() => handleAction(() => versionRubricAction(rubric.id), "New version created successfully!")}
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 rounded-lg"
                      >
                        <Plus className="h-3.5 w-3.5" /> New Version
                      </Button>
                      <Button 
                        onClick={() => handleAction(() => toggleActiveRubricAction(rubric.id, !rubric.is_active), `Rubric ${rubric.is_active ? 'deactivated' : 'activated'} successfully!`)}
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 rounded-lg"
                      >
                        {rubric.is_active ? <XCircle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        {rubric.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button 
                        onClick={() => handleAction(() => archiveRubricAction(rubric.id), "Rubric archived successfully!")}
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 rounded-lg"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                      <Button 
                        onClick={() => handleAction(() => deleteRubricAction(rubric.id), "Rubric removed successfully!")}
                        variant="danger" 
                        size="sm" 
                        className="h-8 gap-1 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                    <div>Passing Score: <span className="font-semibold text-foreground">{Number(rubric.passing_score).toFixed(0)}</span></div>
                    <div>Excellent Score: <span className="font-semibold text-foreground">{Number(rubric.excellent_score).toFixed(0)}</span></div>
                    <div>Min Compliance: <span className="font-semibold text-foreground">{Number(rubric.min_compliance_rate).toFixed(0)}%</span></div>
                    <div>Max Major Errors: <span className="font-semibold text-foreground">{rubric.max_major_unresolved}</span></div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {criteria.map((c: any, index: number) => (
                      <div
                        key={c.id || index}
                        className="flex items-center justify-between rounded-xl border border-border p-4 bg-card"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-800">{c.name}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span className="text-muted-foreground">Weight: {c.weight}%</span>
                          <span className="font-bold text-slate-700">Max: 100</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
