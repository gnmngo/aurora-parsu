const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function inspect() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const { rows } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'programs';
  `);
  console.log('Programs Columns:');
  console.table(rows);
  
  const { rows: wf } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workflow_templates';
  `);
  console.log('Workflow Templates Columns:');
  console.table(wf);

  await client.end();
}
inspect().catch(console.error);
