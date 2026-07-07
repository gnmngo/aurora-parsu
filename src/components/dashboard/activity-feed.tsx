"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Activity, Clock, User, HardDrive } from "lucide-react";

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadActivities() {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) {
          setActivities(data);
        }
      } catch (err) {
        console.error("Error loading activity feed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();

    // Subscribe to realtime audit_logs channel for live feed!
    const channel = supabase
      .channel("live_activity_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        setActivities((prev) => [payload.new, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
        Loading live activity feed...
      </div>
    );
  }

  return (
    <Card className="border border-border/80 shadow-md text-xs font-semibold text-slate-800">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
          <Activity className="h-4 w-4 text-primary" /> Live Activity Feed
        </CardTitle>
        <CardDescription className="text-[10px]">
          Chronological system actions, reviews uploads, and scheduling validations in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 p-0 max-h-[350px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs italic">
            No system actions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((act) => (
              <div key={act.id} className="p-4 hover:bg-slate-50/50 transition-colors flex gap-3">
                <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0 h-fit mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-slate-900 leading-snug">
                    {act.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 items-center text-[9px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {act.user_email}</span>
                    <span>•</span>
                    <span className="font-mono">{new Date(act.created_at).toLocaleTimeString()}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[8px] font-extrabold uppercase px-1.5">{act.module}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
