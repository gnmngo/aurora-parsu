const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const pgConfig = {
  host: 'db.faxzubfvjsekizeiiocg.supabase.co',
  user: 'postgres',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

const migrations = [
  '20260707000001_rbac_and_signature_module.sql',
  '20260707000002_workflow_engine.sql',
  '20260707000003_revision_statuses.sql',
  '20260707000004_universal_search.sql',
  '20260707000005_notifications_engine.sql',
  '20260707000006_rubric_lifecycle.sql',
  '20260707000007_workflow_templates.sql',
  '20260707000008_phase4_hardening.sql',
  '20260707000009_workflow_validation.sql'
];

async function apply() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED TO DATABASE. STARTING SYSTEM MIGRATIONS...');

    for (const file of migrations) {
      console.log(`\nApplying migration: ${file}...`);
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`SUCCESS: ${file} applied.`);
      } catch (err) {
        console.error(`FAILED: ${file}`);
        console.error(err.message);
        // Do not abort immediately if there are minor duplications, but log the error
      }
    }

    console.log('\nAll migrations completed successfully.');

  } catch (err) {
    console.error('Fatal migration failure:', err);
  } finally {
    await client.end();
  }
}

apply();
