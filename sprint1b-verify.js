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
  console.log('AURORA Sprint 1B — Live Database Verification');
  console.log('='.repeat(70));

  // ─── PHASE 1: ROLES TABLE ───────────────────────────────────────────────
  console.log('\n\n══ PHASE 1: ROLES TABLE ══');
  const roles = await client.query(`
    SELECT id, code, name, hierarchy
    FROM public.roles
    ORDER BY hierarchy
  `);
  console.log('\nAll roles in the roles table:');
  roles.rows.forEach(r => console.log(`  [${r.hierarchy}] ${r.code} — "${r.name}" (id: ${r.id})`));
  
  const forbiddenRoles = ['dept_coordinator', 'college_coordinator'];
  for (const r of forbiddenRoles) {
    const check = roles.rows.find(x => x.code === r);
    console.log(`  "${r}" exists: ${check ? 'YES ← PROBLEM' : 'NO ✓'}`);
  }

  // ─── PHASE 1B: HELPER FUNCTIONS ─────────────────────────────────────────
  console.log('\n\n══ PHASE 1B: HELPER FUNCTIONS ══');
  const fns = await client.query(`
    SELECT routine_name, routine_type,
           pg_get_functiondef(p.oid) as def
    FROM information_schema.routines r
    JOIN pg_proc p ON p.proname = r.routine_name
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE r.routine_schema = 'public'
    ORDER BY routine_name
  `);
  console.log('\nAll public functions:');
  fns.rows.forEach(r => console.log(`  ${r.routine_name} (${r.routine_type})`));

  const requiredFns = ['has_role', 'is_project_participant', 'generate_join_code'];
  for (const fn of requiredFns) {
    const exists = fns.rows.some(r => r.routine_name === fn);
    console.log(`\n  "${fn}" exists: ${exists ? 'YES ✓' : 'NO ← MISSING'}`);
    if (exists) {
      const def = fns.rows.find(r => r.routine_name === fn);
      console.log('  Body:');
      console.log(def.def.split('\n').map(l => '    ' + l).join('\n'));
    }
  }

  // ─── PHASE 2: ALL RLS POLICIES ──────────────────────────────────────────
  const tables = [
    'projects', 'project_members', 'students', 'profiles',
    'evaluations', 'audit_logs', 'defense_panels', 'notifications',
    'documents', 'document_versions', 'annotations', 'defense_schedules'
  ];

  console.log('\n\n══ PHASE 2: ALL RLS POLICIES ══');
  for (const tbl of tables) {
    const pols = await client.query(`
      SELECT policyname, cmd, permissive, roles,
             qual as using_clause,
             with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY cmd, policyname
    `, [tbl]);
    
    if (pols.rows.length === 0) {
      console.log(`\n  [${tbl}] No policies found — check if RLS is enabled`);
    } else {
      console.log(`\n  ── TABLE: ${tbl} (${pols.rows.length} policies) ──`);
      pols.rows.forEach(p => {
        console.log(`\n    [${p.cmd}] "${p.policyname}" (${p.permissive})`);
        if (p.using_clause) console.log(`      USING:      ${p.using_clause}`);
        if (p.with_check)   console.log(`      WITH CHECK: ${p.with_check}`);
      });
    }

    // Check if RLS is enabled
    const rlsCheck = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
        AND relname = $1
    `, [tbl]);
    if (rlsCheck.rows[0]) {
      console.log(`\n    RLS enabled: ${rlsCheck.rows[0].relrowsecurity}, forced: ${rlsCheck.rows[0].relforcerowsecurity}`);
    }
  }

  // ─── PHASE 3: COLUMN VERIFICATION ───────────────────────────────────────
  console.log('\n\n══ PHASE 3: COLUMN VERIFICATION ══');
  
  const columnChecks = [
    { table: 'projects', columns: ['id', 'student_id', 'campus_id', 'department_id'] },
    { table: 'project_members', columns: ['id', 'project_id', 'profile_id', 'member_role'] },
    { table: 'students', columns: ['id', 'profile_id', 'program_id'] },
    { table: 'profiles', columns: ['id', 'campus_id', 'status'] },
    { table: 'defense_panels', columns: ['id', 'project_id', 'profile_id', 'stage_id'] },
    { table: 'evaluations', columns: ['id', 'project_id', 'panelist_id', 'stage_id'] },
    { table: 'audit_logs', columns: ['id', 'profile_id', 'action_type'] },
    { table: 'notifications', columns: ['id', 'profile_id', 'type'] },
  ];

  for (const check of columnChecks) {
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      AND column_name = ANY($2::text[])
      ORDER BY ordinal_position
    `, [check.table, check.columns]);
    
    console.log(`\n  ${check.table}:`);
    check.columns.forEach(col => {
      const found = cols.rows.find(r => r.column_name === col);
      if (found) {
        const dt = found.data_type === 'USER-DEFINED' ? `ENUM(${found.udt_name})` : found.data_type;
        console.log(`    ${col}: ${dt} | nullable:${found.is_nullable} ✓`);
      } else {
        console.log(`    ${col}: NOT FOUND ← PROBLEM`);
      }
    });
  }

  // ─── PHASE 3B: DETECT SELF-REFERENCING IN POLICIES ──────────────────────
  console.log('\n\n══ PHASE 3B: SELF-REFERENCE DETECTION ══');
  const allPols = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  `);
  
  const patterns = [
    { label: 'pm.project_id = pm.id', regex: /pm\.project_id\s*=\s*pm\.id/ },
    { label: 'dp.project_id = dp.id', regex: /dp\.project_id\s*=\s*dp\.id/ },
    { label: 'dept_coordinator',       regex: /dept_coordinator/ },
    { label: 'college_coordinator',    regex: /college_coordinator/ },
  ];
  
  let foundIssues = false;
  allPols.rows.forEach(p => {
    const fullText = `${p.qual || ''} ${p.with_check || ''}`;
    patterns.forEach(pat => {
      if (pat.regex.test(fullText)) {
        foundIssues = true;
        console.log(`\n  ⚠ [${p.tablename}] "${p.policyname}" (${p.cmd})`);
        console.log(`    Contains: "${pat.label}"`);
        console.log(`    Text: ${fullText.substring(0, 200)}`);
      }
    });
  });
  if (!foundIssues) console.log('  No self-references or invalid role names found ✓');

  // ─── PHASE 3C: COUNT ALL REFERENCES TO INVALID ROLES IN ALL POLICIES ─────
  console.log('\n\n══ PHASE 3C: INVALID ROLE REFERENCES (all policies) ══');
  const invalidRoleRefs = await client.query(`
    SELECT tablename, policyname, cmd,
           qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual LIKE '%dept_coordinator%'
        OR qual LIKE '%college_coordinator%'
        OR with_check LIKE '%dept_coordinator%'
        OR with_check LIKE '%college_coordinator%'
      )
    ORDER BY tablename, policyname
  `);
  if (invalidRoleRefs.rows.length === 0) {
    console.log('  No invalid role references found ✓');
  } else {
    console.log(`  Found ${invalidRoleRefs.rows.length} policies with invalid role references:`);
    invalidRoleRefs.rows.forEach(p => {
      console.log(`\n  [${p.tablename}] "${p.policyname}" (${p.cmd})`);
      if (p.qual) console.log(`    USING: ${p.qual}`);
      if (p.with_check) console.log(`    CHECK: ${p.with_check}`);
    });
  }

  // ─── FOREIGN KEY VERIFICATION ────────────────────────────────────────────
  console.log('\n\n══ PHASE 3D: FOREIGN KEY VERIFICATION ══');
  const fks = await client.query(`
    SELECT tc.table_name, kcu.column_name,
           ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name=rc.constraint_name AND tc.table_schema=rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name=ccu.constraint_name AND rc.unique_constraint_schema=ccu.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
      AND tc.table_name IN ('projects','project_members','students','evaluations','defense_panels')
    ORDER BY tc.table_name, kcu.column_name
  `);
  fks.rows.forEach(r =>
    console.log(`  ${r.table_name}.${r.column_name} → ${r.ref_table}.${r.ref_col}`)
  );

  // ─── DUPLICATE POLICIES ──────────────────────────────────────────────────
  console.log('\n\n══ PHASE 3E: DUPLICATE POLICY DETECTION ══');
  const dupPols = await client.query(`
    SELECT tablename, cmd, COUNT(*) as policy_count,
           string_agg(policyname, ', ') as names
    FROM pg_policies
    WHERE schemaname='public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
    ORDER BY tablename, cmd
  `);
  if (dupPols.rows.length === 0) {
    console.log('  No duplicate (table, cmd) combinations found ✓');
  } else {
    console.log('  Duplicate policy commands found:');
    dupPols.rows.forEach(r =>
      console.log(`  [${r.tablename}] ${r.cmd}: ${r.policy_count} policies — ${r.names}`)
    );
  }

  await client.end();
  console.log('\n\n' + '='.repeat(70));
  console.log('Verification complete.');
  console.log('='.repeat(70));
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
