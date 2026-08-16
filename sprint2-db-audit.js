const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

const sep = (t) => { console.log('\n' + '='.repeat(62)); console.log('  ' + t); console.log('='.repeat(62)); };

async function run() {
  await client.connect();
  console.log('AURORA — Academic Defense Workflow DB Audit');
  console.log('Timestamp:', new Date().toISOString());

  // ── ALL ENUMS ──────────────────────────────────────────────
  sep('ALL ENUMS');
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname='public'
    ORDER BY t.typname, e.enumsortorder
  `);
  const enumMap = {};
  enums.rows.forEach(r => { if (!enumMap[r.typname]) enumMap[r.typname]=[]; enumMap[r.typname].push(r.enumlabel); });
  Object.entries(enumMap).forEach(([k,v]) => console.log(`  ${k}: ${v.join(', ')}`));

  // ── ALL TABLES ────────────────────────────────────────────
  sep('ALL TABLES');
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
  console.log('  ' + tables.rows.map(r => r.table_name).join(', '));

  // ── COLUMN DETAILS for each workflow table ────────────────
  const workflowTables = [
    'documents','document_versions','annotations','annotation_replies',
    'evaluations','evaluation_scores','rubrics','rubric_criteria',
    'workflow_templates','defense_stages','defense_schedules','defense_panels',
    'notifications','audit_logs','digital_signatures','certificates',
    'project_score_cache'
  ];

  for (const tbl of workflowTables) {
    sep(`COLS: ${tbl}`);
    const r = await client.query(
      `SELECT column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [tbl]
    );
    if (r.rows.length === 0) { console.log('  TABLE DOES NOT EXIST'); continue; }
    r.rows.forEach(c => {
      const dt = c.data_type==='USER-DEFINED'?c.udt_name:c.data_type;
      console.log(`  ${c.column_name}: ${dt} | null:${c.is_nullable} | default:${c.column_default||'none'}`);
    });
  }

  // ── FOREIGN KEYS ──────────────────────────────────────────
  sep('FOREIGN KEYS');
  const fks = await client.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=rc.unique_constraint_name
    WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY'
    AND tc.table_name = ANY($1)
    ORDER BY tc.table_name, kcu.column_name
  `, [workflowTables]);
  fks.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name} -> ${r.ref_table}.${r.ref_col} [${r.delete_rule}]`));

  // ── UNIQUE CONSTRAINTS ────────────────────────────────────
  sep('UNIQUE CONSTRAINTS');
  const uniqs = await client.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.table_schema='public' AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
    AND tc.table_name = ANY($1)
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
  `, [workflowTables]);
  const cmap = {};
  uniqs.rows.forEach(r => { const k=`${r.table_name}|${r.constraint_name}|${r.constraint_type}`; if(!cmap[k])cmap[k]=[]; cmap[k].push(r.column_name); });
  Object.entries(cmap).forEach(([k,cols]) => { const [t,n,ct]=k.split('|'); console.log(`  [${ct}] ${t}.${n}: (${cols.join(',')})`); });

  // ── CHECK CONSTRAINTS ─────────────────────────────────────
  sep('CHECK CONSTRAINTS');
  const checks = await client.query(`
    SELECT tc.table_name, tc.constraint_name, cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name=cc.constraint_name
    WHERE tc.table_schema='public' AND tc.constraint_type='CHECK' AND tc.table_name = ANY($1)
    ORDER BY tc.table_name
  `, [workflowTables]);
  checks.rows.length ? checks.rows.forEach(r => console.log(`  ${r.table_name} | ${r.constraint_name}: ${r.check_clause}`))
    : console.log('  None');

  // ── INDEXES ───────────────────────────────────────────────
  sep('INDEXES');
  const idxs = await client.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1) ORDER BY tablename,indexname`,[workflowTables]);
  idxs.rows.forEach(r => console.log(`  [${r.tablename}] ${r.indexname}`));

  // ── TRIGGERS ──────────────────────────────────────────────
  sep('TRIGGERS');
  const trigs = await client.query(`
    SELECT trigger_name, event_object_table, event_manipulation, action_timing
    FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table=ANY($1)
    ORDER BY event_object_table, trigger_name
  `, [workflowTables]);
  trigs.rows.length ? trigs.rows.forEach(r =>
    console.log(`  [${r.event_object_table}] [${r.action_timing} ${r.event_manipulation}] ${r.trigger_name}`)
  ) : console.log('  None');

  // ── ALL FUNCTIONS ─────────────────────────────────────────
  sep('ALL PUBLIC FUNCTIONS');
  const funcs = await client.query(`SELECT routine_name,routine_type FROM information_schema.routines WHERE routine_schema='public' ORDER BY routine_name`);
  funcs.rows.forEach(r => console.log(`  ${r.routine_type}: ${r.routine_name}`));

  // ── RLS STATUS ────────────────────────────────────────────
  sep('RLS ENABLED STATUS');
  const rlsEn = await client.query(`
    SELECT relname, relrowsecurity FROM pg_class
    JOIN pg_namespace n ON n.oid=relnamespace
    WHERE n.nspname='public' AND relkind='r' AND relname=ANY($1) ORDER BY relname
  `, [workflowTables]);
  rlsEn.rows.forEach(r => console.log(`  ${r.relname}: ${r.relrowsecurity?'RLS_ON':'RLS_OFF'}`));

  // ── RLS POLICIES ──────────────────────────────────────────
  sep('RLS POLICIES');
  const rls = await client.query(`
    SELECT tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
    WHERE schemaname='public' AND tablename=ANY($1) ORDER BY tablename,policyname
  `, [workflowTables]);
  if (!rls.rows.length) { console.log('  No RLS policies'); }
  rls.rows.forEach(r => {
    console.log(`  [${r.tablename}] ${r.policyname} cmd:${r.cmd}`);
    if (r.qual) console.log(`    USING: ${r.qual.substring(0,120)}`);
    if (r.with_check) console.log(`    CHECK: ${r.with_check.substring(0,120)}`);
  });

  // ── DATA COUNTS ───────────────────────────────────────────
  sep('DATA COUNTS');
  for (const tbl of workflowTables) {
    try { const c=await client.query(`SELECT COUNT(*) FROM public.${tbl}`); console.log(`  ${tbl}: ${c.rows[0].count}`); }
    catch(e) { console.log(`  ${tbl}: ERROR(${e.message})`); }
  }

  // ── STORAGE BUCKETS ───────────────────────────────────────
  sep('STORAGE BUCKETS');
  try {
    const bkts = await client.query(`SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY name`);
    bkts.rows.forEach(r => console.log(`  ${r.name}: public=${r.public} size_limit=${r.file_size_limit||'none'} mime=${JSON.stringify(r.allowed_mime_types)}`));
  } catch(e) { console.log('  ERROR:', e.message); }

  // ── STORAGE POLICIES ─────────────────────────────────────
  sep('STORAGE RLS POLICIES');
  try {
    const sp = await client.query(`SELECT tablename,policyname,cmd FROM pg_policies WHERE schemaname='storage' ORDER BY tablename,policyname`);
    sp.rows.forEach(r => console.log(`  [${r.tablename}] ${r.policyname} cmd:${r.cmd}`));
  } catch(e) { console.log('  ERROR:', e.message); }

  // ── REALTIME ─────────────────────────────────────────────
  sep('REALTIME PUBLICATION');
  const rt = await client.query(`
    SELECT p.pubname, pc.relname FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid=p.oid
    JOIN pg_class pc ON pc.oid=pr.prrelid
    JOIN pg_namespace n ON n.oid=pc.relnamespace
    WHERE n.nspname='public' ORDER BY p.pubname,pc.relname
  `);
  rt.rows.forEach(r => console.log(`  [${r.pubname}] ${r.relname}`));

  // ── SAMPLE evaluation_scores / rubric_criteria ────────────
  sep('RUBRICS & CRITERIA (live data)');
  try {
    const rub = await client.query(`SELECT id, title, is_global FROM public.rubrics LIMIT 10`);
    console.log('  rubrics:', JSON.stringify(rub.rows));
    const crit = await client.query(`SELECT id, rubric_id, name, max_score, weight FROM public.rubric_criteria LIMIT 10`);
    console.log('  rubric_criteria:', JSON.stringify(crit.rows));
  } catch(e) { console.log('  ERROR:', e.message); }

  // ── SAMPLE certificates ───────────────────────────────────
  sep('CERTIFICATES & DIGITAL_SIGNATURES (live data)');
  try {
    const certs = await client.query(`SELECT COUNT(*) FROM public.certificates`);
    console.log('  certificates count:', certs.rows[0].count);
    const sigs = await client.query(`SELECT COUNT(*) FROM public.digital_signatures`);
    console.log('  digital_signatures count:', sigs.rows[0].count);
  } catch(e) { console.log('  ERROR:', e.message); }

  // ── WORKFLOW_TEMPLATES details ────────────────────────────
  sep('WORKFLOW_TEMPLATES (live)');
  try {
    const wt = await client.query(`SELECT id,name,type,is_active FROM public.workflow_templates`);
    console.log('  templates:', JSON.stringify(wt.rows));
  } catch(e) { console.log('  ERROR:', e.message); }

  // ── DEFENSE_STAGES details ────────────────────────────────
  sep('DEFENSE_STAGES (live)');
  try {
    const ds = await client.query(`SELECT id,code,name,sequence_order,workflow_template_id,is_enabled FROM public.defense_stages ORDER BY sequence_order`);
    console.log('  stages:', JSON.stringify(ds.rows));
  } catch(e) { console.log('  ERROR:', e.message); }

  await client.end();
  console.log('\n' + '='.repeat(62));
  console.log('DB Audit Complete: ' + new Date().toISOString());
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
