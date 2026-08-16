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

  // ─── 1. member_role enum ─────────────────────────────────────────────────
  console.log('\n\n══ 1. ENUM: member_role ══');
  const mre = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'member_role' ORDER BY e.enumsortorder
  `);
  console.log('Values:', mre.rows.map(r => r.enumlabel).join(', '));

  // ─── 2. project_status enum ──────────────────────────────────────────────
  console.log('\n\n══ 2. ENUM: project_status ══');
  const pse = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status' ORDER BY e.enumsortorder
  `);
  console.log('Values:', pse.rows.map(r => r.enumlabel).join(', '));

  // ─── 3. document_status enum ─────────────────────────────────────────────
  console.log('\n\n══ 3. ENUM: document_status ══');
  const dse = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'document_status' ORDER BY e.enumsortorder
  `);
  console.log('Values:', dse.rows.map(r => r.enumlabel).join(', '));

  // ─── 4. Full column list for projects ────────────────────────────────────
  console.log('\n\n══ 4. COLUMNS: projects ══');
  const pCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects'
    ORDER BY ordinal_position
  `);
  pCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable} | default:${r.column_default || 'none'}`);
  });

  // ─── 5. Full column list for project_members ─────────────────────────────
  console.log('\n\n══ 5. COLUMNS: project_members ══');
  const pmCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members'
    ORDER BY ordinal_position
  `);
  pmCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable} | default:${r.column_default || 'none'}`);
  });

  // ─── 6. Full column list for defense_schedules ───────────────────────────
  console.log('\n\n══ 6. COLUMNS: defense_schedules ══');
  const dsCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='defense_schedules'
    ORDER BY ordinal_position
  `);
  dsCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 7. Full column list for documents ───────────────────────────────────
  console.log('\n\n══ 7. COLUMNS: documents ══');
  const docCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='documents'
    ORDER BY ordinal_position
  `);
  docCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable} | default:${r.column_default || 'none'}`);
  });

  // ─── 8. Full column list for document_versions ───────────────────────────
  console.log('\n\n══ 8. COLUMNS: document_versions ══');
  const dvCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_versions'
    ORDER BY ordinal_position
  `);
  dvCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 9. Full column list for annotations ─────────────────────────────────
  console.log('\n\n══ 9. COLUMNS: annotations ══');
  const annCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annotations'
    ORDER BY ordinal_position
  `);
  annCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 10. Full column list for evaluations ────────────────────────────────
  console.log('\n\n══ 10. COLUMNS: evaluations ══');
  const evalCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluations'
    ORDER BY ordinal_position
  `);
  evalCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 11. Full column list for defense_stages ─────────────────────────────
  console.log('\n\n══ 11. COLUMNS: defense_stages ══');
  const stagCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='defense_stages'
    ORDER BY ordinal_position
  `);
  stagCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 12. Faculty table columns ───────────────────────────────────────────
  console.log('\n\n══ 12. COLUMNS: faculty ══');
  const facCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='faculty'
    ORDER BY ordinal_position
  `);
  facCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 13. Notifications columns ───────────────────────────────────────────
  console.log('\n\n══ 13. COLUMNS: notifications ══');
  const notifCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications'
    ORDER BY ordinal_position
  `);
  notifCols.rows.forEach(r => {
    const dt = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type;
    console.log(`  ${r.column_name}: ${dt} | nullable:${r.is_nullable}`);
  });

  // ─── 14. notification_type enum ──────────────────────────────────────────
  console.log('\n\n══ 14. ENUM: notification_type ══');
  const ntEnum = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type' ORDER BY e.enumsortorder
  `);
  console.log('Values:', ntEnum.rows.map(r => r.enumlabel).join(', '));

  // ─── 15. Unique constraints on project_members ───────────────────────────
  console.log('\n\n══ 15. UNIQUE CONSTRAINTS: project_members ══');
  const pmUniq = await client.query(`
    SELECT tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'project_members'
      AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `);
  const constraintMap: {} = {};
  pmUniq.rows.forEach((r: any) => {
    if (!constraintMap[r.constraint_name]) constraintMap[r.constraint_name] = [];
    constraintMap[r.constraint_name].push(r.column_name);
  });
  Object.entries(constraintMap).forEach(([name, cols]) =>
    console.log(`  ${name}: (${cols.join(', ')})`)
  );

  // ─── 16. Unique constraints on projects ──────────────────────────────────
  console.log('\n\n══ 16. UNIQUE CONSTRAINTS + INDEXES: projects ══');
  const projIdx = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public' AND tablename='projects'
    ORDER BY indexname
  `);
  projIdx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

  // ─── 17. Triggers on projects ────────────────────────────────────────────
  console.log('\n\n══ 17. TRIGGERS: projects ══');
  const projTrigs = await client.query(`
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema='public' AND event_object_table='projects'
    ORDER BY trigger_name
  `);
  if (projTrigs.rows.length === 0) {
    console.log('  No triggers on projects');
  } else {
    projTrigs.rows.forEach(r =>
      console.log(`  [${r.action_timing} ${r.event_manipulation}] ${r.trigger_name}: ${r.action_statement}`)
    );
  }

  // ─── 18. Triggers on project_members ─────────────────────────────────────
  console.log('\n\n══ 18. TRIGGERS: project_members ══');
  const pmTrigs = await client.query(`
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema='public' AND event_object_table='project_members'
    ORDER BY trigger_name
  `);
  if (pmTrigs.rows.length === 0) {
    console.log('  No triggers on project_members');
  } else {
    pmTrigs.rows.forEach(r =>
      console.log(`  [${r.action_timing} ${r.event_manipulation}] ${r.trigger_name}: ${r.action_statement}`)
    );
  }

  // ─── 19. Live data counts ────────────────────────────────────────────────
  console.log('\n\n══ 19. LIVE DATA COUNTS ══');
  const dataTables = ['projects', 'project_members', 'students', 'faculty', 'profiles',
    'documents', 'document_versions', 'annotations', 'evaluations',
    'defense_schedules', 'defense_panels', 'notifications', 'audit_logs'];
  for (const tbl of dataTables) {
    const cnt = await client.query(`SELECT COUNT(*) FROM public.${tbl}`);
    console.log(`  ${tbl}: ${cnt.rows[0].count} rows`);
  }

  // ─── 20. adviser_approval_status column on documents ─────────────────────
  console.log('\n\n══ 20. CHECK: documents.adviser_approval_status ══');
  const advApproval = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='documents'
    AND column_name='adviser_approval_status'
  `);
  if (advApproval.rows.length === 0) {
    console.log('  MISSING: documents.adviser_approval_status does NOT exist');
  } else {
    const r = advApproval.rows[0];
    console.log(`  EXISTS: ${r.column_name} (${r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type})`);
    // Check the enum values if it is an enum
    if (r.data_type === 'USER-DEFINED') {
      const enumVals = await client.query(`
        SELECT e.enumlabel FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = $1 ORDER BY e.enumsortorder
      `, [r.udt_name]);
      console.log(`  Values: ${enumVals.rows.map((x: any) => x.enumlabel).join(', ')}`);
    }
  }

  // ─── 21. CHECK: projects.join_code column ────────────────────────────────
  console.log('\n\n══ 21. CHECK: projects.join_code ══');
  const jc = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='join_code'
  `);
  if (jc.rows.length === 0) {
    console.log('  MISSING: projects.join_code does NOT exist');
  } else {
    const r = jc.rows[0];
    console.log(`  EXISTS: ${r.column_name} (${r.data_type}) | nullable:${r.is_nullable} | default:${r.column_default || 'none'}`);
  }

  // ─── 22. CHECK: projects.is_active column ────────────────────────────────
  console.log('\n\n══ 22. CHECK: projects.is_active / archive_status ══');
  const archiveCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects'
    AND column_name IN ('is_active', 'archived_at', 'archive_status', 'is_archived')
  `);
  if (archiveCols.rows.length === 0) {
    console.log('  No archive/is_active columns found on projects');
  } else {
    archiveCols.rows.forEach(r => console.log(`  FOUND: ${r.column_name} (${r.data_type})`));
  }

  // ─── 23. Realtime publication check ──────────────────────────────────────
  console.log('\n\n══ 23. REALTIME PUBLICATION ══');
  const rtPubs = await client.query(`
    SELECT p.pubname, pc.relname
    FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class pc ON pc.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = pc.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY p.pubname, pc.relname
  `);
  if (rtPubs.rows.length === 0) {
    console.log('  No tables published to realtime');
  } else {
    console.log('  Published tables:');
    rtPubs.rows.forEach(r => console.log(`    [${r.pubname}] ${r.relname}`));
  }

  // ─── 24. project_score_cache table ───────────────────────────────────────
  console.log('\n\n══ 24. CHECK: project_score_cache table ══');
  const pscCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_score_cache'
    ORDER BY ordinal_position
  `);
  if (pscCols.rows.length === 0) {
    console.log('  MISSING: project_score_cache table does NOT exist');
  } else {
    console.log('  Columns:');
    pscCols.rows.forEach(r => console.log(`    ${r.column_name}: ${r.data_type}`));
  }

  // ─── 25. annotation_type + annotation_status enums ───────────────────────
  console.log('\n\n══ 25. ENUMS: annotation_type, annotation_status ══');
  const annEnums = await client.query(`
    SELECT t.typname, e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN ('annotation_type', 'annotation_status')
    ORDER BY t.typname, e.enumsortorder
  `);
  const annEnumMap: {} = {};
  annEnums.rows.forEach((r: any) => {
    if (!annEnumMap[r.typname]) annEnumMap[r.typname] = [];
    annEnumMap[r.typname].push(r.enumlabel);
  });
  Object.entries(annEnumMap).forEach(([name, vals]) =>
    console.log(`  ${name}: ${vals.join(', ')}`)
  );

  await client.end();
  console.log('\n' + '='.repeat(70));
  console.log('Sprint 1C DB verification complete.');
  console.log('='.repeat(70));
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
