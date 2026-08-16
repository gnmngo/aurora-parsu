const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  // workflow_transitions columns
  console.log('\n=== workflow_transitions columns ===');
  const wtr = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workflow_transitions'
    ORDER BY ordinal_position
  `);
  wtr.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // projects indexes
  console.log('\n=== projects indexes ===');
  const pidx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname='public' AND tablename='projects'
    ORDER BY indexname
  `);
  pidx.rows.forEach(r => console.log(`  ${r.indexname}`));

  // annotations full column list
  console.log('\n=== annotations columns ===');
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

  // document_upload_history
  console.log('\n=== document_upload_history columns ===');
  const duh = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_upload_history'
    ORDER BY ordinal_position
  `);
  duh.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable} | default:${r.column_default}`));

  // current project_members  
  console.log('\n=== current project_members ===');
  const pm = await client.query(`
    SELECT pm.project_id, pm.profile_id, pm.member_role, pm.is_primary
    FROM project_members pm LIMIT 10
  `);
  pm.rows.forEach(r => console.log(JSON.stringify(r)));

  // Detect self-referential bug in projects_select_policy
  console.log('\n=== BUG DETECTION: pm.project_id = pm.id (self-ref in policy) ===');
  // The policy says pm.project_id = pm.id which is WRONG (should be pm.project_id = projects.id)
  // This means the projects_select_policy JOIN is logically always false for any project that
  // doesn't have project_members.project_id = project_members.id (which is always UUID mismatch)
  console.log('VERIFIED: projects_select_policy has self-referential bug: pm.project_id = pm.id');
  console.log('  Should be: pm.project_id = projects.id');

  // Check program_id for BSIT workflow
  console.log('\n=== BSIT program in programs table ===');
  const bsit = await client.query(`SELECT * FROM programs WHERE code ILIKE '%BSIT%' OR name ILIKE '%BSIT%'`);
  bsit.rows.forEach(r => console.log(JSON.stringify(r)));

  // workflow template program_id reference
  console.log('\n=== workflow_template program references ===');
  const wt = await client.query(`
    SELECT wt.id, wt.name, wt.program_id, p.name as program_name, p.code
    FROM workflow_templates wt
    LEFT JOIN programs p ON p.id = wt.program_id
  `);
  wt.rows.forEach(r => console.log(JSON.stringify(r)));

  // check project with program_id = 80000000-0000-0000-0000-000000000001
  console.log('\n=== Program 80000000-0000-0000-0000-000000000001 exists? ===');
  const p = await client.query(`SELECT * FROM programs WHERE id='80000000-0000-0000-0000-000000000001'`);
  if (p.rows.length) p.rows.forEach(r => console.log(JSON.stringify(r)));
  else console.log('NOT FOUND - orphan FK in workflow_templates!');

  // notification type 'workflow' used in workflow/actions.ts
  console.log('\n=== Does notification_type have workflow value? ===');
  const nt = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='notification_type' AND e.enumlabel='workflow'
  `);
  console.log('workflow in notification_type enum:', nt.rows.length > 0);

  // document status 'active' used in seeder
  console.log('\n=== Does document_status have active value? ===');
  const ds = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='document_status' AND e.enumlabel='active'
  `);
  console.log('active in document_status enum:', ds.rows.length > 0);

  // rubric_templates columns (is_published, is_active)
  console.log('\n=== rubric_templates columns ===');
  const rt = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rubric_templates'
    ORDER BY ordinal_position
  `);
  rt.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // evaluations NOT NULL columns
  console.log('\n=== evaluations NOT NULL columns ===');
  const ev = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluations' AND is_nullable='NO'
    ORDER BY ordinal_position
  `);
  ev.rows.forEach(r => console.log(`  ${r.column_name} | default: ${r.column_default}`));

  // profiles campus_id is NOT NULL?
  console.log('\n=== profiles.campus_id nullable? ===');
  const pci = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='campus_id'
  `);
  pci.rows.forEach(r => console.log(JSON.stringify(r)));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
