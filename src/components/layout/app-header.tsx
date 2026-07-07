"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, Search, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function AppHeader({ title, onMenuClick }: AppHeaderProps) {
  const { profile, roles, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("notifications_compat")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    // Set up realtime notification updates
    const channel = supabase
      .channel("unread-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profile.id}`,
        },
        () => {
          fetchUnreadCount();
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

      <div className="relative ml-auto flex max-w-md flex-1 items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search defenses, students, documents..."
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-card"
        />
      </div>

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

      <div className="flex items-center gap-3">
        {profile && (
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium">
              {profile.first_name} {profile.last_name}
            </p>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {roles[0]?.replace("_", " ") || "Guest"}
            </Badge>
          </div>
        )}
        <Avatar className="h-9 w-9 ring-2 ring-border">
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
