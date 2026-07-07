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
    console.log('Querying triggers on audit_logs and projects...');
    
    const { rows } = await client.query(`
      SELECT 
        tgrelid::regclass as table_name,
        tgname as trigger_name,
        proname as function_name,
        tgtype
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgrelid::regclass::text IN ('audit_logs', 'projects')
        AND NOT tgisinternal;
    `);
    console.log('Triggers found:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
