"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, LogOut, Sun, Moon, RotateCw, CheckCheck, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const lastDocSignatureRef = useRef<string | null>(null);
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

  const fetchUnreadCount = useCallback(async (showToastOnNew = false) => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, link, read_at, created_at, metadata")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (!error && data) {
        const activeList = data.filter((n: any) => !n.metadata?.is_archived);
        const unread = activeList.filter((n: any) => !n.read_at).length;
        setUnreadCount(unread);
        setRecentNotifications(activeList.slice(0, 8));

        const newest = activeList[0];
        if (newest) {
          if (showToastOnNew && lastSeenNotifIdRef.current && lastSeenNotifIdRef.current !== newest.id) {
            const notifTitle = newest.title || "New Notification";
            const notifMessage = newest.message || "";
            if (newest.type === "revision_requested" || notifTitle.toLowerCase().includes("revision") || notifTitle.toLowerCase().includes("withdrawn")) {
              toast.error(notifTitle, { description: notifMessage, duration: 7000 });
            } else if (notifTitle.toLowerCase().includes("endorse") || notifTitle.toLowerCase().includes("approved")) {
              toast.success(notifTitle, { description: notifMessage, duration: 6000 });
            } else {
              toast.info(notifTitle, { description: notifMessage, duration: 5000 });
            }
            window.dispatchEvent(new CustomEvent("aurora:refresh"));
            router.refresh();
          }
          lastSeenNotifIdRef.current = newest.id;
        }
      }
    } catch {
      // non-fatal
    }
  }, [profile, supabase, router]);

  const handleMarkAllReadQuick = async () => {
    if (!profile) return;
    try {
      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("profile_id", profile.id)
        .is("read_at", null);
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
      window.dispatchEvent(new CustomEvent("aurora:notifications-updated"));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleNotifItemClick = async (notif: any) => {
    setShowNotifDropdown(false);
    if (!notif.read_at) {
      const now = new Date().toISOString();
      setUnreadCount((c) => Math.max(0, c - 1));
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: now } : n))
      );
      supabase.from("notifications").update({ read_at: now }).eq("id", notif.id).then();
    }
    const targetUrl =
      notif.link ||
      (notif.metadata?.projectId && notif.metadata?.stageId
        ? `/workspace/${notif.metadata.projectId}/${notif.metadata.stageId}`
        : "/dashboard/notifications");
    router.push(targetUrl);
  };

  // Manual Live Refresher Trigger
  const handleSyncRefresh = () => {
    setIsRefreshing(true);
    // 1. Broadcast custom event to all active dashboard views & hooks
    window.dispatchEvent(new CustomEvent("aurora:refresh"));
    // 2. Revalidate server-rendered routes
    router.refresh();
    // 3. Re-query unread notifications
    fetchUnreadCount(false);
    // 4. Smooth spin completion & user notification
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Synchronized with live database", {
        description: "Latest defenses, projects, and notifications loaded.",
        duration: 2500,
      });
    }, 600);
  };

  // Smart background tab focus revalidation + 5-second live polling for real-time updates
  useEffect(() => {
    if (!profile) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.dispatchEvent(new CustomEvent("aurora:refresh"));
        fetchUnreadCount(true);
        router.refresh();
      }
    };

    const handleCustomNotifUpdate = () => {
      fetchUnreadCount(false);
    };

    // Poll every 5 seconds while tab is visible to guarantee real-time sync even if WebSockets drop
    const pollInterval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      await fetchUnreadCount(true);

      try {
        const { data: latestDocs } = await supabase
          .from("documents")
          .select("id, adviser_approval_status, updated_at")
          .order("updated_at", { ascending: false })
          .limit(3);
        if (latestDocs && latestDocs.length > 0) {
          const sig = latestDocs.map((d: any) => `${d.id}:${d.adviser_approval_status}:${d.updated_at}`).join("|");
          if (lastDocSignatureRef.current && lastDocSignatureRef.current !== sig) {
            window.dispatchEvent(new CustomEvent("aurora:refresh"));
            router.refresh();
          }
          lastDocSignatureRef.current = sig;
        }
      } catch {
        // non-fatal
      }
    }, 5000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("aurora:notifications-updated", handleCustomNotifUpdate);
    window.addEventListener("aurora:refresh", handleCustomNotifUpdate);
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("aurora:notifications-updated", handleCustomNotifUpdate);
      window.removeEventListener("aurora:refresh", handleCustomNotifUpdate);
    };
  }, [profile, fetchUnreadCount, router, supabase]);

  useEffect(() => {
    if (!profile) return;

    fetchUnreadCount(false);

    // Set up realtime updates for notifications, documents (endorsement/withdrawal), projects, and schedules
    const channel = supabase
      .channel(`aurora-live-header-${profile.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload) => {
          fetchUnreadCount(false);
          if (payload.eventType === "INSERT" && payload.new) {
            const notif = payload.new as any;
            lastSeenNotifIdRef.current = notif.id;
            const notifTitle = notif.title || "New Notification";
            const notifMessage = notif.message || notif.body || "";
            if (notif.type === "revision_requested" || notifTitle.toLowerCase().includes("revision") || notifTitle.toLowerCase().includes("withdrawn")) {
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
            window.dispatchEvent(new CustomEvent("aurora:refresh"));
            router.refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          window.dispatchEvent(new CustomEvent("aurora:refresh"));
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          window.dispatchEvent(new CustomEvent("aurora:refresh"));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "defense_schedules" },
        () => {
          window.dispatchEvent(new CustomEvent("aurora:refresh"));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evaluations" },
        () => {
          window.dispatchEvent(new CustomEvent("aurora:refresh"));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase, fetchUnreadCount, router]);

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

      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer"
          onClick={() => {
            setShowNotifDropdown((prev) => !prev);
            fetchUnreadCount(false);
          }}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        {showNotifDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Live Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0 font-bold">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllReadQuick}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {recentNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                    No notifications yet. Live updates will appear here automatically.
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifItemClick(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-2.5",
                        !n.read_at && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 rounded-full shrink-0",
                          !n.read_at ? "bg-primary" : "bg-transparent"
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-xs truncate", !n.read_at ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                            {n.title || "System Notification"}
                          </p>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border bg-muted/30 p-2 text-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="inline-flex items-center justify-center gap-1 text-xs font-bold text-primary hover:underline py-1 w-full"
                >
                  <span>Open Full Notification Center</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

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
