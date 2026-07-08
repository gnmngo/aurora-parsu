const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 5432; // Session Mode for DDL
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function runMigration() {
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260610000003_event_cache_upgrade.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration SQL file not found at:', sqlPath);
    return;
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  let client = null;

  console.log('Connecting to remote database via Session Mode (port 5432)...');
  try {
    client = new Client({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
      port: PORT,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000
    });

    await client.connect();
    console.log('Successfully connected to remote PostgreSQL database!');
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    if (client) {
      await client.end().catch(() => {});
    }
    return;
  }

  try {
    console.log('Running migration DDL commands...');
    // We split by ';' but since some functions might contain semicolons inside $$...$$, we have to be careful.
    // However, in Postgres, if we execute the entire sql file or use a simple split/regex, we can handle it.
    // Alternatively, pg client allows executing multiple queries in a single query() call if we pass the whole string.
    // Let's pass the whole string to client.query()! That handles semicolons in trigger functions perfectly!
    await client.query(sqlContent);
    console.log('✔ Migration executed successfully!');
    
    // Run validation queries to verify creation
    console.log('Running validation queries...');
    
    // Check if tables exist
    const tablesToCheck = ['evaluation_events', 'project_score_cache'];
    for (const table of tablesToCheck) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [table]);
      console.log(`- Table '${table}' exists: ${rows[0].exists}`);
    }

    // Check if views exist
    const viewsToCheck = ['panel_consensus_summary', 'revision_compliance_metrics', 'project_readiness_status'];
    for (const view of viewsToCheck) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [view]);
      console.log(`- View '${view}' exists: ${rows[0].exists}`);
    }

    // Check trigger exists on evaluation_events
    const { rows: triggerCheck } = await client.query(`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgrelid = 'public.evaluation_events'::regclass AND tgname = 'tr_process_evaluation_event';
    `);
    console.log(`- Trigger 'tr_process_evaluation_event' exists:`, triggerCheck.length > 0);

  } catch (err) {
    console.error('❌ Migration execution error:', err.message);
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

runMigration();
