"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderGit2,
  ChevronDown,
  Check,
  Plus,
  UserPlus,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "@/components/workspace/create-project-modal";
import { JoinProjectModal } from "@/components/workspace/join-project-modal";
import { cn } from "@/lib/utils";

export interface ProjectSwitcherItem {
  id: string;
  title: string;
  team_name?: string | null;
  status?: string;
  defense_stages?: { name?: string } | null;
  member_role?: string;
}

interface ProjectSwitcherProps {
  projects: ProjectSwitcherItem[];
  activeProjectId?: string;
  onSelectProject: (projectId: string) => void;
  student?: any;
  onRefresh?: () => void;
  className?: string;
}

export function ProjectSwitcher({
  projects,
  activeProjectId,
  onSelectProject,
  student,
  onRefresh,
  className,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!projects || projects.length === 0) {
    return null;
  }

  const handleSelect = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aurora_active_project_id", id);
      window.dispatchEvent(
        new CustomEvent("aurora_project_changed", { detail: { projectId: id } })
      );
    }
    onSelectProject(id);
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-left shadow-2xs transition-all duration-200 cursor-pointer",
          "hover:border-foreground/40 hover:bg-muted/40",
          open && "ring-2 ring-foreground/20 border-foreground/40"
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground border border-border/60 group-hover:bg-foreground group-hover:text-background transition-colors">
          <FolderGit2 className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 max-w-[200px] sm:max-w-[260px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Project
            </span>
            {projects.length > 1 && (
              <Badge
                variant="outline"
                className="text-[9px] font-bold px-1.5 py-0 bg-muted/60 text-foreground border-border/80"
              >
                {projects.length} Total
              </Badge>
            )}
          </div>
          <p className="truncate text-xs font-bold text-foreground">
            {activeProject ? activeProject.title : "Select Project"}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-foreground"
          )}
        />
      </button>

      {/* Floating Menu Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Popover Header */}
            <div className="px-3 py-2 border-b border-border/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-foreground">
                  Your Research Projects
                </p>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {projects.length} active
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Switch between your research proposals and capstone papers
              </p>
            </div>

            {/* Projects List */}
            <div className="max-h-72 overflow-y-auto py-1 space-y-1">
              {projects.map((p) => {
                const isSelected = p.id === activeProject?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition-all duration-150 cursor-pointer group",
                      isSelected
                        ? "bg-muted text-foreground border border-border"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground group-hover:bg-foreground/10 group-hover:text-foreground"
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : <Layers className="h-2.5 w-2.5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-bold truncate leading-snug",
                          isSelected ? "text-foreground" : "text-foreground/90"
                        )}
                      >
                        {p.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {p.team_name && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {p.team_name} &bull;
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {p.defense_stages?.name || "Stage"}
                        </span>
                        {p.status && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold uppercase tracking-wider py-0 px-1.5 bg-muted text-foreground border-border"
                          >
                            {p.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {p.member_role && (
                          <span className="text-[9px] font-mono uppercase text-muted-foreground">
                            ({p.member_role.replace(/_/g, " ")})
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 mt-1">
              <CreateProjectModal
                student={student}
                onSuccess={() => {
                  setOpen(false);
                  onRefresh?.();
                }}
                triggerButton={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-[11px] font-bold gap-1.5 h-8 border-border hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Project
                  </Button>
                }
              />

              <JoinProjectModal
                studentId={student?.id}
                onSuccess={() => {
                  setOpen(false);
                  onRefresh?.();
                }}
                triggerButton={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-[11px] font-bold gap-1.5 h-8 border-border hover:bg-muted"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Join Team
                  </Button>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
