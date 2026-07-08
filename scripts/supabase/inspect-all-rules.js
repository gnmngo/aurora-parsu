const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Querying all rewrite rules in public schema...');
    
    const { rows } = await client.query(`
      SELECT c.relname as table_name, rulename, pg_get_ruledef(r.oid) as definition 
      FROM pg_rewrite r
      JOIN pg_class c ON r.ev_class = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND rulename NOT LIKE '_RETURN';
    `);
    console.log('Rules found:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
