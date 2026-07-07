"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  BarChart, 
  Inbox, 
  Loader2, 
  ChevronRight, 
  Plus
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export function CoordinatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => {
    async function loadCoordinatorData() {
      try {
        // 1. Fetch pending approvals (projects in submitted state)
        const { data: pending } = await supabase
          .from("projects")
          .select(`
            id,
            title,
            status,
            defense_stages ( name, id ),
            students ( profiles ( first_name, last_name ) )
          `)
          .eq("status", "submitted");
        if (pending) setPendingApprovals(pending);

        // 2. Fetch defense schedules
        const { data: scheds } = await supabase
          .from("defense_schedules")
          .select("*, projects(title)")
          .order("scheduled_at", { ascending: true })
          .limit(10);
        if (scheds) setSchedules(scheds);

        // 3. Fetch all projects for status stats
        const { data: allProjs } = await supabase
          .from("projects")
          .select("status");
        
        if (allProjs) {
          const counts: Record<string, number> = {};
          allProjs.forEach((p: any) => {
            counts[p.status] = (counts[p.status] || 0) + 1;
          });
          setStats(counts);
        }

        // 4. Fetch faculty workload (defense panels counts)
        const { data: panels } = await supabase
          .from("defense_panels")
          .select("profile_id, profiles(first_name, last_name)");

        if (panels) {
          const countsMap: Record<string, { name: string; count: number }> = {};
          panels.forEach((p: any) => {
            const name = p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : "Unknown Faculty";
            if (!countsMap[p.profile_id]) {
              countsMap[p.profile_id] = { name, count: 0 };
            }
            countsMap[p.profile_id].count += 1;
          });
          setWorkloads(Object.values(countsMap).sort((a, b) => b.count - a.count));
        }

      } catch (err) {
        console.error("Error loading coordinator dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCoordinatorData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* KPI stats bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.in_progress || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Active Projects</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{pendingApprovals.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Topic Submissions</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{schedules.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Scheduled Defenses</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-row items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <BarChart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.passed || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Completed Papers</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Submissions approval table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <FileText className="h-4 w-4 text-primary" /> Topic Registration Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-30 mb-2" />
                  <p>No new topic registrations submitted.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingApprovals.map((p) => {
                    const name = p.students?.profiles
                      ? `${p.students.profiles.first_name} ${p.students.profiles.last_name}`
                      : "Unknown Student";
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 text-xs font-semibold">
                        <div>
                          <p className="text-slate-900 text-sm">Student: {name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">"{p.title}"</p>
                          <Badge variant="info" className="text-[8px] font-extrabold uppercase mt-1">
                            {p.defense_stages?.name}
                          </Badge>
                        </div>
                        <Link href="/dashboard/defenses/schedule">
                          <Button size="sm" className="h-8 text-[11px] rounded-lg">
                            Evaluate
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workload widget */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <BarChart className="h-4 w-4 text-primary" /> Faculty Workload Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {workloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-30 mb-2" />
                  <p>No panel evaluation assignments logged.</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-60 overflow-y-auto">
                  {workloads.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 text-xs font-semibold">
                      <span className="text-slate-800">{w.name}</span>
                      <Badge variant={w.count > 5 ? "danger" : "secondary"} className="text-[9px]">
                        {w.count} Assigned Papers
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Defenses Calendar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
              <Calendar className="h-4 w-4 text-primary" /> Upcoming Defense Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                <Calendar className="h-8 w-8 opacity-30 mb-2" />
                <p>No defense timeslots scheduled.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {schedules.map((sched) => (
                  <div key={sched.id} className="p-4 text-xs space-y-1">
                    <p className="font-bold text-slate-900 truncate">"{sched.projects?.title}"</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {new Date(sched.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-primary font-bold">
                      Room: {sched.room}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed at bottom */}
      <div className="pt-2">
        <ActivityFeed />
      </div>
    </div>
  );
}
