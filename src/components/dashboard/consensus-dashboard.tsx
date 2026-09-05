"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Users, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ConsensusDashboardProps {
  projectId: string;
}

export function ConsensusDashboard({ projectId }: ConsensusDashboardProps) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadConsensusData() {
      try {
        const { data, error } = await supabase
          .from("evaluations")
          .select("*, profiles(first_name, last_name)")
          .eq("project_id", projectId)
          .order("signed_at", { ascending: false });

        if (error) throw error;
        
        // Filter latest signed evaluation per panelist to satisfy "Only latest signed evaluation version counts"
        const latestEvalsMap = new Map<string, any>();
        data?.forEach((ev: any) => {
          if (ev.status === "submitted" && !latestEvalsMap.has(ev.panelist_id)) {
            latestEvalsMap.set(ev.panelist_id, ev);
          }
        });

        setEvaluations(Array.from(latestEvalsMap.values()));
      } catch (err) {
        console.error("Error loading consensus statistics:", err);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadConsensusData();
    }
  }, [supabase, projectId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-xs text-muted-foreground animate-pulse">Calculating panel consensus...</span>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card className="border border-border/80 p-6 text-center text-xs text-muted-foreground">
        No signed evaluations submitted by panelists yet. Consensus will generate once scoring card seals are completed.
      </Card>
    );
  }

  // Statistical Calculations
  const scores = evaluations.map((ev) => {
    if (Number(ev.total_score || 0) > 0) return Number(ev.total_score);
    if (ev.scores && typeof ev.scores === "object") {
      const vals = Object.values(ev.scores).map(Number).filter((v) => !isNaN(v));
      if (vals.length > 0) return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
    }
    return 0;
  });
  const count = scores.length;

  const average = Number((scores.reduce((a, b) => a + b, 0) / count).toFixed(2));
  
  // Median
  const sortedScores = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? sortedScores[mid] : Number(((sortedScores[mid - 1] + sortedScores[mid]) / 2).toFixed(2));

  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);

  // Standard Deviation
  const mean = average;
  const squareDiffs = scores.map((s) => Math.pow(s - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Number(Math.sqrt(avgSquareDiff).toFixed(2));
  const isHighDiscrepancy = count >= 2 && stdDev >= 15.0;

  // Derive Consensus Verdict
  const failCount = evaluations.filter((ev) => ev.verdict_code === "failed").length;
  const revisionCount = evaluations.filter(
    (ev) =>
      ev.verdict_code === "passed_minor" ||
      ev.verdict_code === "passed_major" ||
      ev.verdict_code === "passed_with_revisions"
  ).length;
  
  let consensusVerdict = "Accepted";
  if (failCount > count / 2) {
    consensusVerdict = "Rejected";
  } else if (revisionCount > 0 || failCount > 0) {
    consensusVerdict = "Accepted with Revisions";
  }

  return (
    <Card className="border border-border/80 shadow-md text-xs font-semibold text-slate-800">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase text-slate-800">
          <Users className="h-4 w-4 text-primary" /> Panel Consensus Metrics
        </CardTitle>
        <CardDescription className="text-[10px]">
          Statistical consensus variables. Displays only latest signed evaluation worksheets.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Score Discrepancy Alert Banner */}
        {isHighDiscrepancy && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 flex items-start gap-2.5 animate-in fade-in duration-300">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Score Discrepancy Alert (σ = {stdDev} ≥ 15.0 pts)</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Standard deviation between panelist scores exceeds the institutional consensus threshold (15.0 points). Coordinator arbitration or panel deliberation is advised before releasing the final verdict.
              </p>
            </div>
          </div>
        )}

        {/* Consensus metrics row */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
            <span className="text-muted-foreground">Consensus Verdict</span>
            <Badge 
              variant={
                consensusVerdict === "Accepted" 
                  ? "success" 
                  : consensusVerdict === "Rejected" 
                    ? "danger" 
                    : "info"
              }
              className="text-[9px] font-extrabold uppercase"
            >
              {consensusVerdict}
            </Badge>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
            <span className="text-muted-foreground">Score Consensus</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-800">σ = {stdDev}</span>
              {isHighDiscrepancy ? (
                <Badge variant="danger" className="text-[8px] font-extrabold uppercase">
                  Discrepancy Alert
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[8px] font-extrabold uppercase text-emerald-600 border-emerald-300">
                  Consensus
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Statistical parameters grid */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-border/40 pt-4">
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-muted-foreground text-[8px] uppercase">Average</p>
            <p className="text-sm font-black text-slate-800">{average}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-muted-foreground text-[8px] uppercase">Median</p>
            <p className="text-sm font-black text-slate-800">{median}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-muted-foreground text-[8px] uppercase">Highest</p>
            <p className="text-sm font-black text-emerald-600">{highest}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-muted-foreground text-[8px] uppercase">Lowest</p>
            <p className="text-sm font-black text-rose-600">{lowest}</p>
          </div>
        </div>

        {/* Panel Table list using standard HTML */}
        <div className="border border-border rounded-xl overflow-hidden mt-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border text-[9px] font-bold uppercase text-muted-foreground">
                <th className="p-3">Panelist</th>
                <th className="p-3 text-center">Score</th>
                <th className="p-3 text-center">Verdict</th>
                <th className="p-3 text-center">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evaluations.map((ev) => {
                const name = ev.profiles 
                  ? `${ev.profiles.first_name} ${ev.profiles.last_name}` 
                  : "Unknown Panelist";
                
                const displayScore = Number(ev.total_score || 0) > 0
                  ? Number(ev.total_score).toFixed(1)
                  : ev.scores && typeof ev.scores === "object" && Object.values(ev.scores).length > 0
                    ? (Object.values(ev.scores).map(Number).filter((v) => !isNaN(v)).reduce((a, b) => a + b, 0) / Object.values(ev.scores).length).toFixed(1)
                    : "0.0";
                
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{name}</td>
                    <td className="p-3 text-center text-primary font-black">{displayScore}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="capitalize text-[8px] font-extrabold">{ev.verdict_code.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="p-3 text-center text-muted-foreground font-mono text-[9px]">
                      {new Date(ev.signed_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
