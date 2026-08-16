const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('='.repeat(70));
  console.log('AURORA Sprint 1C — Dashboard & Membership DB Verification');
  console.log('='.repeat(70));

  async function enumVals(typName) {
    const r = await client.query(
      `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname=$1 ORDER BY e.enumsortorder`,
      [typName]
    );
    return r.rows.map(x => x.enumlabel);
  }
  async function cols(tbl) {
    const r = await client.query(
      `SELECT column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [tbl]
    );
    return r.rows;
  }

  // ENUMS
  console.log('\n══ 1. ENUM: member_role =='); console.log((await enumVals('member_role')).join(', '));
  console.log('\n══ 2. ENUM: project_status =='); console.log((await enumVals('project_status')).join(', '));
  console.log('\n══ 3. ENUM: document_status =='); console.log((await enumVals('document_status')).join(', '));
  console.log('\n══ 4. ENUM: notification_type =='); console.log((await enumVals('notification_type')).join(', '));
  console.log('\n══ 5. ENUM: annotation_type =='); console.log((await enumVals('annotation_type')).join(', '));
  console.log('\n══ 6. ENUM: annotation_status =='); console.log((await enumVals('annotation_status')).join(', '));
  console.log('\n══ 7. ENUM: evaluation_status =='); console.log((await enumVals('evaluation_status')).join(', '));

  // COLUMNS
  for (const tbl of ['projects','project_members','defense_schedules','documents','document_versions','annotations','evaluations','defense_stages','faculty','notifications','students']) {
    console.log(`\n══ COLS: ${tbl} ==`);
    const c = await cols(tbl);
    c.forEach(r => {
      const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
      console.log(`  ${r.column_name}: ${dt} | null:${r.is_nullable} | default:${r.column_default || 'none'}`);
    });
  }

  // Special checks
  console.log('\n══ CHECK: projects.join_code ==');
  const jc = (await cols('projects')).find(c => c.column_name === 'join_code');
  console.log(jc ? `  EXISTS: join_code (${jc.data_type}) nullable:${jc.is_nullable}` : '  MISSING: join_code');

  console.log('\n══ CHECK: projects archive columns ==');
  const archCols = (await cols('projects')).filter(c => ['is_active','archived_at','is_archived','archive_status'].includes(c.column_name));
  archCols.length ? archCols.forEach(c => console.log(`  FOUND: ${c.column_name}`)) : console.log('  None found');

  console.log('\n══ CHECK: documents.adviser_approval_status ==');
  const aas = (await cols('documents')).find(c => c.column_name === 'adviser_approval_status');
  if (aas) {
    console.log(`  EXISTS: ${aas.column_name} (${aas.data_type === 'USER-DEFINED' ? aas.udt_name : aas.data_type})`);
    if (aas.data_type === 'USER-DEFINED') {
      console.log('  Values:', (await enumVals(aas.udt_name)).join(', '));
    }
  } else {
    console.log('  MISSING');
  }

  // UNIQUE CONSTRAINTS
  console.log('\n══ UNIQUE CONSTRAINTS: project_members ==');
  const pmUniq = await client.query(`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='project_members' AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `);
  const cmap = {};
  pmUniq.rows.forEach(r => { if (!cmap[r.constraint_name]) cmap[r.constraint_name] = []; cmap[r.constraint_name].push(r.column_name); });
  Object.entries(cmap).forEach(([n,c]) => console.log(`  ${n}: (${c.join(', ')})`));

  // INDEXES on projects
  console.log('\n══ INDEXES: projects ==');
  const pidx = await client.query(`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='projects' ORDER BY indexname`);
  pidx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

  // TRIGGERS
  console.log('\n══ TRIGGERS: projects ==');
  const pt = await client.query(`SELECT trigger_name,event_manipulation,action_timing FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='projects' ORDER BY trigger_name`);
  pt.rows.length ? pt.rows.forEach(r => console.log(`  [${r.action_timing} ${r.event_manipulation}] ${r.trigger_name}`)) : console.log('  No triggers');

  console.log('\n══ TRIGGERS: project_members ==');
  const pmt = await client.query(`SELECT trigger_name,event_manipulation,action_timing FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='project_members' ORDER BY trigger_name`);
  pmt.rows.length ? pmt.rows.forEach(r => console.log(`  [${r.action_timing} ${r.event_manipulation}] ${r.trigger_name}`)) : console.log('  No triggers');

  // DATA COUNTS
  console.log('\n══ DATA COUNTS ==');
  for (const tbl of ['projects','project_members','students','faculty','profiles','documents','document_versions','annotations','evaluations','defense_schedules','defense_panels','notifications','audit_logs']) {
    const cnt = await client.query(`SELECT COUNT(*) FROM public.${tbl}`);
    console.log(`  ${tbl}: ${cnt.rows[0].count}`);
  }

  // project_score_cache
  console.log('\n══ CHECK: project_score_cache ==');
  const psc = await client.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='project_score_cache'`);
  console.log(psc.rows[0].count > 0 ? '  EXISTS' : '  MISSING');

  // REALTIME
  console.log('\n══ REALTIME PUBLICATION ==');
  try {
    const rtPubs = await client.query(`
      SELECT p.pubname, pc.relname FROM pg_publication p
      JOIN pg_publication_rel pr ON pr.prpubid=p.oid
      JOIN pg_class pc ON pc.oid=pr.prrelid
      JOIN pg_namespace n ON n.oid=pc.relnamespace
      WHERE n.nspname='public' ORDER BY p.pubname, pc.relname
    `);
    rtPubs.rows.length ? rtPubs.rows.forEach(r => console.log(`  [${r.pubname}] ${r.relname}`)) : console.log('  No tables in realtime publication');
  } catch(e) { console.log('  Could not query publications:', e.message); }

  await client.end();
  console.log('\n' + '='.repeat(70));
  console.log('Done.');
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
