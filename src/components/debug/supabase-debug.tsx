"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SupabaseDebug() {
  useEffect(() => {
    (window as Window & { supabase?: typeof supabase }).supabase = supabase;
    console.log("✅ Supabase singleton attached to window.supabase");
  }, []);

  return null;
}
