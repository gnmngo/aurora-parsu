const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function extractSchema() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const query = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `;
  const { rows: columns } = await client.query(query);
  
  const fkeysQuery = `
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
  `;
  const { rows: fkeys } = await client.query(fkeysQuery);

  const rlsQuery = `
    SELECT tablename, policyname, roles, cmd, qual
    FROM pg_policies 
    WHERE schemaname = 'public';
  `;
  const { rows: rls } = await client.query(rlsQuery);

  const grantsQuery = `
    SELECT table_name, grantee, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated', 'service_role');
  `;
  const { rows: grants } = await client.query(grantsQuery);

  const triggersQuery = `
    SELECT event_object_table, trigger_name, event_manipulation 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
  `;
  const { rows: triggers } = await client.query(triggersQuery);
  
  const fs = require('fs');
  fs.writeFileSync('schema_dump.json', JSON.stringify({ columns, fkeys, rls, grants, triggers }, null, 2));

  await client.end();
}
extractSchema().catch(console.error);
