/**
 * AURORA Sprint 2 — Live Database Migration Verification
 * Run from project root: node sprint2-live-verify.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("*").limit(1);
  if (error && (error.code === "42P01" || (error.message && error.message.includes("does not exist")))) return false;
  return true;
}

async function roleExists(code) {
  const { data } = await supabase.from("roles").select("code").eq("code", code).maybeSingle();
  return !!data;
}

async function main() {
  const sep = "=".repeat(60);
  console.log(sep);
  console.log("AURORA Sprint 2 — Live DB Migration Verification");
  console.log("Timestamp:", new Date().toISOString());
  console.log(sep + "\n");

  const checks = [
    { id: "009", label: "college_dean role in roles table", fn: () => roleExists("college_dean") },
    { id: "010", label: "workflow_history table", fn: () => tableExists("workflow_history") },
    { id: "011", label: "signature_profiles table", fn: () => tableExists("signature_profiles") },
    { id: "012a", label: "digital_signatures table", fn: () => tableExists("digital_signatures") },
    { id: "012b", label: "certificate_verifications table", fn: () => tableExists("certificate_verifications") },
    { id: "base", label: "evaluations table (base schema)", fn: () => tableExists("evaluations") },
    { id: "002", label: "project_score_cache table", fn: () => tableExists("project_score_cache") },
    { id: "005", label: "defense_schedules table", fn: () => tableExists("defense_schedules") },
    { id: "notif", label: "notifications table", fn: () => tableExists("notifications") },
  ];

  const pending = [];
  for (const c of checks) {
    const exists = await c.fn();
    const status = exists ? "OK  " : "NEED";
    console.log(`[${c.id.padEnd(5)}] ${status === "OK  " ? "OK  " : "NEED"} ${c.label}`);
    if (!exists) pending.push(c);
  }

  // Test DB function
  try {
    const { data, error } = await supabase.rpc("generate_certificate_serial").single();
    if (error) throw error;
    console.log("[003  ] OK   generate_certificate_serial() -> " + data);
  } catch (e) {
    console.log("[003  ] NEED generate_certificate_serial() - " + e.message);
    pending.push({ id: "003", label: "generate_certificate_serial() RPC function" });
  }

  console.log("\n" + sep);
  if (pending.length === 0) {
    console.log("ALL MIGRATIONS APPLIED.");
  } else {
    console.log("PENDING MIGRATIONS: " + pending.map(p => p.id).join(", "));
    console.log("Apply in order: 001 -> 002 -> 003 -> ... -> 012");
    console.log("Location: supabase/migrations/");
  }
  console.log(sep);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
