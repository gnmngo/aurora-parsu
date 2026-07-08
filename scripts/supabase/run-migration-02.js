const fs = require('fs');
const path = require('path');
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
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260610000001_auth_roles_extension.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration SQL file not found at:', sqlPath);
    return;
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.connect();
    console.log('Successfully connected to remote database for Module 02 migration...');

    // 1. Run the ALTER TYPE statements individually outside transaction
    console.log('Applying ALTER TYPE user_status statements...');
    await client.query("ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending'");
    await client.query("ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'approved'");
    await client.query("ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected'");
    console.log('✔ Enum values added successfully.');

    // 2. We extract the rest of the SQL script. 
    // We can run the rest as a single query since pg allows multiple statements in one query.
    // Let's strip the ALTER TYPE statements from the script content to avoid running them again in transaction.
    const restOfSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('ALTER TYPE user_status ADD VALUE'))
      .join('\n');

    console.log('Running remaining Module 02 schema queries...');
    await client.query(restOfSql);
    console.log('✔ Module 02 migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
