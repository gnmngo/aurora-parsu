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

async function runDataIntegrityCheck() {
  try {
    await client.connect();
    console.log('Successfully connected to remote database for data integrity checks...');
    console.log('----------------------------------------------------------------------');

    // 1. Validate enum values exist
    console.log('1. Validating annotation_status enum values...');
    const { rows: enumRows } = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'annotation_status'::regtype
      ORDER BY enumsortorder;
    `);
    const labels = enumRows.map(r => r.enumlabel);
    console.log('Current enum labels:', labels);
    const requiredLabels = ['in_progress', 'addressed', 'verified'];
    const missingLabels = requiredLabels.filter(l => !labels.includes(l));
    if (missingLabels.length === 0) {
      console.log('✔ All required enum values exist!');
    } else {
      console.error('❌ Missing enum values:', missingLabels);
    }

    // 2. Validate foreign keys
    console.log('\n2. Validating foreign key constraints on extended columns...');
    const { rows: fkRows } = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name = 'audit_logs'
        AND kcu.column_name IN ('project_id', 'stage_id');
    `);
    console.log('Foreign keys on audit_logs:', fkRows);
    const hasProjectFK = fkRows.some(r => r.column_name === 'project_id' && r.foreign_table_name === 'projects');
    const hasStageFK = fkRows.some(r => r.column_name === 'stage_id' && r.foreign_table_name === 'defense_stages');
    if (hasProjectFK && hasStageFK) {
      console.log('✔ Foreign keys for project_id and stage_id on audit_logs are fully intact!');
    } else {
      console.error('❌ Missing required foreign key constraints on audit_logs.');
    }

    // 3. Validate no null-breaking joins (test query views)
    console.log('\n3. Testing view executions to verify no join or calculation errors...');
    const views = ['panel_consensus_summary', 'revision_compliance_metrics', 'project_readiness_status'];
    for (const view of views) {
      try {
        const { rows } = await client.query(`SELECT * FROM ${view} LIMIT 1;`);
        console.log(`✔ View '${view}' executes cleanly. Row sample count: ${rows.length}`);
      } catch (err) {
        console.error(`❌ View '${view}' failed to execute:`, err.message);
      }
    }

  } catch (err) {
    console.error('Error during data integrity checks:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

runDataIntegrityCheck();
