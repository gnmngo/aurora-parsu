"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, ArrowRight, Calendar, Inbox } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SearchPage() {
  const supabase = createClient();
  
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [stageId, setStageId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [page, setPage] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  // Load lookup stages on mount
  useEffect(() => {
    async function loadStages() {
      const { data } = await supabase
        .from("defense_stages")
        .select("id, name")
        .order("sequence_order");
      if (data) setStages(data);
    }
    loadStages();
  }, [supabase]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_projects", {
        p_query: query || null,
        p_status: status || null,
        p_stage_id: stageId || null,
        p_academic_year: academicYear || null,
        p_limit: 10,
        p_offset: (page - 1) * 10,
      });

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err.message || "Failed to complete search query.");
    } finally {
      setLoading(false);
    }
  };

  // Re-run search when page or filters change
  useEffect(() => {
    handleSearch();
  }, [page, status, stageId, academicYear]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Universal multi-filter search across all projects, students, advisers, and stages
        </p>
      </div>

      {/* Filter panel card */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => { setPage(1); handleSearch(e); }} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Keyword Search */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase">Keyword search</label>
                <div className="relative">
                  <Input
                    placeholder="Search title, student, or adviser..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase">Project Status</label>
                <select
                  value={status}
                  onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                  className="w-full h-9 rounded-lg border border-border bg-card px-2 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="revision_required">Revision Required</option>
                  <option value="passed">Passed / Approved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Defense Stage Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase">Defense Stage</label>
                <select
                  value={stageId}
                  onChange={(e) => { setPage(1); setStageId(e.target.value); }}
                  className="w-full h-9 rounded-lg border border-border bg-card px-2 focus:outline-none"
                >
                  <option value="">All Stages</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase mr-2">Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2025-2026"
                  value={academicYear}
                  onChange={(e) => { setPage(1); setAcademicYear(e.target.value); }}
                  className="h-8 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-40"
                />
              </div>

              <Button type="submit" size="sm" className="h-8 px-5 rounded-xl gap-1">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Search Database
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Query Results</span>
            <span className="text-[10px] text-muted-foreground font-semibold">Page {page}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-30 mb-2" />
              <p>No projects matching the query parameters were found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">"{res.title}"</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-slate-800">Student: {res.student_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Adviser: {res.adviser_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> AY {res.academic_year}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Badge variant="info" className="text-[8px] font-extrabold uppercase">{res.stage_name}</Badge>
                      <Badge variant="outline" className="text-[8px] font-extrabold uppercase capitalize">{res.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <Link href={`/workspace/${res.id}/stage`}>
                    <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 rounded-lg">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {results.length > 0 && (
        <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-8 rounded-lg"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={results.length < 10 || loading}
            className="h-8 rounded-lg"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
