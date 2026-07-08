const { Client } = require('pg');

const pgConfig = {
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
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
    console.log('Connected to Supabase PostgreSQL...');

    // 1. Check Tables and Row Counts
    console.log('\n--- TABLES CHECK ---');
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const { rows: tables } = await client.query(tableQuery);
    
    for (const t of tables) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM public."${t.table_name}";`);
        console.log(`- ${t.table_name}: ${countRes.rows[0].count} rows`);
      } catch (err) {
        console.log(`- ${t.table_name}: ERROR (${err.message})`);
      }
    }

    // 2. Check Triggers
    console.log('\n--- TRIGGERS CHECK ---');
    const triggerQuery = `
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      ORDER BY event_object_table, trigger_name;
    `;
    const { rows: triggers } = await client.query(triggerQuery);
    triggers.forEach(tr => {
      console.log(`- ${tr.event_object_table}.${tr.trigger_name} [${tr.event_manipulation}]: ${tr.action_statement.substring(0, 100)}...`);
    });

    // 3. Check RLS Policies
    console.log('\n--- RLS POLICIES CHECK ---');
    const rlsQuery = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    const { rows: rlsTables } = await client.query(rlsQuery);
    rlsTables.forEach(t => {
      console.log(`- ${t.tablename}: RLS ${t.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

    // 4. Check Storage Buckets
    console.log('\n--- STORAGE BUCKETS ---');
    try {
      const { rows: buckets } = await client.query(`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;`);
      buckets.forEach(b => {
        console.log(`- Bucket: ${b.name} (Public: ${b.public})`);
      });
    } catch (err) {
      console.log(`- Error checking buckets: ${err.message}`);
    }

    // 5. Check Realtime Publications
    console.log('\n--- REALTIME PUBLICATIONS ---');
    try {
      const { rows: pubs } = await client.query(`
        SELECT pubname, schemaname, tablename 
        FROM pg_publication_tables;
      `);
      if (pubs.length === 0) {
        console.log('- No tables in publications.');
      } else {
        pubs.forEach(p => {
          console.log(`- Publication: ${p.pubname} -> ${p.schemaname}.${p.tablename}`);
        });
      }
    } catch (err) {
      console.log(`- Error checking realtime: ${err.message}`);
    }

  } catch (err) {
    console.error('Diagnostics failed:', err);
  } finally {
    await client.end();
    console.log('\nDiagnostics complete.');
  }
}

run();
