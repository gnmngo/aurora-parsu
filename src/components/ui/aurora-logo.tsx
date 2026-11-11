"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ACRONYM_MEANING } from "@/constants/app";

interface AuroraLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showText?: boolean;
  textColor?: string;
  subtext?: string;
  title?: string;
}

const SIZE_MAP = {
  sm: { px: 28, iconSize: "h-3.5 w-3.5" },
  md: { px: 36, iconSize: "h-5 w-5" },
  lg: { px: 48, iconSize: "h-6 w-6" },
  xl: { px: 64, iconSize: "h-8 w-8" },
};

export function AuroraLogo({
  size = "md",
  className,
  showText = false,
  textColor = "text-white",
  subtext,
  title,
}: AuroraLogoProps) {
  const dimension = typeof size === "number" ? size : SIZE_MAP[size].px;
  const tooltipText = title ?? `AURORA — ${APP_ACRONYM_MEANING}`;

  return (
    <div
      title={tooltipText}
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
    >
      <div
        style={{ width: dimension, height: dimension }}
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-900 dark:bg-black border border-white/10 p-1.5 shadow-sm transition-all"
      >
        <Image
          src="/aurora-symbol-transparent.png"
          alt="AURORA Geometric Logo"
          width={dimension}
          height={dimension}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-sm font-bold tracking-[0.2em] uppercase font-display", textColor)}>
              AURORA
            </span>
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider">
              Paperless
            </span>
          </div>
          {subtext && (
            <span className="text-[9px] font-medium uppercase tracking-widest opacity-60">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
