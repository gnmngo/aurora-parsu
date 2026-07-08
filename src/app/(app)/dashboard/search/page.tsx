"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, ArrowRight, Calendar, Inbox, Users, FileText, Clock, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SearchTab = "projects" | "people" | "documents" | "schedules";

export default function SearchPage() {
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<SearchTab>("projects");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && activeTab !== "projects") return;

    setLoading(true);
    setResults([]);
    
    try {
      if (activeTab === "projects") {
        // RLS handles the scoping
        const { data, error } = await supabase
          .from("projects")
          .select(`
            id, title, status, academic_year,
            students(profiles(first_name, last_name)),
            defense_stages(name)
          `)
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .range((page - 1) * 10, page * 10 - 1);
        
        if (error) throw error;
        setResults(data || []);
      } 
      else if (activeTab === "people") {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, avatar_url")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .range((page - 1) * 10, page * 10 - 1);
          
        if (error) throw error;
        setResults(data || []);
      }
      else if (activeTab === "documents") {
        const { data, error } = await supabase
          .from("documents")
          .select(`
            id, title, status, created_at, project_id, stage_id,
            projects(title)
          `)
          .ilike("title", `%${query}%`)
          .order("created_at", { ascending: false })
          .range((page - 1) * 10, page * 10 - 1);

        if (error) throw error;
        setResults(data || []);
      }
      else if (activeTab === "schedules") {
        const { data, error } = await supabase
          .from("defense_schedules")
          .select(`
            id, scheduled_at, room, building, status, project_id, stage_id,
            projects(title)
          `)
          .or(`room.ilike.%${query}%,building.ilike.%${query}%`)
          .order("scheduled_at", { ascending: false })
          .range((page - 1) * 10, page * 10 - 1);

        if (error) throw error;
        setResults(data || []);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err.message || "Failed to complete search query.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [page, activeTab]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display">Global Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Universal search respecting your role-based access permissions
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => { setPage(1); handleSearch(e); }} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-11 text-sm bg-muted/50 border-transparent focus-visible:bg-card"
                />
              </div>
              <Button type="submit" className="h-11 px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>

            <div className="flex gap-2 border-b border-border pt-2 pb-px overflow-x-auto">
              {[
                { id: "projects", label: "Projects", icon: LayoutTemplate },
                { id: "people", label: "People", icon: Users },
                { id: "documents", label: "Documents", icon: FileText },
                { id: "schedules", label: "Schedules", icon: Clock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setPage(1); setActiveTab(tab.id as SearchTab); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Results for {activeTab}</span>
            <span className="text-xs text-muted-foreground font-normal">Page {page}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-20 mb-3" />
              <p>No {activeTab} found matching your query.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  {activeTab === "projects" && (
                    <>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground text-sm">{res.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{res.students?.[0]?.profiles?.first_name} {res.students?.[0]?.profiles?.last_name}</span>
                          <span>•</span>
                          <span className="capitalize">{res.status.replace("_", " ")}</span>
                          <span>•</span>
                          <span>{res.defense_stages?.name}</span>
                        </div>
                      </div>
                      <Link href={`/workspace/${res.id}/${res.defense_stages?.id || 'stage'}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          View <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  )}

                  {activeTab === "people" && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {res.first_name?.[0]}{res.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{res.first_name} {res.last_name}</p>
                        <p className="text-xs text-muted-foreground">{res.email}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === "documents" && (
                    <>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{res.title}</p>
                        <p className="text-xs text-muted-foreground">Project: {res.projects?.title}</p>
                      </div>
                      <Link href={`/workspace/${res.project_id}/${res.stage_id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          Open <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  )}

                  {activeTab === "schedules" && (
                    <>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{new Date(res.scheduled_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{res.room} - {res.building}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{res.projects?.title}</p>
                      </div>
                      <Link href={`/workspace/${res.project_id}/${res.stage_id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          Details <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="flex justify-end gap-2 text-sm pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={results.length < 10 || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
