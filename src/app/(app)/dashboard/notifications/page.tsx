"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  Calendar,
  Award,
  AlertTriangle,
  Bell,
  Inbox,
  Check,
  Undo,
  Archive,
  Trash2,
  Search,
  CheckCheck,
  Loader2,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const typeIcons = {
  comment: MessageSquare,
  schedule: Calendar,
  grade_released: Award,
  revision_requested: AlertTriangle,
  system: Bell,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const supabase = createClient();
  const { user } = useAuth();

  const loadNotifications = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // supabase singleton is stable — user?.id is the correct dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: isRead ? new Date().toISOString() : null })
        .eq("id", id);

      if (error) throw error;
      toast.success(isRead ? "Marked as read" : "Marked as unread");
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  const handleArchive = async (notif: any, toArchive: boolean) => {
    try {
      const newMetadata = { ...notif.metadata, is_archived: toArchive };
      const { error } = await supabase
        .from("notifications")
        .update({ metadata: newMetadata })
        .eq("id", notif.id);

      if (error) throw error;
      toast.success(toArchive ? "Notification archived" : "Notification unarchived");
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to archive notification.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Notification deleted");
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete notification.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("profile_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      toast.success("All notifications marked as read!");
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to mark all as read.");
    }
  };

  // Compile final filtered list
  const filteredNotifications = notifications.filter((n) => {
    const isArchived = !!n.metadata?.is_archived;
    
    // Tab filters
    if (filterTab === "unread" && (n.read_at || isArchived)) return false;
    if (filterTab === "archived" && !isArchived) return false;
    if (filterTab === "all" && isArchived) return false;

    // Category filters
    if (categoryFilter !== "all" && n.type !== categoryFilter) return false;

    // Search filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = (n.title || "").toLowerCase().includes(query);
      const matchMsg = (n.message || "").toLowerCase().includes(query);
      return matchTitle || matchMsg;
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read_at && !n.metadata?.is_archived).length;
  const counts = {
    all: notifications.filter((n) => !n.metadata?.is_archived).length,
    unread: unreadCount,
    archived: notifications.filter((n) => !!n.metadata?.is_archived).length,
  };

  const handleNotificationClick = async (notif: any) => {
    // If unread, mark as read optimistically
    if (!notif.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notif.id)
        .then();
    }

    const targetUrl =
      notif.link ||
      (notif.metadata?.projectId
        ? `/workspace/${notif.metadata.projectId}`
        : "/dashboard/my-project");

    router.push(targetUrl);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-xs font-semibold text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notification Center</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Realtime alerts, reviews, schedules updates, and evaluations verification status.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} size="sm" variant="outline" className="h-8 rounded-lg gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
          <Badge variant="info">
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      {/* Filters & Search Header */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40">
              <button
                onClick={() => setFilterTab("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  filterTab === "all"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setFilterTab("unread")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  filterTab === "unread"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread
                {counts.unread > 0 && (
                  <Badge variant="default" className="h-4 px-1 text-[10px] font-bold">
                    {counts.unread}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setFilterTab("archived")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  filterTab === "archived"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Archived ({counts.archived})
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 text-xs font-bold rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="comment">Comments & Remarks</option>
                <option value="revision_requested">Revision Requests</option>
                <option value="schedule">Defense Schedules</option>
                <option value="grade_released">Evaluation & Verdicts</option>
                <option value="system">System Alerts</option>
              </select>
            </div>
          </div>

          {/* Search Query Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notifications by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground opacity-30" />
          <h3 className="mt-4 text-sm font-bold">No Notifications Found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No notifications matches the search parameters or filter tab criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => {
            const Icon = typeIcons[notif.type as keyof typeof typeIcons] ?? Bell;
            const isRead = !!notif.read_at;
            const isArchived = !!notif.metadata?.is_archived;

            return (
              <Card
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "transition-all border border-border/80 cursor-pointer hover:border-primary/50 hover:shadow-md hover:bg-muted/20 group relative",
                  !isRead && "border-primary/30 bg-primary/5 shadow-xs"
                )}
              >
                <CardContent className="flex gap-4 p-4 items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                      !isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors">
                          {notif.title}
                        </p>
                        {notif.link && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold bg-background shrink-0">
                            {notif.type === "revision_requested" ? "Review Paper" : "Open Link"}
                          </Badge>
                        )}
                      </div>
                      {!isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {notif.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                      <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Click to view details <ArrowRight className="h-3 w-3 inline" />
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons on card hover/side */}
                  <div
                    className="flex items-center gap-1.5 print:hidden shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isRead ? (
                      <Button
                        onClick={() => handleMarkRead(notif.id, false)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground rounded-lg"
                        title="Mark as unread"
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleMarkRead(notif.id, true)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary rounded-lg"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => handleArchive(notif, !isArchived)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground rounded-lg"
                      title={isArchived ? "Unarchive" : "Archive"}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(notif.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger rounded-lg hover:bg-danger/10"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
