const path = require('path');
const { Client } = require(path.join(__dirname, '../node_modules/pg'));

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function run() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('--- DEFENSE STAGES CONSTRAINTS ---');
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'defense_stages'::regclass;
    `);
    console.log(res.rows);

    console.log('--- EXISTING STAGE CODES ---');
    const stages = await client.query('SELECT id, code, name, workflow_template_id FROM defense_stages');
    console.log(stages.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}
run();
