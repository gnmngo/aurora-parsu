const fs = require('fs');
const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function run() {
  const sql = fs.readFileSync('c:/Users/Acer/Projects/aurora-parsu/supabase/migrations/20260708000001_final_stabilization.sql', 'utf8');
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}
run();
