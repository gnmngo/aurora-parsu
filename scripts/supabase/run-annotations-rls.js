const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 5432;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

const ddl = `
  -- 1. Enable RLS on annotations
  ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

  -- 2. Drop existing policies to recreate them cleanly
  DROP POLICY IF EXISTS annotations_select ON public.annotations;
  DROP POLICY IF EXISTS annotations_insert ON public.annotations;
  DROP POLICY IF EXISTS annotations_update ON public.annotations;
  DROP POLICY IF EXISTS annotations_delete ON public.annotations;

  -- 3. Create SELECT policy (participants or coordinators/admins)
  CREATE POLICY annotations_select ON public.annotations FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.document_versions dv
        JOIN public.documents d ON d.id = dv.document_id
        WHERE dv.id = annotations.document_version_id
          AND (
            is_project_participant(d.project_id)
            OR has_role('dept_coordinator')
            OR has_role('sys_admin')
          )
      )
    );

  -- 4. Create INSERT policy (any authenticated profile using their own ID)
  CREATE POLICY annotations_insert ON public.annotations FOR INSERT
    WITH CHECK (
      created_by = auth.uid()
    );

  -- 5. Create UPDATE policy (allow updates by participants/coordinators/admins)
  CREATE POLICY annotations_update ON public.annotations FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.document_versions dv
        JOIN public.documents d ON d.id = dv.document_id
        WHERE dv.id = annotations.document_version_id
          AND (
            is_project_participant(d.project_id)
            OR has_role('dept_coordinator')
            OR has_role('sys_admin')
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.document_versions dv
        JOIN public.documents d ON d.id = dv.document_id
        WHERE dv.id = annotations.document_version_id
          AND (
            is_project_participant(d.project_id)
            OR has_role('dept_coordinator')
            OR has_role('sys_admin')
          )
      )
    );

  -- 6. Create DELETE policy (owner, department coordinator, or system admin)
  CREATE POLICY annotations_delete ON public.annotations FOR DELETE
    USING (
      created_by = auth.uid()
      OR has_role('dept_coordinator')
      OR has_role('sys_admin')
    );
`;

async function run() {
  const client = new Client({
    host: HOST,
    user: USER,
    password: PASSWORD,
    database: DATABASE,
    port: PORT,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to remote Supabase database...');
    
    console.log('Enabling RLS on public.annotations and recreating security policies...');
    await client.query(ddl);
    console.log('✔ RLS policies applied successfully!');

    // Validate
    const { rows } = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'annotations';
    `);
    console.log(`- Table 'annotations' RLS status: ${rows[0].rowsecurity ? 'ENABLED' : 'DISABLED'}`);

  } catch (err) {
    console.error('❌ Failed to run annotations RLS migration:', err.message);
  } finally {
    await client.end();
    console.log('Done.');
  }
}

run();
