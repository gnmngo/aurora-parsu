const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  // 1. Confirm exact project_status enum values
  const ps = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='project_status'
    ORDER BY e.enumsortorder
  `);
  console.log('project_status:', ps.rows.map(r => r.enumlabel).join(', '));

  // 2. Confirm member_role enum values
  const mr = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='member_role'
    ORDER BY e.enumsortorder
  `);
  console.log('member_role:', mr.rows.map(r => r.enumlabel).join(', '));

  // 3. Confirm project_members actual columns
  const pm = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members'
    ORDER BY ordinal_position
  `);
  console.log('\nproject_members columns:');
  pm.rows.forEach(r => {
    const t = r.data_type === 'USER-DEFINED' ? `ENUM(${r.udt_name})` : r.data_type;
    console.log(`  ${r.column_name} | ${t} | nullable:${r.is_nullable} | default:${r.column_default}`);
  });

  // 4. Confirm students actual columns (especially profile_id, campus_id, etc.)
  const st = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students'
    ORDER BY ordinal_position
  `);
  console.log('\nstudents columns:');
  st.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type === 'USER-DEFINED' ? 'ENUM('+r.udt_name+')' : r.data_type} | nullable:${r.is_nullable}`));

  // 5. Confirm projects NOT NULL columns
  const pn = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects'
    ORDER BY ordinal_position
  `);
  console.log('\nprojects columns:');
  pn.rows.forEach(r => console.log(`  ${r.column_name} | nullable:${r.is_nullable} | default:${r.column_default}`));

  // 6. Does departments have is_active?
  const dept = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='departments' AND column_name='is_active'
  `);
  console.log('\ndepartments.is_active exists:', dept.rows.length > 0);

  // 7. notification_type enum
  const nt = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='notification_type'
    ORDER BY e.enumsortorder
  `);
  console.log('\nnotification_type:', nt.rows.map(r => r.enumlabel).join(', '));

  // 8. document_status enum
  const ds = await client.query(`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='document_status'
    ORDER BY e.enumsortorder
  `);
  console.log('document_status:', ds.rows.map(r => r.enumlabel).join(', '));

  // 9. Does projects have college_id / program_id / major_id columns?
  const projExtra = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects'
    AND column_name IN ('college_id','program_id','major_id','workflow_template_id')
  `);
  console.log('\nprojects extra columns:', projExtra.rows.map(r => r.column_name));

  // 10. Look at the generate_join_code function  
  const jcfn = await client.query(`
    SELECT pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
    AND proname='generate_join_code'
  `);
  console.log('\ngenerate_join_code:');
  jcfn.rows.forEach(r => console.log(r.def));

  // 11. handle_new_user trigger function body
  const hnuFn = await client.query(`
    SELECT pg_get_functiondef(oid) as def
    FROM pg_proc
    WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
    AND proname='handle_new_user'
  `);
  console.log('\nhandle_new_user:');
  hnuFn.rows.forEach(r => console.log(r.def));

  // 12. project_members RLS policies
  const pmRls = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' AND tablename='project_members'
    ORDER BY cmd, policyname
  `);
  console.log('\nproject_members RLS policies:');
  pmRls.rows.forEach(r => {
    console.log(`  [${r.cmd}] ${r.policyname}`);
    if (r.qual) console.log(`    USING: ${r.qual}`);
    if (r.with_check) console.log(`    CHECK: ${r.with_check}`);
  });

  // 13. Does profiles have campus_id NOT NULL?
  const profCampus = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
    AND column_name IN ('campus_id','college_id','department_id','status')
  `);
  console.log('\nprofiles hierarchy columns:');
  profCampus.rows.forEach(r => console.log(`  ${r.column_name} | nullable:${r.is_nullable} | default:${r.column_default}`));

  // 14. Confirm seeder student inserts work: what happens with program: "BSIT"
  // Already confirmed students has no 'program' column; just reaffirm
  const stuCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='program'
  `);
  console.log('\nstudents.program column exists:', stuCols.rows.length > 0, '(should be false - column is program_id)');

  // 15. workflow/actions.ts: student_id on notifications - verify
  const notifCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications'
    ORDER BY ordinal_position
  `);
  console.log('\nnotifications columns:');
  notifCols.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type} | nullable:${r.is_nullable}`));

  // 16. projects.student_id references students.id or profiles.id?
  const projStudentFk = await client.query(`
    SELECT kcu.column_name, ccu.table_name as ref_table, ccu.column_name as ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name AND tc.table_schema=rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name=ccu.constraint_name AND rc.unique_constraint_schema=ccu.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND tc.table_name='projects'
    ORDER BY kcu.column_name
  `);
  console.log('\nprojects foreign keys:');
  projStudentFk.rows.forEach(r => console.log(`  ${r.column_name} -> ${r.ref_table}.${r.ref_col}`));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
