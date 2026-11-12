"use client";

import { useEffect } from "react";

/**
 * Custom hook to subscribe a component to the global Live Sync/Refresher.
 * When the user clicks the "Sync Data" button in the App Header,
 * or when the tab regains focus after being in the background,
 * this hook triggers the provided refresh callback without requiring a full page reload.
 *
 * @param onRefresh - Function to re-fetch component data
 * @param enabled - Whether the listener is active (defaults to true)
 */
export function useLiveRefresh(
  onRefresh: () => void | Promise<void>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => {
      try {
        onRefresh();
      } catch (err) {
        console.warn("[useLiveRefresh] Refresh execution error:", err);
      }
    };

    window.addEventListener("aurora:refresh", handleRefresh);

    return () => {
      window.removeEventListener("aurora:refresh", handleRefresh);
    };
  }, [onRefresh, enabled]);
}
