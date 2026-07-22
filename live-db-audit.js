const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  console.log('=== TABLES ===');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  tables.rows.forEach(r => console.log(r.table_name));
  
  console.log('\n=== TRIGGERS (auth schema) ===');
  const triggers = await client.query(`
    SELECT trigger_name, event_object_table, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
    ORDER BY event_object_table
  `);
  triggers.rows.forEach(r => console.log(r.action_timing, r.event_manipulation, 'on', r.event_object_table, '->', r.trigger_name));
  
  console.log('\n=== TRIGGERS (public schema) ===');
  const ptriggers = await client.query(`
    SELECT trigger_name, event_object_table, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table
  `);
  ptriggers.rows.forEach(r => console.log(r.action_timing, r.event_manipulation, 'on', r.event_object_table, '->', r.trigger_name));
  
  console.log('\n=== students COLUMNS ===');
  const stCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students'
    ORDER BY ordinal_position
  `);
  stCols.rows.forEach(r => console.log(r.column_name, '|', r.data_type, '| nullable:', r.is_nullable, '| default:', r.column_default));
  
  console.log('\n=== profiles COLUMNS ===');
  const prCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
    ORDER BY ordinal_position
  `);
  prCols.rows.forEach(r => console.log(r.column_name, '|', r.data_type, '| nullable:', r.is_nullable));
  
  console.log('\n=== roles ROWS ===');
  const roles = await client.query(`SELECT id, code, name FROM public.roles ORDER BY code`);
  roles.rows.forEach(r => console.log(r.id, r.code, r.name));
  
  console.log('\n=== RLS policies on profiles ===');
  const rls = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
  `);
  rls.rows.forEach(r => console.log(r.policyname, '|', r.cmd, '| qual:', r.qual));
  
  console.log('\n=== RLS policies on students ===');
  const rlsSt = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='students'
  `);
  rlsSt.rows.forEach(r => console.log(r.policyname, '|', r.cmd, '| qual:', r.qual));
  
  console.log('\n=== handle_new_user function body ===');
  const fn = await client.query(`
    SELECT prosrc FROM pg_proc WHERE proname='handle_new_user'
  `);
  if (fn.rows.length > 0) {
    console.log(fn.rows[0].prosrc);
  } else {
    console.log('handle_new_user not found!');
  }
  
  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
