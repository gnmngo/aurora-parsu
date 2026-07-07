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

  // Get CECS College and BSCS Department
  const { rows: collegeRows } = await pgClient.query("SELECT id FROM colleges WHERE code = 'CECS' LIMIT 1;");
  const { rows: deptRows } = await pgClient.query("SELECT id FROM departments WHERE code = 'BSCS' LIMIT 1;");
  const collegeId = collegeRows[0]?.id || null;
  const deptId = deptRows[0]?.id || null;

  const usersToSeed = [
    {
      email: 'admin@aurora.test',
      password: 'Admin123!',
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
      email: 'student1@aurora.test',
      password: 'Student123!',
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
    }
  ];

  console.log('Starting Supabase user seeding...');

  for (const user of usersToSeed) {
    console.log(`\nProcessing user: ${user.email} with role: ${user.metadata.role}`);

    // Check if user already exists in auth.users
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`Error listing users:`, listError);
      continue;
    }

    const existingUser = listData.users.find(u => u.email === user.email);
    let userId;

    if (existingUser) {
      console.log(`User ${user.email} already exists (ID: ${existingUser.id}). Deleting to ensure clean state...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error(`Error deleting user ${user.email} via Admin API:`, deleteError);
        // Fallback: delete using SQL if Admin API fails (e.g. database link sync latency)
        await pgClient.query('DELETE FROM auth.users WHERE id = $1', [existingUser.id]);
        console.log(`Fallback deleted user ${user.email} via SQL.`);
      } else {
        console.log(`Successfully deleted existing user ${user.email}.`);
      }
    }

    // Create user
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: user.metadata
    });

    if (createError) {
      console.error(`❌ Error creating user ${user.email}:`, createError.message);
      continue;
    }

    userId = createData.user.id;
    console.log(`✔ Created user ${user.email} with UUID ${userId}`);

    // Update profile status to 'approved'
    const { rowCount } = await pgClient.query(
      "UPDATE public.profiles SET status = 'approved'::user_status WHERE id = $1",
      [userId]
    );

    if (rowCount > 0) {
      console.log(`✔ Set profile status to 'approved' for ${user.email}`);
    } else {
      console.error(`❌ Failed to set profile status for ${user.email} (profile not found!)`);
    }

    // Verify role mapping in user_roles
    const { rows: roleRows } = await pgClient.query(`
      SELECT r.code 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = $1
    `, [userId]);
    const assignedRoles = roleRows.map(r => r.code);
    console.log(`- Assigned roles in public.user_roles:`, assignedRoles);

    // Verify sub-profiles are present
    if (user.metadata.role === 'student') {
      const { rows } = await pgClient.query("SELECT * FROM public.students WHERE profile_id = $1", [userId]);
      console.log(`- Student sub-profile verification:`, rows.length > 0 ? 'PASSED' : 'FAILED');
    } else {
      const { rows } = await pgClient.query("SELECT * FROM public.faculty WHERE profile_id = $1", [userId]);
      console.log(`- Faculty sub-profile verification:`, rows.length > 0 ? 'PASSED' : 'FAILED');
    }
  }

  await pgClient.end();
  console.log('\nSeeding process finished.');
}

seed().catch(err => {
  console.error('Unhandled error in seed script:', err);
  process.exit(1);
});
