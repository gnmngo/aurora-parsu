const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

async function check() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const { rows: colleges } = await client.query('SELECT * FROM colleges');
  console.log('Colleges:', colleges);

  const { rows: depts } = await client.query('SELECT * FROM departments');
  console.log('Departments:', depts);

  await client.end();
}
check().catch(console.error);
