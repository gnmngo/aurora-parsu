"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { APP_NAME, INSTITUTION } from "@/constants/app";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success("Password recovery link has been sent to your email.");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{INSTITUTION}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {!isSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="name@parsu.edu.ph"
                    className="mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-success">
                    Email Sent!
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    We have sent a password reset link to <strong>{email}</strong>.
                    Please check your inbox and spam folders.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSent(false)}
                >
                  Enter a different email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            ← Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
