const { Client } = require('pg');

const pgConfig = {
  host: 'db.faxzubfvjsekizeiiocg.supabase.co',
  user: 'postgres',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

async function updatePolicies() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED to database. Updating project registration RLS policies...');

    const ddl = `
      -- 1. Allow students to insert projects
      DROP POLICY IF EXISTS projects_insert ON public.projects;
      CREATE POLICY projects_insert ON public.projects
        FOR INSERT TO authenticated
        WITH CHECK (
          has_role('student')
          OR has_role('coordinator')
          OR has_role('sys_admin')
        );

      -- 2. Allow students to insert project members mapping for themselves
      DROP POLICY IF EXISTS project_members_insert ON public.project_members;
      CREATE POLICY project_members_insert ON public.project_members
        FOR INSERT TO authenticated
        WITH CHECK (
          profile_id = auth.uid()
          OR has_role('coordinator')
          OR has_role('sys_admin')
        );
    `;

    await client.query(ddl);
    console.log('SUCCESS: Projects and Project Members insertion RLS policies updated.');

  } catch (err) {
    console.error('Failure:', err);
  } finally {
    await client.end();
  }
}

updatePolicies();
