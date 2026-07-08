const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 5432; // Session Mode for DDL
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function runMigration() {
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260610000004_rubric_templates.sql');
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
    console.log('Running migration DDL commands for rubric templates upgrade...');
    await client.query(sqlContent);
    console.log('✔ Migration executed successfully!');
    
    // Run validation queries to verify creation
    console.log('Running validation queries...');
    
    // Check if table exists
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rubric_templates'
      );
    `);
    console.log(`- Table 'rubric_templates' exists: ${rows[0].exists}`);

    // Check if evaluations columns were updated
    const { rows: colCheck } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'evaluations' AND column_name IN ('rubric_template_id', 'scores');
    `);
    console.log(`- Evaluations columns check:`, colCheck);

  } catch (err) {
    console.error('❌ Migration execution error:', err.message);
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

runMigration();
