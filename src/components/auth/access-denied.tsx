"use client";

import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-lg max-w-md mx-auto my-16 space-y-6">
      <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted (403)</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          Your profile roles do not possess permission to view this resource. If you believe this is in error, please contact your department coordinator.
        </p>
      </div>
      <Link href="/dashboard" passHref legacyBehavior>
        <Button className="rounded-xl h-10 px-6 cursor-pointer">
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
