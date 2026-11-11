"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MinimalSpinner - Apple / Linear / Stripe inspired circular spinner.
 * Thin stroke (2.5px), subdued track, Royal Blue primary accent (#2563eb).
 */
export function MinimalSpinner({
  size = "md",
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeMap = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-11 w-11",
  };
  const strokeWidth = size === "xs" || size === "sm" ? 3 : 2.5;

  return (
    <svg
      className={cn("animate-spin text-primary", sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-20 stroke-current text-slate-400 dark:text-slate-600"
        cx="12"
        cy="12"
        r="10"
        strokeWidth={strokeWidth}
      />
      <path
        className="opacity-100 stroke-current text-primary"
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="16 48"
        d="M12 2a10 10 0 0 1 10 10"
      />
    </svg>
  );
}

/**
 * ThreeDotsLoader - Subtle three-dot animation with smooth opacity transitions.
 */
export function ThreeDotsLoader({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "rounded-full bg-primary inline-block animate-pulse",
            dotSizes[size]
          )}
          style={{
            animationDuration: "1s",
            animationDelay: `${i * 180}ms`,
            animationTimingFunction: "ease-in-out",
          }}
        />
      ))}
    </div>
  );
}

/**
 * ThinProgressBar - Elegant 2px indeterminate progress line.
 */
export function ThinProgressBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-0.5 w-full bg-slate-200/60 dark:bg-slate-800/80 overflow-hidden relative rounded-full",
        className
      )}
      role="progressbar"
      aria-label="Loading"
    >
      <motion.div
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 bottom-0 w-1/2 bg-primary rounded-full"
      />
    </div>
  );
}

interface AuroraLoaderProps {
  fullscreen?: boolean;
  variant?: "spinner" | "dots" | "bar";
  message?: string;
  subtext?: string;
  showBrandText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const DEFAULT_STARTUP_MESSAGES = [
  "Connecting to Partido State University Secure Cloud...",
  "Initializing Paperless Academic Defense Engine...",
  "Verifying College Academic Dockets & RLS Policies...",
  "Synchronizing Split-Screen Defense Workspace...",
  "Readying RA 8792 Cryptographic Signature Ledger...",
];

export function AuroraLoader({
  fullscreen = true,
  variant = "spinner",
  message,
  subtext,
  showBrandText = true,
  className,
  size = "md",
}: AuroraLoaderProps) {
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cycle status messages gently only if no specific message is provided
  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % DEFAULT_STARTUP_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [message]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 500);
  };

  const activeMessage = !isOnline
    ? "Internet connection interrupted. Awaiting network reconnection..."
    : message || DEFAULT_STARTUP_MESSAGES[currentMsgIndex];

  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-sm w-full z-10">
      {/* Understated Branding: Small 36px original logo squircle */}
      {showBrandText && (
        <div className="flex flex-col items-center mb-6 space-y-2">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-border/80 bg-card shadow-xs p-1 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="AURORA"
              width={32}
              height={32}
              priority
              className="object-contain"
            />
          </div>

          <div className="space-y-0.5">
            <h1 className="text-sm font-bold tracking-wider uppercase font-display text-foreground">
              AURORA
            </h1>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Partido State University
            </p>
          </div>
        </div>
      )}

      {/* Minimalist Loading Indicator (Apple/Linear/Stripe Style) */}
      <div className="relative flex items-center justify-center mb-4 min-h-[36px]">
        {variant === "dots" ? (
          <ThreeDotsLoader size={size} />
        ) : (
          <MinimalSpinner size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
        )}
      </div>

      {/* Thin Animated Progress Indicator */}
      <div className="w-40 mb-3">
        <ThinProgressBar />
      </div>

      {/* Status Message with Smooth Fade Transition */}
      <div className="min-h-[22px] flex items-center justify-center max-w-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMessage}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-muted-foreground text-center"
          >
            {!isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-amber-500 font-semibold">
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                <span>{activeMessage}</span>
              </span>
            ) : (
              <span className="truncate block max-w-[260px] sm:max-w-xs">
                {activeMessage}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Optional Subtext */}
      {subtext && isOnline && (
        <p className="mt-1 text-[10px] text-muted-foreground/70 font-normal max-w-xs">
          {subtext}
        </p>
      )}

      {/* Offline Action Controls */}
      {!isOnline && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="mt-3 px-3 py-1 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
          <span>{isRetrying ? "Retrying..." : "Retry Connection"}</span>
        </button>
      )}

      {/* Understated Security Guarantee */}
      {showBrandText && (
        <div className="mt-6 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 tracking-wide">
          <ShieldCheck className="h-3 w-3 text-muted-foreground/60" />
          <span>RA 8792 Secured Academic System</span>
        </div>
      )}
    </div>
  );

  if (!fullscreen) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center p-6 bg-card/50 rounded-xl border border-border/60",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-md text-foreground transition-colors duration-200",
        className
      )}
    >
      {content}
    </div>
  );
}

export default AuroraLoader;
