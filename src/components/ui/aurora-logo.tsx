"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuroraLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showText?: boolean;
  textColor?: string;
  subtext?: string;
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
}: AuroraLogoProps) {
  const [imageError, setImageError] = useState(false);

  const dimension = typeof size === "number" ? size : SIZE_MAP[size].px;
  const iconClass = typeof size === "number" ? "h-5 w-5" : SIZE_MAP[size].iconSize;

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        style={{ width: dimension, height: dimension }}
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-sm transition-all"
      >
        {!imageError ? (
          <Image
            src="/logo.png"
            alt="AURORA Logo"
            width={dimension}
            height={dimension}
            className="h-full w-full object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <Sparkles className={cn(iconClass, "text-white")} />
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={cn("text-sm font-black tracking-wider uppercase font-display", textColor)}>
            AURORA
          </span>
          {subtext && (
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
