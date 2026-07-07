"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, GraduationCap, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WelcomeCard() {
  const { profile, isLoading } = useAuth();
  const { isReady } = useAuthReady();
  const [currentStage, setCurrentStage] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    async function fetchCurrentStage() {
      try {
        const { data, error } = await supabase
          .from("defense_stages")
          .select("*")
          .order("sequence_order")
          .limit(1)
          .single();
        if (error) {
          logSupabaseError("WelcomeCard.defense_stages", error);
          return;
        }
        if (data) {
          setCurrentStage(data);
        }
      } catch (err) {
        logSupabaseError("WelcomeCard.fetchCurrentStage", err);
      }
    }
    fetchCurrentStage();
  }, [isReady, supabase]);

  if (isLoading || !profile) {
    return (
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  const collegeName = (profile as any).colleges?.name || "College of Science";
  const departmentName = (profile as any).departments?.name || "General Department";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-md">
        <CardContent className="relative p-6">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 right-20 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/70">Welcome back,</p>
              <h2 className="text-2xl font-bold tracking-tight">
                {profile.first_name} {profile.last_name}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-white/15 text-white hover:bg-white/20">
                  <Building2 className="mr-1 h-3 w-3" />
                  {collegeName}
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {departmentName}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="text-right">
                <p className="text-xs text-white/60">Current Stage</p>
                <p className="text-lg font-semibold">
                  {currentStage?.name ?? "No active stage"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="bg-warning/20 text-warning">
                  Under Review
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
