"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Building2, Shield, BookOpen, Layers } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { createClient } from "@/lib/supabase/client";
import { logSupabaseError } from "@/lib/supabase/errors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WelcomeCard() {
  const { profile, roles, isLoading } = useAuth();
  const { isReady } = useAuthReady();
  const [projectInfo, setProjectInfo] = useState<{
    title?: string;
    stageName?: string;
    status?: string;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isReady || !profile) return;

    async function fetchUserContext() {
      try {
        const isStudent = roles.includes("student");
        if (isStudent) {
          // Check project_members first
          const { data: memberRows } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", profile!.id)
            .limit(1);

          const memberProjId = memberRows?.[0]?.project_id;

          let query = supabase
            .from("projects")
            .select(`
              title, status,
              defense_stages ( name )
            `);

          if (memberProjId) {
            query = query.eq("id", memberProjId);
          } else {
            // lookup via students
            const { data: std } = await supabase
              .from("students")
              .select("id")
              .eq("profile_id", profile!.id)
              .maybeSingle();

            if (std?.id) {
              query = query.eq("student_id", std.id);
            } else {
              setProjectInfo(null);
              return;
            }
          }

          const { data: proj } = await query.maybeSingle();
          if (proj) {
            setProjectInfo({
              title: proj.title,
              stageName: (proj.defense_stages as any)?.name || "Not Assigned",
              status: (proj.status || "draft").replace(/_/g, " "),
            });
          }
        }
      } catch (err) {
        logSupabaseError("WelcomeCard.fetchUserContext", err);
      }
    }

    fetchUserContext();
  }, [isReady, profile, roles, supabase]);

  if (isLoading || !profile) {
    return (
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  const collegeName = (profile as any).colleges?.name || "Partido State University";
  const departmentName = (profile as any).departments?.name || "Academic Programs";
  const roleName = (roles[0] || "User").replace(/_/g, " ");

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
                <Badge className="bg-white/15 text-white hover:bg-white/20 capitalize font-bold">
                  <Shield className="mr-1 h-3 w-3" />
                  {roleName}
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20 font-medium">
                  <Building2 className="mr-1 h-3 w-3" />
                  {collegeName}
                </Badge>
                <Badge className="bg-white/15 text-white hover:bg-white/20 font-medium">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {departmentName}
                </Badge>
              </div>
            </div>

            {projectInfo ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="sm:text-right">
                  <p className="text-[11px] text-white/60 uppercase font-bold tracking-wider">Active Stage</p>
                  <p className="text-base font-black flex items-center gap-1.5 sm:justify-end">
                    <Layers className="h-4 w-4" />
                    {projectInfo.stageName}
                  </p>
                </div>
                <div>
                  <Badge variant="warning" className="bg-white/20 text-white font-bold capitalize">
                    {projectInfo.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 sm:items-end">
                <p className="text-[11px] text-white/60 uppercase font-bold tracking-wider">System Status</p>
                <Badge className="bg-emerald-500/30 text-white font-bold border border-emerald-400/30">
                  AURORA Online
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
