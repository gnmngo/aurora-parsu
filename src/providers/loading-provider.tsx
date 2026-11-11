"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuroraLoader } from "@/components/ui/aurora-loader";

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  startLoading: (customMessage?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(action: () => Promise<T>, customMessage?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  message: "",
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (action) => await action(),
});

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const pathname = usePathname();

  const startLoading = useCallback((customMessage?: string) => {
    setMessage(customMessage || "");
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setMessage("");
  }, []);

  // Safeguard 1: Auto-dismiss when navigating between routes (e.g. /login -> /dashboard)
  useEffect(() => {
    setIsLoading(false);
    setMessage("");
  }, [pathname]);

  // Safeguard 2: Auto-dismiss watchdog timeout (max 5 seconds) to prevent locking the screen
  useEffect(() => {
    if (!isLoading) return;
    const watchdogTimer = setTimeout(() => {
      setIsLoading(false);
      setMessage("");
    }, 5000);
    return () => clearTimeout(watchdogTimer);
  }, [isLoading]);

  const withLoading = useCallback(
    async <T,>(action: () => Promise<T>, customMessage?: string): Promise<T> => {
      startLoading(customMessage);
      try {
        const result = await action();
        return result;
      } finally {
        setTimeout(() => {
          stopLoading();
        }, 400);
      }
    },
    [startLoading, stopLoading]
  );

  return (
    <LoadingContext.Provider value={{ isLoading, message, startLoading, stopLoading, withLoading }}>
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="aurora-global-overlay-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999]"
          >
            <AuroraLoader
              fullscreen={true}
              message={message || undefined}
              onDismiss={stopLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  return useContext(LoadingContext);
}
