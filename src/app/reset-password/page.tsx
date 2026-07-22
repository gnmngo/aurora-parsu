"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  /**
   * Supabase fires PASSWORD_RECOVERY auth event when the user arrives
   * via the reset email link. The token is exchanged via the callback route.
   * We listen for this event to confirm the reset session is active.
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setIsReady(true);
        } else if (event === "SIGNED_IN" && session) {
          // Sometimes fires instead of PASSWORD_RECOVERY
          setIsReady(true);
        }
      }
    );

    // Also check if we already have a session (user arrived from callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setIsComplete(true);
      toast.success("Password updated successfully!");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-[400px] bg-card/80 backdrop-blur-xl border-border shadow-2xl relative z-10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-inner">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">
              Set New Password
            </h1>
            <p className="text-sm text-muted-foreground">
              AURORA — Academic Defense Workflow System
            </p>
          </div>

          {isComplete ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Password Updated!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting you to the dashboard...
                </p>
              </div>
              <Loader2 className="animate-spin w-5 h-5 text-primary mx-auto" />
            </div>
          ) : !isReady ? (
            <div className="text-center space-y-3 py-4">
              <Loader2 className="animate-spin w-6 h-6 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Verifying your reset link...
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1">
                <label
                  className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
                  htmlFor="new-password"
                >
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-xl bg-background/50 border-border pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
                  htmlFor="confirm-password"
                >
                  Confirm New Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="h-10 rounded-xl bg-background/50 border-border"
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Updating Password...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-6 text-center w-full text-xs text-muted-foreground/60 font-medium">
        <p>© 2026 Partido State University</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
