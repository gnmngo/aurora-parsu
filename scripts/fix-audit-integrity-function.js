require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function fixAuditIntegrityTrigger() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL...");

  const sql = `
    CREATE OR REPLACE FUNCTION compute_audit_integrity_hash()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $$
    DECLARE
      prev_hash VARCHAR(64);
    BEGIN
      SELECT integrity_hash INTO prev_hash
      FROM audit_logs
      WHERE academic_year = NEW.academic_year
      ORDER BY created_at DESC
      LIMIT 1;

      NEW.integrity_hash = encode(
        extensions.digest(
          COALESCE(prev_hash, '') ||
          COALESCE(NEW.id::text, '') ||
          NEW.created_at::text ||
          COALESCE(NEW.profile_id::text, '') ||
          NEW.action_type::text ||
          COALESCE(NEW.new_value::text, ''),
          'sha256'
        ),
        'hex'
      );
      RETURN NEW;
    END;
    $$;
  `;

  await client.query(sql);
  console.log("compute_audit_integrity_hash fixed with extensions.digest and search_path.");
  await client.end();
}

fixAuditIntegrityTrigger();
