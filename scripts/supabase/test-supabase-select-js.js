const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://faxzubfvjsekizeiiocg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheHp1YmZ2anNla2l6ZWlpb2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTI1NjUsImV4cCI6MjA5NjU2ODU2NX0.MYpQiuIc9-vufWgvyoqcWRXgAadXTypdZvnfGVXmDSM';

async function testUser(email, password) {
  console.log(`\n=============================================`);
  console.log(`TESTING USER: ${email}`);
  console.log(`=============================================`);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInErr) {
    console.error(`Sign-in failed for ${email}:`, signInErr.message);
    return;
  }
  console.log(`✓ Authenticated successfully. User ID: ${signInData.user.id}`);

  // Test profiles query with joins (colleges, departments)
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select(`
      *,
      colleges (name, code),
      departments (name, code)
    `)
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profErr) {
    console.error(`❌ Profiles query with joins failed:`, profErr);
  } else {
    console.log(`✓ Profile query succeeded:`, {
      id: profile?.id,
      email: profile?.email,
      status: profile?.status,
      college: profile?.colleges,
      department: profile?.departments
    });
  }

  // Test user_roles query
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select(`
      role_id,
      scope_type,
      scope_id,
      roles (
        code
      )
    `)
    .eq("profile_id", signInData.user.id);

  if (rolesError) {
    console.error(`❌ User roles query failed:`, rolesError);
  } else {
    console.log(`✓ User roles query succeeded. Count: ${userRoles?.length || 0}`);
    userRoles?.forEach((ur, idx) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      console.log(`  Role [${idx}]: code=${role?.code}, scope_type=${ur.scope_type}, scope_id=${ur.scope_id}`);
    });

    const roleIds = userRoles?.map((ur) => ur.role_id) ?? [];
    if (roleIds.length > 0) {
      const { data: rolePerms, error: permsError } = await supabase
        .from("role_permissions")
        .select(`
          permissions (
            code
          )
        `)
        .in("role_id", roleIds);

      if (permsError) {
        console.error(`❌ Role permissions query failed:`, permsError);
      } else {
        const permCodes = rolePerms
          ?.map((rp) => {
            const perm = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
            return perm?.code;
          })
          .filter(Boolean);
        console.log(`✓ Role permissions query succeeded. Permissions:`, permCodes);
      }
    }
  }
}

async function run() {
  await testUser('student1@aurora.test', 'Student123!');
  await testUser('panelist1@aurora.test', 'Panel123!');
  await testUser('admin@aurora.test', 'Admin123!');
  await testUser('coordinator@aurora.test', 'Coord123!');
}

run();
