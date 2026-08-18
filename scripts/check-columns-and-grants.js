require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function checkCols() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const getCols = async (t) => {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\nColumns for ${t}:`, res.rows.map(r => `${r.column_name} (${r.data_type}, null:${r.is_nullable})`));
  };

  await getCols("projects");
  await getCols("annotations");
  await getCols("workflow_history");
  await getCols("digital_signatures");

  // Also check grants
  const grants = await client.query(`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' 
      AND table_name IN ('workflow_history', 'digital_signatures', 'signature_profiles', 'certificate_verifications')
      AND grantee IN ('anon', 'authenticated', 'service_role');
  `);
  console.log("\nGrants for new tables:", grants.rows);

  await client.end();
}

checkCols();
