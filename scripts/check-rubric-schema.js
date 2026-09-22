const path = require('path');
const { Client } = require(path.join(__dirname, '../node_modules/pg'));
const client = new Client({ host: 'aws-1-ap-southeast-2.pooler.supabase.com', user: 'postgres.faxzubfvjsekizeiiocg', password: 'tF3cfdc3FQ7fWEdB', database: 'postgres', port: 6543, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'rubric_templates'");
  console.log('Columns:', res.rows.map(r => `${r.column_name}: nullable=${r.is_nullable}`));
  const projRes = await client.query("SELECT id, title FROM projects LIMIT 1");
  console.log('Sample project:', projRes.rows);
  await client.end();
}
check();
