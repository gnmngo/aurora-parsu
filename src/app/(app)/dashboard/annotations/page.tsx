"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function loadAnnotations() {
      try {
        const { data, error } = await supabase
          .from("annotations")
          .select(`
            id,
            page_number,
            type,
            severity,
            status,
            content,
            selected_text,
            created_at,
            profiles ( first_name, last_name, email )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) {
          setAnnotations(data);
        }
      } catch (err) {
        console.error("Error loading annotations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnnotations();
  }, [supabase]);

  const filteredAnnotations = annotations.filter((ann) =>
    ann.content?.toLowerCase().includes(searchText.toLowerCase()) ||
    ann.selected_text?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Annotations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All comments and feedback across your documents
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search annotations..." 
              className="w-64 pl-9" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredAnnotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Annotations Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no feedback comments or highlights in the system yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnotations.map((ann) => {
            const authorName = ann.profiles 
              ? `${ann.profiles.first_name} ${ann.profiles.last_name}`
              : "Unknown Reviewer";
            const authorEmail = ann.profiles?.email || "";

            return (
              <Card key={ann.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Page {ann.page_number}</Badge>
                        <Badge
                          variant={
                            ann.severity === "major" || ann.severity === "critical"
                              ? "danger"
                              : ann.severity === "minor"
                                ? "warning"
                                : "info"
                          }
                        >
                          {ann.type.replace("_", " ")} ({ann.severity})
                        </Badge>
                        <Badge variant={ann.status === "open" ? "warning" : "success"}>
                          {ann.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-medium">
                        {authorName}{" "}
                        <span className="font-normal text-muted-foreground text-xs">
                          ({authorEmail})
                        </span>
                      </p>
                      {ann.selected_text && (
                        <blockquote className="mt-2 border-l-2 border-info pl-3 text-sm italic text-muted-foreground">
                          &ldquo;{ann.selected_text}&rdquo;
                        </blockquote>
                      )}
                      <p className="mt-2 text-sm">{ann.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {format(new Date(ann.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
