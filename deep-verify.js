const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  // ─── 1. UNIQUE constraints on join_code ───────────────────────────────
  console.log('\n=== 1. UNIQUE constraint on projects.join_code ===');
  const jcUniq = await client.query(`
    SELECT tc.constraint_name, tc.constraint_type
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='projects' 
      AND kcu.column_name='join_code'
    ORDER BY tc.constraint_type
  `);
  console.log('join_code constraints:', jcUniq.rows.length ? jcUniq.rows : 'NONE');

  // ─── 2. projects NOT NULL columns ─────────────────────────────────────
  console.log('\n=== 2. projects — NOT NULL columns ===');
  const projNN = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  projNN.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));

  // ─── 3. students NOT NULL columns ─────────────────────────────────────
  console.log('\n=== 3. students — NOT NULL columns ===');
  const stuNN = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  stuNN.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));

  // ─── 4. project_members NOT NULL columns ──────────────────────────────
  console.log('\n=== 4. project_members — NOT NULL columns ===');
  const pmNN = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  pmNN.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));

  // ─── 5. document_versions NOT NULL columns ────────────────────────────
  console.log('\n=== 5. document_versions — NOT NULL columns ===');
  const dvNN = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_versions' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  dvNN.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));

  // ─── 6. documents NOT NULL columns + unique constraints ───────────────
  console.log('\n=== 6. documents — NOT NULL + UNIQUE constraints ===');
  const docNN = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='documents' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  docNN.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));
  const docUniq = await client.query(`
    SELECT tc.constraint_name, string_agg(kcu.column_name, ', ') AS cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.constraint_type='UNIQUE' AND tc.table_schema='public' AND tc.table_name='documents'
    GROUP BY tc.constraint_name
  `);
  console.log('UNIQUE constraints:', docUniq.rows.length ? docUniq.rows : 'NONE');

  // ─── 7. workflow_templates columns ────────────────────────────────────
  console.log('\n=== 7. workflow_templates — all columns ===');
  const wt = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workflow_templates'
    ORDER BY ordinal_position
  `);
  wt.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // ─── 8. academic_levels table ─────────────────────────────────────────
  console.log('\n=== 8. academic_levels ===');
  const al = await client.query(`SELECT * FROM academic_levels LIMIT 10`);
  al.rows.forEach(r => console.log(JSON.stringify(r)));

  // ─── 9. programs — sample data ────────────────────────────────────────
  console.log('\n=== 9. programs — sample ===');
  const progs = await client.query(`
    SELECT id, name, code, department_id, college_id, academic_level_id FROM programs LIMIT 10
  `);
  progs.rows.forEach(r => console.log(JSON.stringify(r)));

  // ─── 10. workflow_templates + defense_stages sample ───────────────────
  console.log('\n=== 10. workflow_templates with stage counts ===');
  const wts = await client.query(`
    SELECT wt.id, wt.name, wt.program_id, COUNT(ds.id) as stage_count
    FROM workflow_templates wt
    LEFT JOIN defense_stages ds ON ds.workflow_template_id = wt.id
    GROUP BY wt.id, wt.name, wt.program_id
    ORDER BY wt.name
    LIMIT 10
  `);
  wts.rows.forEach(r => console.log(JSON.stringify(r)));

  // ─── 11. Is there a project.is_primary / default_project concept? ─────
  console.log('\n=== 11. project_members — all unique constraints ===');
  const pmUniq = await client.query(`
    SELECT tc.constraint_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='project_members'
    GROUP BY tc.constraint_name, tc.constraint_type
  `);
  pmUniq.rows.forEach(r => console.log(JSON.stringify(r)));

  // ─── 12. notification_type enum used in workflow/actions.ts ──────────
  console.log('\n=== 12. notification_type enum values ===');
  const nt = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='notification_type'
    ORDER BY e.enumsortorder
  `);
  nt.rows.forEach(r => console.log(' -', r.enumlabel));

  // ─── 13. documents status values and defaults ─────────────────────────
  console.log('\n=== 13. document_status enum values ===');
  const ds = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='document_status'
    ORDER BY e.enumsortorder
  `);
  ds.rows.forEach(r => console.log(' -', r.enumlabel));

  // ─── 14. projects select RLS policies ─────────────────────────────────
  console.log('\n=== 14. Full RLS policy bodies for projects table ===');
  const prls = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' AND tablename='projects'
    ORDER BY cmd, policyname
  `);
  prls.rows.forEach(r => {
    console.log(`\n  [${r.cmd}] ${r.policyname}`);
    if (r.qual) console.log(`    USING: ${r.qual}`);
    if (r.with_check) console.log(`    CHECK: ${r.with_check}`);
  });

  // ─── 15. Storage bucket policies ──────────────────────────────────────
  console.log('\n=== 15. Storage policies ===');
  const sp = await client.query(`
    SELECT name, bucket_id, operation, definition
    FROM storage.policies
    ORDER BY bucket_id, name
  `);
  sp.rows.forEach(r => console.log(`  [${r.bucket_id}] ${r.name} (${r.operation}): ${r.definition?.substring(0,100)}`));

  // ─── 16. workflow_transitions table ───────────────────────────────────
  console.log('\n=== 16. workflow_transitions columns ===');
  const wtr = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workflow_transitions'
    ORDER BY ordinal_position
  `);
  wtr.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // ─── 17. projects — indexes ────────────────────────────────────────────
  console.log('\n=== 17. projects indexes ===');
  const pidx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname='public' AND tablename='projects'
    ORDER BY indexname
  `);
  pidx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

  // ─── 18. Check annotations column names ───────────────────────────────
  console.log('\n=== 18. annotations columns ===');
  const ann = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='annotations'
    ORDER BY ordinal_position
  `);
  ann.rows.forEach(r => {
    const type = r.data_type === 'USER-DEFINED' ? `ENUM(${r.udt_name})` : r.data_type;
    console.log(`  ${r.column_name} | ${type} | nullable:${r.is_nullable}`);
  });

  // ─── 19. document_upload_history columns ──────────────────────────────
  console.log('\n=== 19. document_upload_history columns ===');
  const duh = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_upload_history'
    ORDER BY ordinal_position
  `);
  duh.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // ─── 20. existing projects + members ──────────────────────────────────
  console.log('\n=== 20. All project_members (current data) ===');
  const pm = await client.query(`
    SELECT pm.project_id, pm.profile_id, pm.member_role, pm.is_primary
    FROM project_members pm LIMIT 10
  `);
  pm.rows.forEach(r => console.log(JSON.stringify(r)));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
