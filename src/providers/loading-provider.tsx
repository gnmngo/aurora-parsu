"use client";

import React, { createContext, useContext, useState, useCallback, useTransition } from "react";
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
  const [, startTransition] = useTransition();

  const startLoading = useCallback((customMessage?: string) => {
    setMessage(customMessage || "");
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(
    async <T,>(action: () => Promise<T>, customMessage?: string): Promise<T> => {
      startLoading(customMessage);
      try {
        const result = await action();
        return result;
      } finally {
        // Minimum natural delay so the user clearly sees the beautiful AURORA transition
        setTimeout(() => {
          stopLoading();
        }, 600);
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99999]"
          >
            <AuroraLoader fullscreen={true} message={message || undefined} />
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  return useContext(LoadingContext);
}
