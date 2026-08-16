const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  
  console.log('=== audit_logs columns ===');
  const al = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs'
    ORDER BY ordinal_position
  `);
  al.rows.forEach(r => console.log(r.column_name, '|', r.data_type === 'USER-DEFINED' ? 'ENUM('+r.udt_name+')' : r.data_type));

  console.log('\n=== project_members - does student_id column exist? ===');
  const pm = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members' AND column_name='student_id'
  `);
  console.log('student_id exists:', pm.rows.length > 0);

  console.log('\n=== project_members - does role column exist? ===');
  const pmRole = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members' AND column_name='role'
  `);
  console.log('role exists:', pmRole.rows.length > 0);

  console.log('\n=== project_members constraints ===');
  const pmConstraints = await client.query(`
    SELECT tc.constraint_name, tc.constraint_type, 
           string_agg(kcu.column_name, ', ') as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='project_members'
    GROUP BY tc.constraint_name, tc.constraint_type
    ORDER BY tc.constraint_type
  `);
  pmConstraints.rows.forEach(r => console.log(r.constraint_type, r.constraint_name, '('+r.columns+')'));

  console.log('\n=== project_status enum values ===');
  const ps = await client.query(`
    SELECT e.enumlabel as val
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'project_status'
    ORDER BY e.enumsortorder
  `);
  ps.rows.forEach(r => console.log(' -', r.val));

  console.log('\n=== member_role enum values ===');
  const mr = await client.query(`
    SELECT e.enumlabel as val
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'member_role'
    ORDER BY e.enumsortorder
  `);
  mr.rows.forEach(r => console.log(' -', r.val));

  console.log('\n=== programs.is_active column ===');
  const progActive = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name='is_active'
  `);
  console.log('is_active exists:', progActive.rows.length > 0);

  console.log('\n=== college_coordinator role exists? ===');
  const ccRole = await client.query(`SELECT * FROM roles WHERE code='college_coordinator'`);
  console.log('college_coordinator in roles table:', ccRole.rows.length > 0);
  
  console.log('\n=== validate_project_status_transition function ===');
  const fn = await client.query(`
    SELECT pg_get_functiondef(oid) as def 
    FROM pg_proc 
    WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') 
    AND proname='validate_project_status_transition'
  `);
  fn.rows.forEach(r => console.log(r.def));

  console.log('\n=== set_project_join_code function ===');
  const joinFn = await client.query(`
    SELECT pg_get_functiondef(oid) as def 
    FROM pg_proc 
    WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') 
    AND proname='set_project_join_code'
  `);
  joinFn.rows.forEach(r => console.log(r.def));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
