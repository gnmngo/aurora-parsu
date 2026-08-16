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

  console.log('====== PHASE 1: ENUM TYPES ======');
  const enums = await client.query(`
    SELECT n.nspname AS schema, t.typname AS name,
           e.enumlabel AS val
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);
  let lastEnum = '';
  enums.rows.forEach(r => {
    if (r.name !== lastEnum) { console.log(`\nENUM: ${r.name}`); lastEnum = r.name; }
    console.log(`  - ${r.val}`);
  });

  console.log('\n====== PHASE 2: TABLES ======');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `);
  tables.rows.forEach(r => process.stdout.write(r.table_name + '  '));
  console.log();

  console.log('\n====== PHASE 3: KEY TABLE COLUMNS ======');
  const keyTables = ['profiles','students','faculty','projects','project_members','documents','document_versions','evaluations','defense_schedules','defense_panels','roles','user_roles','campuses','colleges','departments','programs','majors','workflow_templates','defense_stages','notifications'];
  for (const tbl of keyTables) {
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [tbl]);
    if (cols.rows.length > 0) {
      console.log(`\nTABLE: ${tbl}`);
      cols.rows.forEach(c => {
        const type = c.data_type === 'USER-DEFINED' ? `ENUM(${c.udt_name})` : c.data_type;
        console.log(`  ${c.column_name} | ${type} | nullable:${c.is_nullable}`);
      });
    }
  }

  console.log('\n====== PHASE 4: FOREIGN KEYS ======');
  const fks = await client.query(`
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  fks.rows.forEach(r => {
    console.log(`  ${r.table_name}.${r.column_name} → ${r.referenced_table}.${r.referenced_column} (DELETE ${r.delete_rule})`);
  });

  console.log('\n====== PHASE 5: RLS POLICIES ======');
  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname='public'
    ORDER BY tablename, policyname
  `);
  let lastTable = '';
  policies.rows.forEach(r => {
    if (r.tablename !== lastTable) { console.log(`\n  TABLE: ${r.tablename}`); lastTable = r.tablename; }
    console.log(`    [${r.cmd}] ${r.policyname}`);
    if (r.qual) console.log(`      USING: ${r.qual.substring(0, 150)}`);
    if (r.with_check) console.log(`      CHECK: ${r.with_check.substring(0, 150)}`);
  });

  console.log('\n====== PHASE 6: TRIGGER FUNCTIONS ======');
  const fns = await client.query(`
    SELECT proname, pg_get_functiondef(oid) AS def
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
    AND proname IN (
      'handle_new_user','generate_join_code',
      'tr_projects_join_code_fn','tr_process_evaluation_event_fn',
      'compute_evaluation_score','tr_validate_project_status_fn',
      'has_role','log_auth_event','tr_document_version_fn',
      'tr_workflow_doc_versions_fn','tr_notification_doc_upload_fn'
    )
    ORDER BY proname
  `);
  fns.rows.forEach(r => {
    console.log(`\nFUNCTION: ${r.proname}`);
    console.log(r.def.substring(0, 3000));
    console.log('---');
  });

  console.log('\n====== PHASE 7: STORAGE BUCKETS ======');
  const buckets = await client.query(`
    SELECT id, name, public, allowed_mime_types, file_size_limit
    FROM storage.buckets
  `);
  buckets.rows.forEach(r => {
    console.log(`  Bucket: ${r.name} | public: ${r.public} | mimes: ${JSON.stringify(r.allowed_mime_types)} | max: ${r.file_size_limit}`);
  });

  console.log('\n====== PHASE 8: SAMPLE DATA ======');
  
  const projectSample = await client.query(`
    SELECT id, status, student_id, join_code, campus_id, college_id, department_id, program_id, academic_year
    FROM projects LIMIT 3
  `);
  console.log('\nSample projects:');
  projectSample.rows.forEach(r => console.log(JSON.stringify(r)));
  
  const studentSample = await client.query(`
    SELECT id, profile_id, student_number, program_id, campus_id, college_id, department_id, major_id
    FROM students LIMIT 3
  `);
  console.log('\nSample students:');
  studentSample.rows.forEach(r => console.log(JSON.stringify(r)));
  
  const roleSample = await client.query(`SELECT id, code, name FROM roles ORDER BY code`);
  console.log('\nRoles:');
  roleSample.rows.forEach(r => console.log(JSON.stringify(r)));

  const stagesSample = await client.query(`SELECT id, code, name, sequence_order FROM defense_stages ORDER BY sequence_order`);
  console.log('\nDefense Stages:');
  stagesSample.rows.forEach(r => console.log(JSON.stringify(r)));

  const templatesSample = await client.query(`SELECT id, code, name FROM workflow_templates LIMIT 5`);
  console.log('\nWorkflow Templates:');
  templatesSample.rows.forEach(r => console.log(JSON.stringify(r)));

  console.log('\n====== PHASE 9: PROJECT MEMBER COLUMNS ======');
  const pmCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_members'
    ORDER BY ordinal_position
  `);
  pmCols.rows.forEach(c => {
    const type = c.data_type === 'USER-DEFINED' ? `ENUM(${c.udt_name})` : c.data_type;
    console.log(`  ${c.column_name} | ${type} | nullable:${c.is_nullable}`);
  });

  console.log('\n====== PHASE 10: RLS ENABLED CHECK ======');
  const rlsCheck = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
    AND relkind = 'r'
    ORDER BY relname
  `);
  rlsCheck.rows.forEach(r => {
    if (!r.relrowsecurity) console.log(`  ⚠️  NO RLS: ${r.relname}`);
    else console.log(`  ✓  RLS ON: ${r.relname}`);
  });

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
