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
    console.log('Inspecting rules on audit_logs...');
    
    const { rows: rulesBefore } = await client.query(`
      SELECT rulename, pg_get_ruledef(r.oid) as definition 
      FROM pg_rewrite r
      JOIN pg_class c ON r.ev_class = c.oid
      WHERE c.relname = 'audit_logs';
    `);
    console.log('Rules before drop:', rulesBefore);

    console.log('Attempting to drop audit_no_delete...');
    await client.query('DROP RULE IF EXISTS audit_no_delete ON audit_logs;');
    console.log('Dropped successfully.');

    const { rows: rulesAfter } = await client.query(`
      SELECT rulename, pg_get_ruledef(r.oid) as definition 
      FROM pg_rewrite r
      JOIN pg_class c ON r.ev_class = c.oid
      WHERE c.relname = 'audit_logs';
    `);
    console.log('Rules after drop:', rulesAfter);

    console.log('Recreating audit_no_delete...');
    await client.query('CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;');
    console.log('Recreated successfully.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
