"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

export default function SettingsPage() {
  const { profile, signOut, isLoading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Security / Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setDepartmentId((profile as any).department_id || "");
    }
  }, [profile]);

  useEffect(() => {
    async function loadDepartments() {
      const { data } = await supabase
        .from("departments")
        .select("id, name, code, colleges(name, code)")
        .order("name");
      if (data) {
        setDepartments(data);
      }
    }
    loadDepartments();
  }, [supabase]);

  if (authLoading || !profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

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
          department_id: departmentId || null,
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // 1. Verify current credentials against Supabase Auth
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword.trim(),
      });

      if (verifyErr) {
        throw new Error("Current password is incorrect.");
      }

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateErr) throw updateErr;

      // 3. Log event
      try {
        await supabase.rpc("log_auth_event", {
          p_user_email: profile.email,
          p_profile_id: profile.id,
          p_action: "UPDATE",
          p_description: "Password updated from Account Settings",
          p_ip_address: "127.0.0.1",
          p_user_agent: window.navigator.userAgent,
        });
      } catch {}

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
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
            <label className="text-xs text-muted-foreground font-bold">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code}) {d.colleges?.code ? `• ${d.colleges.code}` : ""}
                </option>
              ))}
            </select>
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
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Security & Password
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ensure your account uses a secure password to protect academic evaluation integrity.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Current Password</label>
              <div className="relative mt-1">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground font-semibold">New Password</label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold">Confirm New Password</label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
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
