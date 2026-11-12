"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Printer, Sun, Moon } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

interface VerifyHeaderProps {
  isValid: boolean;
}

export function VerifyHeader({ isValid }: VerifyHeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="w-full max-w-3xl mx-auto flex items-center justify-between mb-8 print:hidden">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-3 group select-none">
        <div className="relative h-7 w-7 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          <Image
            src="/aurora-symbol-transparent.png"
            alt="AURORA Symbol"
            width={28}
            height={28}
            priority
            className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-[0.25em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
              AURORA
            </span>
            <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
              Verify
            </span>
          </div>
          <span className="text-[8px] font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
            Partido State University
          </span>
        </div>
      </Link>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181c] dark:hover:bg-[#222226] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#27272a] shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Search Another</span>
        </Link>

        {isValid && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181c] dark:hover:bg-[#222226] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#27272a] cursor-pointer shadow-2xs"
            title="Print official verification summary"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Summary</span>
          </button>
        )}

        {/* Theme Toggle */}
        {mounted && (
          <button
            type="button"
            onClick={toggleTheme}
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-[#27272a] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#18181c] transition-colors cursor-pointer"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
      </div>
    </nav>
  );
}
