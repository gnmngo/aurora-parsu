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

async function testAll() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('--- DATABASE DIAGNOSTICS LOGS ---');

    // 1. Check if search_projects function runs now!
    try {
      const searchRes = await client.query(`
        SELECT * FROM public.search_projects(
          p_query := '',
          p_status := NULL,
          p_stage_id := NULL,
          p_academic_year := NULL,
          p_limit := 10,
          p_offset := 0
        );
      `);
      console.log('1. search_projects() execution: SUCCESS. Rows count:', searchRes.rowCount);
    } catch (searchErr) {
      console.error('1. search_projects() execution: FAILED.');
      console.error(searchErr);
    }

    // 2. Check if annotation_history and project_workflow_history tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('annotation_history', 'project_workflow_history', 'programs');
    `);
    console.log('2. Newly created tables found:');
    console.log(tablesCheck.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Connection failure:', err);
  } finally {
    await client.end();
  }
}

testAll();
