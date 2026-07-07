"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { profile, signOut, isLoading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  if (authLoading || !profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const departmentName = (profile as any).departments?.name || "General Department";

  const handleSaveChanges = async () => {
    if (!firstName || !lastName) {
      toast.error("First name and Last name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Log Profile Update Event
      await supabase.rpc("log_auth_event", {
        p_user_email: profile.email,
        p_profile_id: profile.id,
        p_action: "UPDATE",
        p_description: `Updated profile details. Name: ${firstName} ${lastName}`,
        p_ip_address: "127.0.0.1",
        p_user_agent: window.navigator.userAgent,
      });

      toast.success("Profile updated successfully!");
      // Reload page or let context fetch update
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input defaultValue={profile.email} className="mt-1" disabled />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Department</label>
            <Input defaultValue={departmentName} className="mt-1" disabled />
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "New comments on manuscripts",
            "Defense schedule updates",
            "Grade releases",
            "Revision requests",
          ].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-sm">{item}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-red-200 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            After signing out, you will need to re-authenticate to access your papers, annotation logs, or grades.
          </p>
          <Button variant="danger" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
