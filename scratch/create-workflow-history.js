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

async function createTable() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED to database. Creating project_workflow_history table...');

    const ddl = `
      CREATE TABLE IF NOT EXISTS public.project_workflow_history (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
        from_status public.project_status,
        to_status   public.project_status NOT NULL,
        reason      TEXT,
        created_by  UUID REFERENCES public.profiles(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE public.project_workflow_history ENABLE ROW LEVEL SECURITY;

      -- Create simple RLS policies
      DROP POLICY IF EXISTS pwh_select ON public.project_workflow_history;
      CREATE POLICY pwh_select ON public.project_workflow_history
        FOR SELECT TO authenticated
        USING (true);

      DROP POLICY IF EXISTS pwh_insert ON public.project_workflow_history;
      CREATE POLICY pwh_insert ON public.project_workflow_history
        FOR INSERT TO authenticated
        WITH CHECK (true);
    `;

    await client.query(ddl);
    console.log('SUCCESS: project_workflow_history table created.');

  } catch (err) {
    console.error('Failure:', err);
  } finally {
    await client.end();
  }
}

createTable();
