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
import type { Annotation } from "@/types/database";

/**
 * AnnotationsPage — displays all annotations scoped to the viewer's role.
 *
 * BUG-C1 fix: annotations.created_by is the FK to profiles, not profile_id.
 *             Use `profiles!created_by(...)` for the join.
 * BUG-H6 fix: Apply server-side .in() filter before executing the query for
 *             advisers/panelists instead of fetching all rows and filtering client-side.
 */

interface AnnotationRow extends Pick<Annotation,
  "id" | "page_number" | "type" | "severity" | "status" | "content" | "selected_text" | "created_at"
> {
  created_by: string;
  document_version_id: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
  document_versions: {
    id: string;
    documents: {
      id: string;
      project_id: string;
      projects: { id: string; title: string } | null;
    } | null;
  } | null;
}

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
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
          ["coordinator", "sys_admin", "college_dean"].includes(r)
        );

        // BUG-C1: Use `created_by` (actual FK) not `profile_id` (non-existent column)
        const baseSelect = `
          id,
          page_number,
          type,
          severity,
          status,
          content,
          selected_text,
          created_at,
          created_by,
          document_version_id,
          profiles!created_by ( first_name, last_name, email ),
          document_versions (
            id,
            documents (
              id,
              project_id,
              projects ( id, title )
            )
          )
        `;

        if (isCoordinatorOrAdmin) {
          // Full access — no filter needed
          const { data, error } = await supabase
            .from("annotations")
            .select(baseSelect)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setAnnotations((data as unknown as AnnotationRow[]) || []);

        } else if (isAdviserOrPanelist) {
          // BUG-H6: Resolve the allowed project IDs first, then apply server-side filter
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("profile_id", user!.id);

          const projectIds = (memberProjects || []).map((m: { project_id: string }) => m.project_id);
          if (projectIds.length === 0) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          // Fetch document_version_ids that belong to allowed projects
          const { data: docVersions } = await supabase
            .from("document_versions")
            .select("id, documents!inner(project_id)")
            .in("documents.project_id", projectIds);

          const allowedVersionIds = (docVersions || []).map((v: { id: string }) => v.id);
          if (allowedVersionIds.length === 0) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          // BUG-H6: Server-side filter — only fetch annotations for allowed versions
          const { data, error } = await supabase
            .from("annotations")
            .select(baseSelect)
            .in("document_version_id", allowedVersionIds)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setAnnotations((data as unknown as AnnotationRow[]) || []);

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

          // Resolve version IDs for this student's project
          const { data: docVersions } = await supabase
            .from("document_versions")
            .select("id, documents!inner(project_id)")
            .eq("documents.project_id", project.id);

          const allowedVersionIds = (docVersions || []).map((v: { id: string }) => v.id);
          if (allowedVersionIds.length === 0) {
            setAnnotations([]);
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from("annotations")
            .select(baseSelect)
            .in("document_version_id", allowedVersionIds)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setAnnotations((data as unknown as AnnotationRow[]) || []);
        }
      } catch (err) {
        console.error("Error loading annotations:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roles.join(",")]);

  const filteredAnnotations = annotations.filter((ann) =>
    ann.content?.toLowerCase().includes(searchText.toLowerCase()) ||
    ann.selected_text?.toLowerCase().includes(searchText.toLowerCase())
  );

  const statusVariant = (status: string): "warning" | "success" | "info" | "outline" => {
    switch (status) {
      case "open": return "warning";
      case "resolved":
      case "verified": return "success";
      case "in_progress":
      case "addressed": return "info";
      default: return "outline";
    }
  };

  return (
    <RoleGuard allowedRoles={["coordinator", "panelist", "adviser", "sys_admin", "college_dean"]} fallback={<AccessDenied />}>
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
              {searchText
                ? "No annotations match your search query."
                : "No feedback comments or highlights in your documents yet."}
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
                            {ann.type?.replace(/_/g, " ")} ({ann.severity})
                          </Badge>
                          <Badge variant={statusVariant(ann.status)}>
                            {ann.status.replace(/_/g, " ")}
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
