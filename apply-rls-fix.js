const fs = require('fs');
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
  const sql = fs.readFileSync('supabase/migrations/20260714000001_fix_profiles_rls.sql', 'utf8');
  await client.connect();
  try {
    console.log('Applying profiles RLS fix...');
    await client.query(sql);
    console.log('✅ RLS fix applied successfully');
    
    // Verify
    const result = await client.query(`
      SELECT policyname, cmd, qual
      FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles'
      ORDER BY policyname
    `);
    console.log('\n=== Updated profiles RLS policies ===');
    result.rows.forEach(r => console.log(r.policyname, '|', r.cmd, '| qual:', r.qual?.substring(0, 80)));
  } catch (err) {
    console.error('❌ Error:', err.message);
    // Try individual statements
    console.log('\nTrying individual statements...');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log('✅', stmt.trim().split('\n')[0].substring(0, 60));
      } catch (e) {
        console.log('⚠️ Skipped:', e.message.substring(0, 80));
      }
    }
  } finally {
    await client.end();
  }
}
run();
