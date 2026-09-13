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
  Plus,
  Shield,
  Layers
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export function CoordinatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pendingUserCount, setPendingUserCount] = useState(0);
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
          .is("archived_at", null)
          .eq("status", "submitted");
        if (pending) setPendingApprovals(pending);

        // 2. Fetch defense schedules
        const { data: scheds } = await supabase
          .from("defense_schedules")
          .select("*, projects(title, archived_at)")
          .order("scheduled_at", { ascending: true })
          .limit(10);
        if (scheds) {
          setSchedules(scheds.filter((s: any) => !s.projects?.archived_at));
        }

        // 3. Fetch all active projects for status stats
        const { data: allProjs } = await supabase
          .from("projects")
          .select("status")
          .is("archived_at", null);
        
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

        // 5. Fetch count of pending accounts for security console
        const { count: pendingCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");

        if (pendingCount !== null) {
          setPendingUserCount(pendingCount);
        }
      } catch (err) {
        console.error("Error loading coordinator dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCoordinatorData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-800">
      {/* Coordinator Management Hub & Security Console Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-2xl border border-primary/20">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Coordinator Management Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oversee defense milestones, schedule committee panels, and manage departmental faculty evaluators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button size="sm" className="gap-2 font-bold shadow-sm">
              <Users className="h-4 w-4" />
              User Management &amp; Security Console
              {pendingUserCount > 0 && (
                <Badge variant="warning" className="ml-1 text-[9px] px-1.5 py-0.5">
                  {pendingUserCount} Pending
                </Badge>
              )}
            </Button>
          </Link>
          <Link href="/dashboard/defenses/schedule">
            <Button size="sm" variant="outline" className="gap-1.5 font-bold">
              <Calendar className="h-4 w-4" />
              Schedule Defense
            </Button>
          </Link>
          <Link href="/admin/stages">
            <Button size="sm" variant="outline" className="gap-1.5 font-bold border-border">
              <Layers className="h-4 w-4 text-primary" />
              Defense Stages
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI stats bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Link href="/dashboard/defenses" className="block no-underline">
          <Card className="p-4 flex flex-row items-center gap-4 cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.in_progress || 0}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors">Active Projects &rarr;</p>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/defenses/schedule" className="block no-underline">
          <Card className="p-4 flex flex-row items-center gap-4 cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{pendingApprovals.length}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors">Topic Submissions &rarr;</p>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/defenses" className="block no-underline">
          <Card className="p-4 flex flex-row items-center gap-4 cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{schedules.length}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors">Scheduled Defenses &rarr;</p>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/grades" className="block no-underline">
          <Card className="p-4 flex flex-row items-center gap-4 cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <BarChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.passed || 0}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors">Completed Papers &rarr;</p>
            </div>
          </Card>
        </Link>
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
                <BarChart className="h-4 w-4 text-primary" /> Faculty Workload Summary
              </CardTitle>
              <Link href="/dashboard/defenses/schedule">
                <span className="text-[10px] text-primary font-bold hover:underline cursor-pointer">
                  Schedule New Panel &rarr;
                </span>
              </Link>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
              <Calendar className="h-4 w-4 text-primary" /> Upcoming Defense Calendar
            </CardTitle>
            <Link href="/dashboard/defenses">
              <span className="text-[10px] text-primary font-bold hover:underline cursor-pointer">
                View All &rarr;
              </span>
            </Link>
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
                  <Link
                    key={sched.id}
                    href="/dashboard/defenses"
                    className="block p-4 text-xs space-y-1 hover:bg-muted/50 transition-colors group cursor-pointer no-underline"
                  >
                    <p className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                      "{sched.projects?.title}"
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {new Date(sched.scheduled_at).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[10px] text-primary font-bold">
                        Room: {sched.room || "TBA"}
                      </p>
                      <span className="text-[10px] text-primary group-hover:underline font-bold">
                        Manage &rarr;
                      </span>
                    </div>
                  </Link>
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
