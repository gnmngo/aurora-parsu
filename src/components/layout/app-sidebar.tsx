"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Shield,
  FileText,
  MessageSquare,
  Award,
  Bell,
  BarChart3,
  Settings,
  Users,
  ClipboardList,
  Layers,
  FileBarChart,
  ScrollText,
  Sparkles,
  Search,
  BookOpen,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuroraLogo } from "@/components/ui/aurora-logo";
import { currentDefenseSeason } from "@/lib/utils/academic-year";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_SIDEBAR_LINKS, type RoleCode } from "@/lib/auth/permissions";
import { IsoEvaluationDialog } from "@/components/research/iso-evaluation-dialog";

const overviewNav = [
  { href: "/dashboard", label: "Command Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/search", label: "Global Search", icon: Search },
];

const workflowNav = [
  { href: "/dashboard/my-project", label: "My Project & Team", icon: BookOpen },
  { href: "/dashboard/submissions", label: "Manuscript Submissions", icon: FileText },
  { href: "/workspace", label: "Review & Grading Workspace", icon: Sparkles },
  { href: "/dashboard/defenses", label: "Defenses & Scheduling", icon: Shield },
  { href: "/dashboard/annotations", label: "Revisions & Annotations", icon: MessageSquare },
  { href: "/dashboard/grades", label: "Grades & Verdicts", icon: Award },
];

const governanceNav = [
  { href: "/admin/stages", label: "Defense Stages & Curriculum", icon: Layers },
  { href: "/admin/rubrics", label: "Evaluation Rubrics", icon: ClipboardList },
  { href: "/admin/reports", label: "Official Reports (DCS Forms)", icon: FileBarChart },
  { href: "/dashboard/analytics", label: "Institutional Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "User & Faculty Directory", icon: Users },
  { href: "/admin/system-health", label: "Maintenance & DR Backup", icon: Wrench },
  { href: "/admin/audit", label: "Security Audit Logs", icon: ScrollText },
];

const accountNav = [
  { href: "/dashboard/settings", label: "Profile & E-Signature", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-sidebar-foreground/75 hover:bg-white/10 hover:text-white"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
          isActive ? "text-white" : "text-sidebar-foreground/60"
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white leading-none shadow-sm">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({ className }: { className?: string }) {
  const { user, roles, activeRole, isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("is_read", false);

        if (!error && typeof count === "number") {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Failed to load unread notifications count:", err);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel(`sidebar-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const effectiveRole = (activeRole || roles[0] || "student") as RoleCode;
  const allowedHrefs =
    ROLE_SIDEBAR_LINKS[effectiveRole] ?? ROLE_SIDEBAR_LINKS.student;

  const filteredOverview = isLoading
    ? []
    : overviewNav.filter((item) => allowedHrefs.includes(item.href));

  const filteredWorkflow = isLoading
    ? []
    : workflowNav.filter((item) => {
        if (!allowedHrefs.includes(item.href)) return false;
        // For students, show "1. My Project & Team" as primary step 1 and label Submissions as "Manuscript Archive"
        return true;
      }).map((item) => {
        if (effectiveRole === "student" && item.href === "/dashboard/submissions") {
          return { ...item, label: "Manuscript Archive" };
        }
        return item;
      });

  const filteredGovernance = isLoading
    ? []
    : governanceNav.filter((item) => {
        if (item.href === "/dashboard/analytics") {
          return allowedHrefs.includes(item.href);
        }
        if (effectiveRole === "sys_admin") return true;
        if (effectiveRole === "coordinator") {
          return [
            "/admin/users",
            "/admin/rubrics",
            "/admin/stages",
            "/admin/reports",
            "/admin/system-health",
          ].includes(item.href);
        }
        if (effectiveRole === "college_dean") {
          return [
            "/admin/rubrics",
            "/admin/stages",
            "/admin/reports",
            "/admin/system-health",
          ].includes(item.href);
        }
        return false;
      });

  const filteredAccount = isLoading
    ? []
    : accountNav
        .filter((item) => allowedHrefs.includes(item.href))
        .map((item) => {
          if (effectiveRole === "student" && item.href === "/dashboard/settings") {
            return { ...item, label: "Account Settings" };
          }
          return item;
        });

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <AuroraLogo size="md" showText={true} textColor="text-white" subtext="ParSU Goa" />
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        {/* SECTION 1: OVERVIEW */}
        {filteredOverview.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/50">
              Overview
            </p>
            <nav className="flex flex-col gap-0.5">
              {filteredOverview.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  badge={item.href === "/dashboard/notifications" ? unreadCount : undefined}
                />
              ))}
            </nav>
          </div>
        )}

        {/* SECTION 2: 5-STEP ACADEMIC DEFENSE WORKFLOW */}
        {filteredWorkflow.length > 0 && (
          <>
            <Separator className="my-2.5 bg-white/10" />
            <div className="mb-3">
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/50">
                Defense Workflow Pipeline
              </p>
              <nav className="flex flex-col gap-0.5">
                {filteredWorkflow.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>
          </>
        )}

        {/* SECTION 3: GOVERNANCE & ADMINISTRATION */}
        {filteredGovernance.length > 0 && (
          <>
            <Separator className="my-2.5 bg-white/10" />
            <div className="mb-3">
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/50">
                {effectiveRole === "college_dean" ? "Academic Governance" : "Governance & Admin"}
              </p>
              <nav className="flex flex-col gap-0.5">
                {filteredGovernance.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>
          </>
        )}

        {/* SECTION 4: ACCOUNT */}
        {filteredAccount.length > 0 && (
          <>
            <Separator className="my-2.5 bg-white/10" />
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sidebar-foreground/50">
                Account
              </p>
              <nav className="flex flex-col gap-0.5">
                {filteredAccount.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>
          </>
        )}
      </ScrollArea>

      <div className="border-t border-white/10 p-3 space-y-2">
        <IsoEvaluationDialog
          triggerButton={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-200 transition-all hover:bg-amber-500/30 hover:text-white"
            >
              <Award className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate">System Survey (SUS &amp; UTAUT)</span>
            </button>
          }
        />

        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-white">Defense Season</p>
          <p className="text-[10px] text-sidebar-foreground/60 font-bold uppercase">
            {currentDefenseSeason()} • 1st Sem
          </p>
        </div>
      </div>
    </aside>
  );
}
