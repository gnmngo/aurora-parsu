require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: roles } = await supabase.from('roles').select('*');
  console.log('Roles in DB:');
  console.table(roles.map(r => ({ id: r.id, code: r.code, name: r.name })));

  const { data: userRoles, error } = await supabase.from('user_roles').select('*');
  if (error) { console.error('Error fetching user_roles:', error); return; }
  console.log('\nUser role assignments count:', userRoles.length);

  const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name, status');
  const profMap = new Map(profiles.map(p => [p.id, p]));
  const roleMap = new Map(roles.map(r => [r.id, r]));

  const byCode = {};
  userRoles.forEach(ur => {
    const role = roleMap.get(ur.role_id);
    const code = role ? role.code : 'unknown';
    byCode[code] = (byCode[code] || 0) + 1;
  });
  console.log('Assignments by role code:', byCode);

  const sampleUsers = {};
  userRoles.forEach(ur => {
    const role = roleMap.get(ur.role_id);
    const code = role ? role.code : 'unknown';
    const p = profMap.get(ur.profile_id);
    if (!sampleUsers[code] && p) {
      sampleUsers[code] = {
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        status: p.status,
        profile_id: p.id
      };
    }
  });
  console.log('\nSample users for each role:');
  console.table(sampleUsers);
})();
