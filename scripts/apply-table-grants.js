require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function applyGrants() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL for table grants...\n");

  const tables = [
    "workflow_history",
    "digital_signatures",
    "signature_profiles",
    "certificate_verifications",
    "project_score_cache",
  ];

  for (const t of tables) {
    try {
      await client.query(`
        GRANT ALL ON TABLE public.${t} TO anon, authenticated, service_role;
      `);
      console.log(`Granted ALL on ${t} to anon, authenticated, service_role`);
    } catch (e) {
      console.error(`Error granting on ${t}:`, e.message);
    }
  }

  try {
    await client.query(`
      GRANT USAGE, SELECT ON SEQUENCE evaluation_serial_seq TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION generate_certificate_serial() TO anon, authenticated, service_role;
    `);
    console.log("Granted usage on evaluation_serial_seq and generate_certificate_serial()");
  } catch (e) {
    console.error("Error granting on sequence/function:", e.message);
  }

  await client.end();
  console.log("\nGrants applied successfully.");
}

applyGrants();
