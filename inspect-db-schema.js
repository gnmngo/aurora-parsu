const { Client } = require('pg');

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

async function run() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED');

    // Get list of tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', tablesRes.rows.map(r => r.table_name));

    // For some important tables, get columns and details
    const targetTables = ['profiles', 'roles', 'user_roles', 'evaluations', 'projects', 'project_members', 'rubrics', 'rubric_templates', 'grading_templates'];
    for (const table of targetTables) {
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.log(`\nTable ${table} columns:`);
      console.table(colRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
