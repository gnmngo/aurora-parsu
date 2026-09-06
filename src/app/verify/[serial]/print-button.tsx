"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/15 cursor-pointer shadow-sm"
      title="Print official verification summary"
    >
      <Printer className="h-3.5 w-3.5" />
      <span>Print Summary</span>
    </button>
  );
}
