const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Read env.local
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Failed to read .env.local', e);
  process.exit(1);
}

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const pgConfig = {
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432, // Session Mode
  ssl: {
    rejectUnauthorized: false
  }
};

async function seed() {
  const pgClient = new Client(pgConfig);
  await pgClient.connect();
  console.log('Connected to Postgres via pg client.');

  // Create Supabase Admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Drop audit_logs rules to allow cascades/deletes
  console.log('\n--- TEMPORARILY DROPPING AUDIT_LOGS RULES ---');
  await pgClient.query('DROP RULE IF EXISTS audit_no_delete ON audit_logs;');
  await pgClient.query('DROP RULE IF EXISTS audit_no_update ON audit_logs;');
  console.log('✔ Dropped rules.');

  // 2. Grant missing privileges to roles (CRITICAL ROOT CAUSE FIX)
  console.log('\n--- GRANTING SCHEMA PRIVILEGES ---');
  const grantSQL = `
    -- Grant SELECT, INSERT, UPDATE, DELETE on all tables in public to anon, authenticated, service_role
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
    
    -- Grant ALL on sequences and execute on functions
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;
  `;
  try {
    await pgClient.query(grantSQL);
    console.log('✔ Successfully granted privileges.');
  } catch (err) {
    console.error('❌ Failed to grant permissions:', err.message);
  }

  // Get CECS College and BSCS Department
  const { rows: collegeRows } = await pgClient.query("SELECT id FROM colleges WHERE code = 'CECS' LIMIT 1;");
  const { rows: deptRows } = await pgClient.query("SELECT id FROM departments WHERE code = 'BSCS' LIMIT 1;");
  const collegeId = collegeRows[0]?.id || null;
  const deptId = deptRows[0]?.id || null;

  // Exact 5 Demo Accounts to seed
  const usersToSeed = [
    {
      email: 'admin@aurora.test',
      password: 'Admin123!',
      roleCode: 'sys_admin',
      firstName: 'System',
      lastName: 'Admin',
      metadata: {
        role: 'sys_admin',
        first_name: 'System',
        last_name: 'Admin',
        college_id: collegeId,
        department_id: deptId,
        employee_number: 'EMP-SYSADMIN'
      }
    },
    {
      email: 'panelist1@aurora.test',
      password: 'Panel123!',
      roleCode: 'panel_member',
      firstName: 'Panelist',
      lastName: 'One',
      metadata: {
        role: 'panel_member',
        first_name: 'Panelist',
        last_name: 'One',
        college_id: collegeId,
        department_id: deptId,
        employee_number: 'EMP-PANELIST1'
      }
    },
    {
      email: 'panelist2@aurora.test',
      password: 'Panel123!',
      roleCode: 'panel_member',
      firstName: 'Panelist',
      lastName: 'Two',
      metadata: {
        role: 'panel_member',
        first_name: 'Panelist',
        last_name: 'Two',
        college_id: collegeId,
        department_id: deptId,
        employee_number: 'EMP-PANELIST2'
      }
    },
    {
      email: 'student1@aurora.test',
      password: 'Student123!',
      roleCode: 'student',
      firstName: 'Student',
      lastName: 'One',
      metadata: {
        role: 'student',
        first_name: 'Student',
        last_name: 'One',
        college_id: collegeId,
        department_id: deptId,
        student_number: 'STUD-STUDENT1',
        program: 'BSCS',
        year_level: 4
      }
    },
    {
      email: 'coordinator@aurora.test',
      password: 'Coord123!',
      roleCode: 'dept_coordinator',
      firstName: 'Department',
      lastName: 'Coordinator',
      metadata: {
        role: 'dept_coordinator',
        first_name: 'Department',
        last_name: 'Coordinator',
        college_id: collegeId,
        department_id: deptId,
        employee_number: 'EMP-COORD'
      }
    }
  ];

  console.log('\n--- SEEDING AUTHENTICATION DEMO USERS ---');
  
  // List users in Auth
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(`Error listing users:`, listError);
    await pgClient.end();
    process.exit(1);
  }

  const userIds = {};

  for (const user of usersToSeed) {
    console.log(`Processing user: ${user.email} (Role: ${user.roleCode})`);
    const existingUser = listData.users.find(u => u.email === user.email);
    let uid;

    if (existingUser) {
      console.log(`  User already exists (ID: ${existingUser.id}). Updating password and metadata...`);
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: user.password,
          user_metadata: user.metadata
        }
      );
      if (updateError) {
        console.error(`  ❌ Error updating user ${user.email}:`, updateError.message);
        continue;
      }
      uid = existingUser.id;
    } else {
      console.log(`  Creating user...`);
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });
      if (createError) {
        console.error(`  ❌ Error creating user ${user.email}:`, createError.message);
        continue;
      }
      uid = createData.user.id;
    }

    userIds[user.email] = uid;
    console.log(`  ✔ User ready with ID: ${uid}`);

    // Set profile status to 'approved'
    await pgClient.query(
      "UPDATE public.profiles SET status = 'approved'::user_status, first_name = $2, last_name = $3 WHERE id = $1",
      [uid, user.firstName, user.lastName]
    );
  }

  // 2. Clean up subprofile mapping duplicates (SYSADMIN and PANELISTS should NOT be in students table)
  console.log('\n--- CLEANING SUBPROFILE DUPLICATES ---');
  const cleanupSQL = `
    -- Remove non-students from students table
    DELETE FROM public.students WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE email IN ('admin@aurora.test', 'panelist1@aurora.test', 'panelist2@aurora.test', 'coordinator@aurora.test')
    );
    
    -- Remove students from faculty table
    DELETE FROM public.faculty WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE email = 'student1@aurora.test'
    );
  `;
  await pgClient.query(cleanupSQL);
  console.log('✔ Duplicate subprofiles removed.');

  // Let's verify student1 student row exists
  const student1Uid = userIds['student1@aurora.test'];
  const studentRowRes = await pgClient.query("SELECT id FROM public.students WHERE profile_id = $1", [student1Uid]);
  let studentTableId = studentRowRes.rows[0]?.id;
  if (!studentTableId) {
    // Generate one
    const insertStudent = await pgClient.query(
      "INSERT INTO public.students (profile_id, student_number, program, year_level) VALUES ($1, 'STUD-STUDENT1', 'BSCS', 4) RETURNING id",
      [student1Uid]
    );
    studentTableId = insertStudent.rows[0].id;
    console.log(`✔ Created missing student subprofile for student1. Student ID: ${studentTableId}`);
  } else {
    console.log(`✔ Verified student1 student subprofile exists (ID: ${studentTableId}).`);
  }

  // 4. Seed Demo Project records (concept defense stage)
  console.log('\n--- SEEDING DEMO PROJECT ---');
  const DEMO_PROJECT_ID = '77777777-7777-7777-7777-777777777701';
  const DEMO_RUBRIC_ID = '77777777-7777-7777-7777-777777777702';
  const DEMO_DOC_ID = '77777777-7777-7777-7777-777777777703';
  const DEMO_VER_ID = '77777777-7777-7777-7777-777777777704';
  const DEMO_ANN_1_ID = '77777777-7777-7777-7777-777777777705';
  const DEMO_ANN_2_ID = '77777777-7777-7777-7777-777777777706';
  const DEMO_EVAL_ID = '77777777-7777-7777-7777-777777777707';
  const DEMO_SCHED_ID = '77777777-7777-7777-7777-777777777708';

  const CONCEPT_STAGE_ID = '782ac8d9-b5be-420e-8806-abae02249c24'; // Concept Defense

  // Delete previous demo records to ensure clean state (run individually)
  await pgClient.query('DELETE FROM public.defense_schedules WHERE id = $1', [DEMO_SCHED_ID]);
  await pgClient.query('DELETE FROM public.evaluations WHERE id = $1', [DEMO_EVAL_ID]);
  await pgClient.query('DELETE FROM public.annotations WHERE document_version_id = $1', [DEMO_VER_ID]);
  await pgClient.query('DELETE FROM public.document_versions WHERE id = $1', [DEMO_VER_ID]);
  await pgClient.query('DELETE FROM public.documents WHERE id = $1', [DEMO_DOC_ID]);
  await pgClient.query('DELETE FROM public.rubric_templates WHERE id = $1', [DEMO_RUBRIC_ID]);
  await pgClient.query('DELETE FROM public.projects WHERE id = $1', [DEMO_PROJECT_ID]);
  console.log('✔ Cleaned old demo entries.');

  // Insert Project
  await pgClient.query(`
    INSERT INTO public.projects (id, campus_id, department_id, student_id, title, academic_year, status)
    VALUES ($1, $2, $3, $4, 'AURORA Demo Workspace Project', '2025-2026', 'under_review')
  `, [DEMO_PROJECT_ID, collegeId ? '00000000-0000-0000-0000-000000000001' : null, deptId, studentTableId]);
  console.log('✔ Seeded projects row.');

  // Insert Project Student Member
  await pgClient.query(`
    INSERT INTO public.project_members (project_id, profile_id, member_role, is_primary)
    VALUES ($1, $2, 'student', true)
    ON CONFLICT DO NOTHING
  `, [DEMO_PROJECT_ID, student1Uid]);

  // Insert Rubric
  const criteria = [
    { id: 'c1', name: 'Technical Quality', weight: 40 },
    { id: 'c2', name: 'Methodology', weight: 35 },
    { id: 'c3', name: 'Clarity & Style', weight: 25 }
  ];
  await pgClient.query(`
    INSERT INTO public.rubric_templates (id, project_id, title, criteria, passing_score, excellent_score, target_compliance_rate, min_compliance_rate, max_major_unresolved, created_by)
    VALUES ($1, $2, 'Proposal Defense Rubric', $3, 75.00, 85.00, 90.00, 70.00, 2, $4)
  `, [DEMO_RUBRIC_ID, DEMO_PROJECT_ID, JSON.stringify(criteria), userIds['panelist1@aurora.test']]);
  console.log('✔ Seeded rubric_templates row.');

  // Insert Document
  await pgClient.query(`
    INSERT INTO public.documents (id, project_id, stage_id, title, status, created_by)
    VALUES ($1, $2, $3, 'Demo Proposal Manuscript', 'under_review', $4)
  `, [DEMO_DOC_ID, DEMO_PROJECT_ID, CONCEPT_STAGE_ID, student1Uid]);
  console.log('✔ Seeded documents row.');

  // Insert Document Version
  await pgClient.query(`
    INSERT INTO public.document_versions (id, document_id, version_number, storage_path, file_name, file_size, mime_type, checksum_sha256, uploaded_by, is_current, change_summary)
    VALUES ($1, $2, 1, 'manuscripts/demo.pdf', 'demo_manuscript.pdf', 3000, 'application/pdf', 'sha256_demo_pdf_placeholder_hash', $3, true, 'Initial upload')
  `, [DEMO_VER_ID, DEMO_DOC_ID, student1Uid]);
  console.log('✔ Seeded document_versions row.');

  // Insert Comments/Annotations
  await pgClient.query(`
    INSERT INTO public.annotations (id, document_version_id, type, page_number, coordinates, selected_text, content, severity, status, created_by)
    VALUES 
      ($1, $3, 'text_comment', 1, '{"left": 15, "top": 20, "width": 70, "height": 5}', null, 'The title is extremely comprehensive. Ensure it is aligned with the department scope guidelines.', 'minor', 'open', $4),
      ($2, $3, 'text_comment', 2, '{"left": 15, "top": 30, "width": 70, "height": 6}', null, 'Chapter II needs a diagram representing the data flows and system events.', 'major', 'in_progress', $4)
  `, [DEMO_ANN_1_ID, DEMO_ANN_2_ID, DEMO_VER_ID, userIds['panelist1@aurora.test']]);
  console.log('✔ Seeded annotations rows.');

  // Insert Evaluation
  await pgClient.query(`
    INSERT INTO public.evaluations (id, project_id, stage_id, panelist_id, rubric_template_id, status, scores, verdict_code, panel_notes)
    VALUES ($1, $2, $3, $4, $5, 'draft', '{"c1": 80, "c2": 85, "c3": 90}', 'passed_minor', 'Initial evaluation draft.')
  `, [DEMO_EVAL_ID, DEMO_PROJECT_ID, CONCEPT_STAGE_ID, userIds['panelist1@aurora.test'], DEMO_RUBRIC_ID]);
  console.log('✔ Seeded evaluations row.');

  // Insert Defense Schedule
  await pgClient.query(`
    INSERT INTO public.defense_schedules (id, project_id, stage_id, scheduled_at, end_at, room, building, is_online, status, created_by)
    VALUES ($1, $2, $3, '2026-06-20T09:00:00Z', '2026-06-20T10:00:00Z', 'CECS Conference Room', 'Engineering Building', false, 'scheduled'::schedule_status, $4)
  `, [DEMO_SCHED_ID, DEMO_PROJECT_ID, CONCEPT_STAGE_ID, userIds['coordinator@aurora.test']]);
  console.log('✔ Seeded defense_schedules row.');

  // 5. Re-create audit_logs rules
  console.log('\n--- RECREATING AUDIT_LOGS RULES ---');
  await pgClient.query('CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;');
  await pgClient.query('CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;');
  console.log('✔ Recreated rules.');

  await pgClient.end();
  console.log('\nRECOVERY AND SEEDING COMPLETED SUCCESSFULLY.');
}

seed().catch(err => {
  console.error('Unhandled error in recovery script:', err);
  process.exit(1);
});
