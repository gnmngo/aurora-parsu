const { Client } = require('pg');

async function fixDepartmentsRLS() {
  const client = new Client({
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    user: 'postgres.faxzubfvjsekizeiiocg',
    password: process.env.SUPABASE_DB_PASSWORD || 'tF3cfdc3FQ7fWEdB',
    database: 'postgres',
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected to pg...');

  await client.query(`
    DROP POLICY IF EXISTS "departments_read_all" ON public.departments;
    DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
    DROP POLICY IF EXISTS "departments_select" ON public.departments;
    CREATE POLICY "departments_select" ON public.departments FOR SELECT TO public USING (true);

    DROP POLICY IF EXISTS "colleges_select" ON public.colleges;
    CREATE POLICY "colleges_select" ON public.colleges FOR SELECT TO public USING (true);

    DROP POLICY IF EXISTS "campuses_select" ON public.campuses;
    CREATE POLICY "campuses_select" ON public.campuses FOR SELECT TO public USING (true);
  `);

  console.log('Public SELECT policies applied to departments, colleges, and campuses!');
  await client.end();
}

fixDepartmentsRLS();
