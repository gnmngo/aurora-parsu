const { Client } = require('pg');
const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function inspect() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const { rows: grants } = await client.query(`
    SELECT grantee, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' AND table_name IN ('programs', 'workflow_templates');
  `);
  console.log('Grants:');
  console.table(grants);

  const { rows: policies } = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('programs', 'workflow_templates');
  `);
  console.log('Policies:');
  console.table(policies);

  await client.end();
}
inspect().catch(console.error);
