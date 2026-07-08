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
    
    const tables = ['permissions', 'roles', 'role_permissions', 'user_roles'];
    
    for (const t of tables) {
      console.log(`\nChecking Table RLS: "${t}"`);
      
      const rlsCheck = await client.query(`
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = $1;
      `, [t]);
      console.log(`  RLS Security Enabled: ${rlsCheck.rows[0]?.rowsecurity ? 'YES' : 'NO'}`);

      const policiesRes = await client.query(`
        SELECT policyname, cmd, roles, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = $1;
      `, [t]);
      
      if (policiesRes.rows.length === 0) {
        console.log(`  (No policies found)`);
      } else {
        policiesRes.rows.forEach(p => {
          console.log(`  - Policy: "${p.policyname}" | CMD: ${p.cmd} | Roles: ${p.roles}`);
          console.log(`    USING (QUAL): ${p.qual}`);
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
