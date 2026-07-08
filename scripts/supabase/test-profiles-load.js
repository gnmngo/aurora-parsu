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
    
    const profilesRes = await client.query('SELECT * FROM public.profiles;');
    console.log(`Found ${profilesRes.rows.length} profiles.`);
    for (const row of profilesRes.rows) {
      console.log(`\nProfile: ${row.email} | ID: ${row.id} | Status: ${row.status}`);
      console.log(`  college_id: ${row.college_id} | department_id: ${row.department_id}`);
      
      // Let's check college and department relation existence
      if (row.college_id) {
        const colRes = await client.query('SELECT * FROM public.colleges WHERE id = $1', [row.college_id]);
        console.log(`  College:`, colRes.rows[0] ? colRes.rows[0].name : 'NOT FOUND');
      }
      if (row.department_id) {
        const deptRes = await client.query('SELECT * FROM public.departments WHERE id = $1', [row.department_id]);
        console.log(`  Department:`, deptRes.rows[0] ? deptRes.rows[0].name : 'NOT FOUND');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
