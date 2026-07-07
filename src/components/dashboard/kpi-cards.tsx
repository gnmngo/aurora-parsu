"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Card, CardContent } from "@/components/ui/card";

const icons = [FileText, Clock, CheckCircle2, TrendingUp, MessageSquare];

export function KpiCards() {
  const [stats, setStats] = useState([
    { label: "Submitted Papers", value: 0 },
    { label: "Pending Reviews", value: 0 },
    { label: "Completed Defenses", value: 0 },
    { label: "Average Score", value: 0.0 },
    { label: "Total Annotations", value: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuthReady();
  const supabase = createClient();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    async function fetchKpis() {
      try {
        const { count: papers } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true });
        
        const { count: pending } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "under_review");
        
        const { count: completed } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed");
        
        const { data: cacheData } = await supabase
          .from("project_score_cache")
          .select("avg_score");

        const avgScore =
          cacheData && cacheData.length > 0
            ? cacheData.reduce((sum, c) => sum + Number(c.avg_score || 0), 0) /
              cacheData.length
            : 0.0;
          
        const { count: annotations } = await supabase
          .from("annotations")
          .select("*", { count: "exact", head: true });

        setStats([
          { label: "Submitted Papers", value: papers || 0 },
          { label: "Pending Reviews", value: pending || 0 },
          { label: "Completed Defenses", value: completed || 0 },
          { label: "Average Score", value: avgScore },
          { label: "Total Annotations", value: annotations || 0 },
        ]);
      } catch (err) {
        logSupabaseError("KpiCards.fetchKpis", err);
      } finally {
        setLoading(false);
      }
    }
    fetchKpis();
  }, [isReady, supabase]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, i) => {
        const Icon = icons[i];
        const isScore = stat.label === "Average Score";

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <Card className="group cursor-default">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
                    <Icon className="h-5 w-5 text-foreground group-hover:text-primary" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight">
                  {isScore ? stat.value.toFixed(1) : stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
