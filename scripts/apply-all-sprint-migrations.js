require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const HOST = "aws-1-ap-southeast-2.pooler.supabase.com";
const USER = "postgres.faxzubfvjsekizeiiocg";
const DATABASE = "postgres";
const PORT = 6543;
const PASSWORD = process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB";

const MIGRATIONS = [
  "001_fix_evaluations_unique_constraint.sql",
  "002_enable_project_score_rls.sql",
  "003_certificate_serial_sequence.sql",
  "004_notification_index.sql",
  "005_defense_schedules_write_rls.sql",
  "006_documents_update_rls.sql",
  "007_adviser_approval_status_check.sql",
  "008_manuscripts_storage_delete_policy.sql",
  "009_college_dean_role.sql",
  "010_workflow_history.sql",
  "011_signature_profiles.sql",
  "012_digital_signatures.sql",
];

async function applyMigrations() {
  const client = new Client({
    host: HOST,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    port: PORT,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL Pooler.\n");

    const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

    for (const filename of MIGRATIONS) {
      const filePath = path.join(migrationsDir, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`[SKIP] Migration file not found: ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`[APPLYING] ${filename}...`);
      try {
        await client.query(sql);
        console.log(`[SUCCESS]  ${filename} applied successfully.\n`);
      } catch (err) {
        console.error(`[ERROR]    ${filename}: ${err.message}\n`);
      }
    }

    console.log("=== All migrations processed. ===");
  } catch (err) {
    console.error("Connection error:", err.message);
  } finally {
    await client.end();
  }
}

applyMigrations();
