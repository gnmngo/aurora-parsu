"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Inbox, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/hooks/use-auth";

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const supabase = createClient();
  const { user, roles } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function loadAnnotations() {
      try {
        const isAdviserOrPanelist = roles.some((r) =>
          ["adviser", "panelist"].includes(r)
        );
        const isCoordinatorOrAdmin = roles.some((r) =>
          ["coordinator", "sys_admin"].includes(r)
        );

        const query = supabase
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
            profile_id,
            document_version_id,
            profiles ( first_name, last_name, email ),
            document_versions (
              id,
              documents (
                id,
                project_id,
                projects ( id, title, student_id, students ( profile_id ) )
              )
            )
          `)
          .order("created_at", { ascending: false });

        if (isCoordinatorOrAdmin) {
          // Full access — no filter
        } else if (isAdviserOrPanelist) {
          // Scope to projects where user is a member
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id);

          const projectIds = (memberProjects || []).map((m: any) => m.project_id);
          if (projectIds.length === 0) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          // Filter by document_versions that belong to those projects
          // We'll fetch all annotations and then filter client-side for now
          // (direct nested filter on Supabase requires a view or RPC)
          const { data, error } = await query;
          if (error) throw error;

          const scoped = (data || []).filter((ann: any) => {
            const projId = ann.document_versions?.documents?.project_id;
            return projectIds.includes(projId);
          });
          setAnnotations(scoped);
          setLoading(false);
          return;
        } else {
          // Student — only see annotations on their own project's documents
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user!.id)
            .maybeSingle();

          if (!studentRecord) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          const { data: project } = await supabase
            .from("projects")
            .select("id")
            .eq("student_id", studentRecord.id)
            .maybeSingle();

          if (!project) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await query;
          if (error) throw error;

          const scoped = (data || []).filter((ann: any) => {
            return ann.document_versions?.documents?.project_id === project.id;
          });
          setAnnotations(scoped);
          setLoading(false);
          return;
        }

        const { data, error } = await query;
        if (error) throw error;
        setAnnotations(data || []);
      } catch (err) {
        console.error("Error loading annotations:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnotations();
  }, [user, roles, supabase]);

  const filteredAnnotations = annotations.filter((ann) =>
    ann.content?.toLowerCase().includes(searchText.toLowerCase()) ||
    ann.selected_text?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "student"]} fallback={<AccessDenied />}>
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
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Annotations Found</h3>
            <p className="mt-2 text-sm text-muted-foreground font-semibold">
              No feedback comments or highlights in your documents yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnotations.map((ann) => {
              const authorName = ann.profiles
                ? `${ann.profiles.first_name} ${ann.profiles.last_name}`
                : "Unknown Reviewer";
              const authorEmail = ann.profiles?.email || "";
              const projectTitle = ann.document_versions?.documents?.projects?.title;

              return (
                <Card key={ann.id} className="transition-colors hover:bg-muted/30 rounded-2xl border border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 text-xs font-semibold">
                      <div className="flex-1">
                        {projectTitle && (
                          <p className="text-[10px] uppercase font-black text-muted-foreground mb-2 tracking-wider">
                            {projectTitle}
                          </p>
                        )}
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
                            {ann.type?.replace("_", " ")} ({ann.severity})
                          </Badge>
                          <Badge variant={ann.status === "open" ? "warning" : "success"}>
                            {ann.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm font-bold text-foreground">
                          {authorName}{" "}
                          <span className="font-semibold text-muted-foreground text-xs">
                            ({authorEmail})
                          </span>
                        </p>
                        {ann.selected_text && (
                          <blockquote className="mt-2 border-l-2 border-primary pl-3 text-xs italic text-muted-foreground">
                            &ldquo;{ann.selected_text}&rdquo;
                          </blockquote>
                        )}
                        <p className="mt-2 text-sm text-foreground/80 font-semibold leading-relaxed">{ann.content}</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">
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
    </RoleGuard>
  );
}
