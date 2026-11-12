"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, LogOut, Sun, Moon, RotateCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/providers/theme-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function AppHeader({ title, onMenuClick }: AppHeaderProps) {
  const router = useRouter();
  const { profile, roles, activeRole, setActiveRole, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClient();

  const effectiveRole = activeRole || roles[0] || "student";
  const roleLabels: Record<string, string> = {
    college_dean: "College Dean",
    sys_admin: "System Admin",
    coordinator: "Coordinator",
    panelist: "Defense Panelist",
    adviser: "Research Adviser",
    student: "Student Proponent",
  };
  const roleDisplayName = roleLabels[effectiveRole] || effectiveRole.replace(/_/g, " ");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!profile) return;
    const { count, error } = await supabase
      .from("notifications_compat")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [profile, supabase]);

  // Manual Live Refresher Trigger
  const handleSyncRefresh = () => {
    setIsRefreshing(true);
    // 1. Broadcast custom event to all active dashboard views & hooks
    window.dispatchEvent(new CustomEvent("aurora:refresh"));
    // 2. Revalidate server-rendered routes
    router.refresh();
    // 3. Re-query unread notifications
    fetchUnreadCount();
    // 4. Smooth spin completion & user notification
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Synchronized with live database", {
        description: "Latest defenses, projects, and notifications loaded.",
        duration: 2500,
      });
    }, 600);
  };

  // Smart background tab focus revalidation
  useEffect(() => {
    let lastActive = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActive;
        // If tab was away for > 25 seconds, silently re-sync data!
        if (elapsed > 25000) {
          window.dispatchEvent(new CustomEvent("aurora:refresh"));
          fetchUnreadCount();
          router.refresh();
        }
        lastActive = Date.now();
      } else {
        lastActive = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchUnreadCount, router]);

  useEffect(() => {
    if (!profile) return;

    fetchUnreadCount();

    // Set up realtime notification updates
    const channel = supabase
      .channel(`unread-notifications-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload) => {
          fetchUnreadCount();
          if (payload.eventType === "INSERT" && payload.new) {
            const notif = payload.new as any;
            const notifTitle = notif.title || "New Notification";
            const notifMessage = notif.message || notif.body || "";
            if (notif.type === "revision_requested" || notifTitle.toLowerCase().includes("revision")) {
              toast.error(notifTitle, {
                description: notifMessage,
                duration: 8000,
              });
            } else if (notif.type === "approved" || notifTitle.toLowerCase().includes("endorse")) {
              toast.success(notifTitle, {
                description: notifMessage,
                duration: 6000,
              });
            } else {
              toast.info(notifTitle, {
                description: notifMessage,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {title && (
        <h1 className="hidden text-lg font-semibold tracking-tight sm:block">
          {title}
        </h1>
      )}

      <form onSubmit={handleSearchSubmit} className="relative ml-auto flex max-w-md flex-1 items-center">
        <button type="submit" className="absolute left-3 p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
        <Input
          placeholder="Search defenses, students, documents..."
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-card"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <Link href="/dashboard/notifications" className="relative">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </Link>

      {/* Live Data Refresher / Sync */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSyncRefresh}
        disabled={isRefreshing}
        title="Sync live data with database"
        className="text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <RotateCw className={cn("h-4 w-4 transition-all duration-300", isRefreshing && "animate-spin text-primary")} />
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="text-muted-foreground hover:text-foreground"
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
      <div className="flex items-center gap-3">
        {profile && (
          <div className="hidden text-right md:block">
            <p className="text-xs font-bold text-foreground">
              {profile.first_name} {profile.last_name}
            </p>
            {roles && roles.length > 1 ? (
              <div className="mt-0.5 flex items-center justify-end gap-1">
                {roles.map((r) => {
                  const isActive = effectiveRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setActiveRole(r);
                        toast.success(`Switched role to ${roleLabels[r] || r}`);
                      }}
                      title={`Active role: ${roleLabels[r] || r}. Click to switch.`}
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all cursor-pointer border",
                        isActive
                          ? "bg-primary/10 text-primary border-primary/30 shadow-2xs font-black"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {roleLabels[r] || r}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px] font-bold bg-muted/60 text-muted-foreground border-border/80 px-2 py-0.5">
                {roleDisplayName}
              </Badge>
            )}
          </div>
        )}
        <Avatar className="h-9 w-9 ring-2 ring-border" title={`${profile?.first_name} ${profile?.last_name} (${roleDisplayName})`}>
          <AvatarFallback className="bg-primary text-xs text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-danger hover:bg-danger/10"
          onClick={signOut}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
