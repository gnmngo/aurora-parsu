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
  useHeroImage?: boolean;
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
  useHeroImage = true,
}: AuroraLogoProps) {
  const [imageError, setImageError] = useState(false);

  const dimension = typeof size === "number" ? size : SIZE_MAP[size].px;
  const iconClass = typeof size === "number" ? "h-5 w-5" : SIZE_MAP[size].iconSize;
  const tooltipText = title ?? `AURORA — ${APP_ACRONYM_MEANING}`;

  const imageSrc = useHeroImage && !imageError ? "/aurora-hero-logo.jpg" : "/logo.png";

  return (
    <div
      title={tooltipText}
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
    >
      <div
        style={{ width: dimension, height: dimension }}
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 border border-emerald-500/30 shadow-md transition-all hover:border-emerald-400"
      >
        {!imageError ? (
          <Image
            src={imageSrc}
            alt="AURORA Logo"
            width={dimension}
            height={dimension}
            className="h-full w-full object-cover scale-105"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <Sparkles className={cn(iconClass, "text-emerald-400")} />
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
