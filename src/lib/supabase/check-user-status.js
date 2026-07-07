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

async function run() {
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'user_status'::regtype
      ORDER BY enumsortorder;
    `);
    console.log('Enum labels for user_status:', rows.map(r => r.enumlabel));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
