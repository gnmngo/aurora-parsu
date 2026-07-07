"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const { session, profile, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Safe delayed redirect only after confirmed session and profile are hydrated in provider
  useEffect(() => {
    if (!authLoading && session && profile) {
      console.log("LOGIN REDIRECT: Hydration confirmed. Redirecting to dashboard.");
      router.replace("/dashboard");
    }
  }, [session, profile, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      console.log("AUTH STEP 1: login attempt for", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("LOGIN ERROR (STEP 1):", error.message);
        toast.error(error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      if (!data.session) {
        console.error("LOGIN ERROR (STEP 1): No session returned");
        toast.error("Login failed: no session returned");
        setLoading(false);
        return;
      }

      console.log("AUTH STEP 2: session result received for", email);
      toast.success("Login successful");
      // Redirect is handled by the useEffect once the AuthProvider resolves loadUserProfile!
    } catch (err: any) {
      console.error("LOGIN EXCEPTION:", err);
      toast.error(err?.message || "Unexpected login error");
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    console.log("AUTH STEP 1: demo login attempt");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "panelist1@aurora.test",
        password: "Panel123!",
      });

      if (error) {
        console.error("DEMO LOGIN ERROR (STEP 1):", error.message);
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        console.error("DEMO LOGIN ERROR (STEP 1): No session returned");
        toast.error("Demo login failed: no session returned");
        setLoading(false);
        return;
      }

      console.log("AUTH STEP 2: demo session result received");
      toast.success("Logged in as demo user");
      // Redirect is handled by the useEffect once the AuthProvider resolves loadUserProfile!
    } catch (err: any) {
      console.error("DEMO LOGIN EXCEPTION:", err);
      toast.error(err?.message || "Demo login failed");
      setLoading(false);
    }
  };

  const isFormDisabled = loading || (!!session && authLoading);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-xl bg-black text-white">
          <Sparkles size={20} />
        </div>
        <h1 className="text-xl font-bold mt-3">AURORA</h1>
        <p className="text-sm text-muted-foreground">
          Academic Defense System
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isFormDisabled}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isFormDisabled}
            />

            <Button disabled={isFormDisabled} className="w-full" type="submit">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Signing in...
                </span>
              ) : (!!session && authLoading) ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Loading profile...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="my-4 text-center text-xs text-muted-foreground">
            or
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={isFormDisabled}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Loading...
              </span>
            ) : (!!session && authLoading) ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Loading profile...
              </span>
            ) : (
              "Demo Login"
            )}
          </Button>

          <p className="text-center text-xs mt-4 text-muted-foreground">
            <Link href="/">Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<p>Loading...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}