"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_SIDEBAR_LINKS, ADMIN_ROLES, type RoleCode } from "@/lib/auth/permissions";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/rubrics", label: "Rubrics", icon: ClipboardList },
  { href: "/admin/stages", label: "Defense Stages", icon: Layers },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
];

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      {label}
    </Link>
  );
}

export function AppSidebar({ className }: { className?: string }) {
  const { roles, hasRole, isLoading } = useAuth();

  // Use centralized permission matrix — single source of truth
  const primaryRole = (roles[0] || "student") as RoleCode;
  const allowedHrefs = ROLE_SIDEBAR_LINKS[primaryRole] ?? ROLE_SIDEBAR_LINKS.student;

  const filteredMainNav = isLoading
    ? []
    : mainNav.filter((item) => allowedHrefs.includes(item.href));

  const showAdminNav =
    !isLoading && roles.some((r) => ADMIN_ROLES.includes(r as RoleCode));

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-black tracking-wider text-white uppercase">
            {APP_NAME}
          </p>
          <p className="text-[10px] text-sidebar-foreground/60 font-semibold uppercase tracking-widest">ParSU Goa</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredMainNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {showAdminNav && (
          <>
            <Separator className="my-4 bg-white/10" />

            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
              Administration
            </p>
            <nav className="flex flex-col gap-1">
              {adminNav.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>
          </>
        )}
      </ScrollArea>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-xs font-semibold text-white">Defense Season</p>
          <p className="text-[10px] text-sidebar-foreground/60 font-bold uppercase">
            AY 2025–2026 • 2nd Sem
          </p>
        </div>
      </div>
    </aside>
  );
}
