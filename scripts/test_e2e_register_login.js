const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const adminClient = createClient(url, key);
const anonClient = createClient(url, anonKey);

async function testFullRegistrationAndLogin() {
  const timestamp = Date.now();
  const testEmail = `newstudent_${timestamp}@parsu.edu.ph`;
  const testPassword = 'Password123!';
  const testNumber = `2026-${Math.floor(10000 + Math.random() * 90000)}`;

  console.log('--- STEP 1: Creating New User via admin.createUser ---');
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      role: 'student',
      student_number: testNumber,
      campus_id: '00000000-0000-0000-0000-000000000001',
      program_id: '80000000-0000-0000-0000-000000000001',
      year_level: 4,
      section: 'A'
    }
  });

  if (createError) {
    console.error('FAILED to create user:', createError);
    return;
  }
  const userId = userData.user.id;
  console.log('✅ User successfully created in auth.users, ID:', userId);

  console.log('--- STEP 2: Verifying Trigger-Created Entities ---');
  const { data: profile, error: pErr } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (pErr || !profile) {
    console.error('❌ Profile NOT found:', pErr);
  } else {
    console.log('✅ Profile exists! Status:', profile.status, '| Name:', profile.first_name, profile.last_name);
  }

  const { data: roles, error: rErr } = await adminClient
    .from('user_roles')
    .select('*, roles(code)')
    .eq('profile_id', userId);

  if (rErr || !roles.length) {
    console.error('❌ User role NOT found:', rErr);
  } else {
    console.log('✅ User role assigned:', roles.map(r => r.roles?.code));
  }

  const { data: student, error: sErr } = await adminClient
    .from('students')
    .select('*')
    .eq('profile_id', userId);

  if (sErr || !student.length) {
    console.error('❌ Student record NOT found:', sErr);
  } else {
    console.log('✅ Student record created:', student[0].student_number);
  }

  console.log('--- STEP 3: Testing User Login via signInWithPassword (Anon Client) ---');
  const { data: sessionData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError) {
    console.error('❌ Sign in FAILED:', loginError);
  } else {
    console.log('✅ Sign in SUCCESSFUL! Logged in as:', sessionData.user.email);
    console.log('✅ Session Access Token received!');
  }

  console.log('--- STEP 4: Simulating Middleware / Profile Check ---');
  // Simulating what middleware.ts and auth-provider.tsx do:
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
  });

  const { data: authProfile, error: authProfErr } = await userClient
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (authProfErr) {
    console.error('❌ Middleware profile fetch error:', authProfErr);
  } else if (!authProfile) {
    console.error('❌ Middleware profile is NULL');
  } else {
    const allowed = ['approved', 'active'].includes(authProfile.status);
    console.log(`✅ Middleware status check: status="${authProfile.status}", allowed=${allowed}`);
  }

  console.log('--- STEP 5: Cleaning up test user ---');
  await adminClient.auth.admin.deleteUser(userId);
  console.log('✅ Test user cleaned up.');
}

testFullRegistrationAndLogin().catch(console.error);
