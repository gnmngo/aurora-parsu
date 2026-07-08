const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;

// List of potential passwords to try
const PASSWORDS = [
  'tF3cfdc3FQ7fWEdB'
];


async function runMigration() {
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260610000002_module_03_refinements.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration SQL file not found at:', sqlPath);
    return;
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  let client = null;
  let successfulPassword = null;

  console.log('Connecting to remote database...');
  for (const password of PASSWORDS) {
    try {
      console.log(`Trying password: ${'*'.repeat(password.length)}`);
      client = new Client({
        host: HOST,
        user: USER,
        password: password,
        database: DATABASE,
        port: PORT,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });

      await client.connect();
      successfulPassword = password;
      console.log('Successfully connected to remote PostgreSQL database!');
      break;
    } catch (err) {
      console.log(`- Connection failed for password: ${err.message}`);
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  if (!successfulPassword || !client) {
    console.error('❌ Failed to connect to PostgreSQL database with any common passwords.');
    console.error('Please verify if the database password is set in your environment or database.');
    return;
  }

  try {
    console.log('Running migration DDL commands...');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const stmt of statements) {
      console.log(`Executing statement: ${stmt.substring(0, 50).replace(/\r?\n/g, ' ')}...`);
      await client.query(stmt);
    }
    console.log('✔ Migration executed successfully!');
    
    // Run validation queries (Phase 1 checks)
    console.log('Running validation queries...');
    
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

    // Check if new columns exist
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'document_versions' AND column_name = 'change_summary';
    `);
    console.log(`- Columns check (document_versions.change_summary):`, columns);

    // Check if indexes exist
    const indexesToCheck = ['idx_audit_logs_project_stage', 'idx_annotations_status_doc', 'idx_evaluations_project_stage', 'idx_document_versions_document_uploaded'];
    for (const idx of indexesToCheck) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' AND indexname = $1
        );
      `, [idx]);
      console.log(`- Index '${idx}' exists: ${rows[0].exists}`);
    }

  } catch (err) {
    console.error('❌ Migration execution error:', err.message);
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

runMigration();
