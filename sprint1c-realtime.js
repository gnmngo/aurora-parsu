const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Sprint 1C-E — Realtime Publication Migration');
  console.log('='.repeat(60));

  // 1. Verify current state
  console.log('\n[1] Current realtime publication tables:');
  const before = await client.query(`
    SELECT p.pubname, pc.relname FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class pc ON pc.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = pc.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY p.pubname, pc.relname
  `);
  before.rows.length ? before.rows.forEach(r => console.log(`  [${r.pubname}] ${r.relname}`))
    : console.log('  No tables in any realtime publication');

  // 2. Check if tables are already published (idempotent guard)
  const alreadyPublished = before.rows.filter(r =>
    r.pubname === 'supabase_realtime' &&
    (r.relname === 'projects' || r.relname === 'project_members')
  );

  if (alreadyPublished.length === 2) {
    console.log('\n[2] projects and project_members are ALREADY in supabase_realtime. No migration needed.');
    await client.end();
    return;
  }

  const missingTables = ['projects', 'project_members'].filter(tbl =>
    !alreadyPublished.some(r => r.relname === tbl)
  );
  console.log(`\n[2] Tables to add: ${missingTables.join(', ')}`);

  // 3. Apply migration — idempotent, one table at a time
  for (const tbl of missingTables) {
    console.log(`\n[3] Adding ${tbl} to supabase_realtime...`);
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${tbl}`);
    console.log(`    OK: ${tbl} added`);
  }

  // 4. Verify result
  console.log('\n[4] Post-migration realtime publication tables:');
  const after = await client.query(`
    SELECT p.pubname, pc.relname FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class pc ON pc.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = pc.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY p.pubname, pc.relname
  `);
  after.rows.forEach(r => console.log(`  [${r.pubname}] ${r.relname}`));

  // Confirm the tables are now published
  const verified = ['projects', 'project_members'].every(tbl =>
    after.rows.some(r => r.pubname === 'supabase_realtime' && r.relname === tbl)
  );
  console.log(`\n[5] Verification: ${verified ? 'PASS ✓' : 'FAIL ✗'}`);

  await client.end();
  console.log('\n' + '='.repeat(60));
  console.log('Migration complete.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
