"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Inbox } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function StagesPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadStages() {
      try {
        const { data, error } = await supabase
          .from("defense_stages")
          .select("*")
          .order("sequence_order");

        if (error) throw error;
        if (data) {
          setStages(data);
        }
      } catch (err) {
        console.error("Error loading stages:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStages();
  }, [supabase]);

  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Defense Stages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure defense stage requirements and sequencing
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Defense Stages Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No defense stages are configured in the database.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage) => (
            <Card key={stage.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Stage {stage.sequence_order}: {stage.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Code: {stage.code}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={stage.is_enabled ? "success" : "secondary"}>
                    {stage.is_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold">Description</p>
                    <p className="text-foreground mt-0.5">{stage.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Required Documents</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stage.required_documents?.map((doc: string) => (
                        <Badge key={doc} variant="outline" className="text-[10px]">
                          {doc}
                        </Badge>
                      )) || "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
