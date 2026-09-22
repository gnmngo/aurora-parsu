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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app";
import { AuroraLogo } from "@/components/ui/aurora-logo";
import { currentDefenseSeason } from "@/lib/utils/academic-year";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_SIDEBAR_LINKS, ADMIN_ROLES, type RoleCode } from "@/lib/auth/permissions";
import { IsoEvaluationDialog } from "@/components/research/iso-evaluation-dialog";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Review Workspace", icon: Sparkles },
  { href: "/dashboard/my-project", label: "My Project", icon: BookOpen },
  { href: "/dashboard/search", label: "Global Search", icon: Search },
  { href: "/dashboard/defenses", label: "Defenses", icon: Shield },
  { href: "/dashboard/submissions", label: "Submissions", icon: FileText },
  { href: "/dashboard/annotations", label: "Annotations", icon: MessageSquare },
  { href: "/dashboard/grades", label: "Grades", icon: Award },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin/users", label: "User Management & Security", icon: Users },
  { href: "/admin/rubrics", label: "Rubrics", icon: ClipboardList },
  { href: "/admin/stages", label: "Defense Stages", icon: Layers },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
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
  const { user, roles, isLoading } = useAuth();
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

  // Aggregate allowed links across all user roles (e.g. Coordinator who is also an Adviser)
  const allowedHrefs = roles.length > 0
    ? Array.from(new Set(roles.flatMap((r) => ROLE_SIDEBAR_LINKS[r as RoleCode] ?? [])))
    : ROLE_SIDEBAR_LINKS.student;

  const filteredMainNav = isLoading
    ? []
    : mainNav.filter((item) => allowedHrefs.includes(item.href));

  const filteredAdminNav = adminNav.filter((item) => {
    if (roles.includes("sys_admin")) return true;
    if (roles.includes("coordinator") || roles.includes("college_dean")) {
      return ["/admin/rubrics", "/admin/stages", "/admin/reports"].includes(item.href);
    }
    return false;
  });

  const showAdminNav = !isLoading && filteredAdminNav.length > 0;

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

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredMainNav.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              badge={item.href === "/dashboard/notifications" ? unreadCount : undefined}
            />
          ))}
        </nav>

        {showAdminNav && (
          <>
            <Separator className="my-4 bg-white/10" />

            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
              Administration
            </p>
            <nav className="flex flex-col gap-1">
              {filteredAdminNav.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>
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
              <span className="truncate">ISO 25010 Evaluation</span>
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
