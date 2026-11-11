"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ACRONYM_MEANING } from "@/constants/app";

interface AuroraLoaderProps {
  fullscreen?: boolean;
  message?: string;
  subtext?: string;
  showBrandText?: boolean;
  className?: string;
  onFinish?: () => void;
  minDurationMs?: number;
}

const DEFAULT_MESSAGES = [
  "Connecting to Partido State University Secure Cloud...",
  "Initializing Paperless Academic Defense Engine...",
  "Verifying College Academic Dockets & RLS Policies...",
  "Synchronizing Split-Screen Defense Workspace...",
  "Readying RA 8792 Cryptographic Signature Ledger...",
];

export function AuroraLoader({
  fullscreen = true,
  message,
  subtext,
  showBrandText = true,
  className,
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

  // Cycle status messages
  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [message]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 600);
  };

  const activeMessage = !isOnline
    ? "Internet connection interrupted. Awaiting network reconnection..."
    : message || DEFAULT_MESSAGES[currentMsgIndex];

  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-md w-full z-10">
      {/* Background Aurora Ambient Lights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/25 via-teal-400/20 to-cyan-500/20 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-emerald-500/15 blur-[90px] pointer-events-none" />

      {/* Pulsing Outer Aurora Rings */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Shimmering ripple ring 1 */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute h-36 w-36 rounded-3xl bg-gradient-to-tr from-emerald-500/30 via-cyan-400/30 to-violet-500/30 blur-md pointer-events-none"
        />

        {/* Shimmering ripple ring 2 */}
        <motion.div
          animate={{
            rotate: [0, 180, 360],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute h-40 w-40 rounded-full border border-emerald-400/30 border-dashed pointer-events-none"
        />

        {/* Floating Sparkle Accents */}
        <motion.div
          animate={{
            y: [-4, 4, -4],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2 text-emerald-400 z-20"
        >
          <Sparkles className="h-5 w-5 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </motion.div>

        <motion.div
          animate={{
            y: [4, -4, 4],
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-1 -left-2 text-cyan-400 z-20"
        >
          <Sparkles className="h-4 w-4 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        </motion.div>

        {/* Main Logo Container */}
        <motion.div
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-28 w-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/50 bg-slate-950 p-1 ring-4 ring-emerald-500/20"
        >
          <div className="relative h-full w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
            <Image
              src="/aurora-hero-logo.jpg"
              alt="AURORA Emblem"
              fill
              sizes="112px"
              priority
              className="object-cover scale-105"
            />
            {/* Shimmer sweep reflection */}
            <motion.div
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: "easeInOut",
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
            />
          </div>
        </motion.div>
      </div>

      {/* Brand Name & Typography */}
      {showBrandText && (
        <div className="mb-4 space-y-1">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <h1 className="text-3xl font-black tracking-widest uppercase bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.35)]">
              AURORA
            </h1>
          </motion.div>

          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/90">
            Partido State University
          </p>

          <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
            {subtext || APP_ACRONYM_MEANING}
          </p>
        </div>
      )}

      {/* Dynamic Progress Bar */}
      <div className="w-56 h-1.5 rounded-full bg-slate-800/80 overflow-hidden relative mb-3 border border-emerald-500/20">
        <motion.div
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]"
        />
      </div>

      {/* Live Status Message & Connection Indicator */}
      <div className="min-h-[28px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMessage}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            {!isOnline ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <WifiOff className="h-3.5 w-3.5 shrink-0 animate-bounce" />
                <span>{activeMessage}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="truncate max-w-[280px] sm:max-w-sm">{activeMessage}</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Offline Action Controls */}
      {!isOnline && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleRetry}
          disabled={isRetrying}
          className="mt-4 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          <span>{isRetrying ? "Retrying Connection..." : "Retry Connection"}</span>
        </motion.button>
      )}

      {/* System Security Guarantee Badge */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
        <span>RA 8792 Secured Academic System</span>
      </div>
    </div>
  );

  if (!fullscreen) {
    return (
      <div className={cn("relative flex items-center justify-center p-8 bg-slate-950/60 rounded-2xl backdrop-blur-md border border-slate-800/80 shadow-2xl", className)}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 text-white overflow-hidden",
        "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black",
        className
      )}
    >
      {content}
    </div>
  );
}

export default AuroraLoader;
