require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

const HOST = "aws-1-ap-southeast-2.pooler.supabase.com";
const USER = "postgres.faxzubfvjsekizeiiocg";
const DATABASE = "postgres";
const PORT = 6543;
const PASSWORD = process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB";

async function inspectDb() {
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
    console.log("Connected to PostgreSQL successfully.\n");

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Existing Public Tables:", tablesRes.rows.map(r => r.table_name));

    const funcsRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);
    console.log("\nExisting Public Functions:", funcsRes.rows.map(r => r.routine_name));

    const seqsRes = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);
    console.log("\nExisting Sequences:", seqsRes.rows.map(r => r.sequence_name));

  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

inspectDb();
