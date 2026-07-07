const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('CONNECTED');
    
    const rolesRes = await client.query(`
      SELECT ur.profile_id, p.email, ur.role_id, r.code as role_code, ur.scope_type, ur.scope_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.profile_id
      JOIN public.roles r ON r.id = ur.role_id;
    `);
    
    console.log(`Found ${rolesRes.rows.length} user-role mappings:`);
    for (const row of rolesRes.rows) {
      console.log(`- Profile: ${row.email} (${row.profile_id}) | Role: ${row.role_code} | Scope: ${row.scope_type || 'none'} (${row.scope_id || 'none'})`);
    }

    const allRoles = await client.query('SELECT * FROM public.roles;');
    console.log(`\nAll roles in roles table:`);
    for (const r of allRoles.rows) {
      console.log(`- Role ID: ${r.id} | Code: ${r.code} | Name: ${r.name}`);
    }

    const allPerms = await client.query('SELECT * FROM public.permissions;');
    console.log(`\nAll permissions:`);
    for (const p of allPerms.rows) {
      console.log(`- Perm ID: ${p.id} | Code: ${p.code} | Name: ${p.name}`);
    }

    const allRolePerms = await client.query('SELECT * FROM public.role_permissions;');
    console.log(`\nAll role_permissions:`);
    for (const rp of allRolePerms.rows) {
      console.log(`- Role ID: ${rp.role_id} | Perm ID: ${rp.permission_id}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
