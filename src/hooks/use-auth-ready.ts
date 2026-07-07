"use client";

import { useAuth } from "@/hooks/use-auth";

/** True when auth session and approved profile are fully loaded */
export function useAuthReady(): {
  isReady: boolean;
  isLoading: boolean;
  session: ReturnType<typeof useAuth>["session"];
} {
  const { session, profile, isLoading } = useAuth();

  return {
    isReady: !isLoading && !!session && !!profile,
    isLoading,
    session,
  };
}
