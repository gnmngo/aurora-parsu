const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  
  // Check is_project_participant
  const fn = await client.query(`
    SELECT proname, pg_get_functiondef(oid) as def 
    FROM pg_proc 
    WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') 
    AND proname='is_project_participant'
  `);
  console.log('=== is_project_participant ===');
  fn.rows.forEach(r => console.log(r.def));
  if (!fn.rows.length) console.log('NOT FOUND');

  // Check trigger on projects for join code
  const triggers = await client.query(`
    SELECT tgname, tgtype, tgenabled, 
           pg_get_triggerdef(oid) as def
    FROM pg_trigger
    WHERE tgrelid = 'public.projects'::regclass
    AND NOT tgisinternal
    ORDER BY tgname
  `);
  console.log('\n=== Triggers on projects ===');
  triggers.rows.forEach(r => console.log(r.tgname, '|', r.def.substring(0,200)));

  // Check triggers on auth.users
  const authTriggers = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) as def
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
    AND NOT tgisinternal
    ORDER BY tgname
  `);
  console.log('\n=== Triggers on auth.users ===');
  authTriggers.rows.forEach(r => console.log(r.tgname, '|', r.def.substring(0,200)));

  // Check profiles status column default
  const profStatus = await client.query(`
    SELECT column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='status'
  `);
  console.log('\n=== profiles.status default ===', JSON.stringify(profStatus.rows[0]));

  // Check projects status column and constraint
  const projStatus = await client.query(`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='status'
  `);
  console.log('=== projects.status default ===', JSON.stringify(projStatus.rows[0]));

  // Check project_members columns
  const pmCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members'
    ORDER BY ordinal_position
  `);
  console.log('\n=== project_members columns ===');
  pmCols.rows.forEach(r => console.log(r.column_name, '|', r.data_type === 'USER-DEFINED' ? 'ENUM('+r.udt_name+')' : r.data_type, '| nullable:', r.is_nullable));

  // Check if campuses table has RLS on
  const rlsCheck = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
    AND relkind='r'
    AND relname IN ('campuses','colleges','departments','programs','majors')
    ORDER BY relname
  `);
  console.log('\n=== RLS on hierarchy tables ===');
  rlsCheck.rows.forEach(r => console.log(r.relname, r.relrowsecurity ? 'RLS ON' : 'RLS OFF'));

  // campuses RLS policies
  const campusPolicies = await client.query(`
    SELECT policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname='public' AND tablename='campuses'
  `);
  console.log('\n=== campuses policies ===');
  campusPolicies.rows.forEach(r => console.log(r.policyname, '|', r.cmd, '|', r.qual));

  // Check student has no UPDATE RLS
  const studentsRLS = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='students'
    ORDER BY policyname
  `);
  console.log('\n=== students policies ===');
  studentsRLS.rows.forEach(r => console.log(r.policyname, '|', r.cmd, '|', r.qual?.substring(0,100)));

  // Check for college_coordinator role
  const roleCheck = await client.query(`SELECT code FROM roles ORDER BY code`);
  console.log('\n=== All roles ===');
  roleCheck.rows.forEach(r => console.log(r.code));

  // Check evaluations - does it have student_id or panelist joins profiles?
  const evalFKs = await client.query(`
    SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name AND tc.table_schema=rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name=ccu.constraint_name AND rc.unique_constraint_schema=ccu.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND tc.table_name='evaluations'
  `);
  console.log('\n=== evaluations foreign keys ===');
  evalFKs.rows.forEach(r => console.log(r.column_name, '->', r.ref_table + '.' + r.ref_col));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
