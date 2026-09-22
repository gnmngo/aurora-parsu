const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../node_modules/pg'));

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260916000001_multi_program_customization.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Applying 20260916000001_multi_program_customization.sql...');
    await client.query(sql);
    console.log('SUCCESS: Multi-program customization schema, default workflow, stages, and rubrics applied successfully!');
  } catch (err) {
    console.error('ERROR applying migration:', err.message);
  } finally {
    await client.end();
  }
}
run();
