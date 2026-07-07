"use client";

import { useEffect, useState } from "react";
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
  Loader2
} from "lucide-react";
import { toast } from "sonner";

const typeIcons = {
  comment: MessageSquare,
  schedule: Calendar,
  grade_released: Award,
  revision_requested: AlertTriangle,
  system: Bell,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const supabase = createClient();

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", session.user.id)
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
  }, [supabase]);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("profile_id", session.user.id)
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
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 w-fit">
              <button
                onClick={() => setFilterTab("all")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  filterTab === "all" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                )}
              >
                Inbox
              </button>
              <button
                onClick={() => setFilterTab("unread")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  filterTab === "unread" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                )}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterTab("archived")}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  filterTab === "archived" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-slate-800"
                )}
              >
                Archived
              </button>
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase text-muted-foreground">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-[10px] font-bold focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="comment">Comments / Revisions</option>
                <option value="schedule">Schedules</option>
                <option value="grade_released">Grades</option>
                <option value="system">System Alerts</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search notifications title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                className={cn(
                  "transition-all border border-border/80",
                  !isRead && "border-primary/20 bg-primary/5 shadow-sm"
                )}
              >
                <CardContent className="flex gap-4 p-4 items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      !isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {notif.title}
                      </p>
                      {!isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                      {notif.message}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground font-semibold">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Actions buttons on card hover/side */}
                  <div className="flex items-center gap-1.5 print:hidden">
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
