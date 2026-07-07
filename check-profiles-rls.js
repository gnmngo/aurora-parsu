const { Client } = require('pg');

const pgConfig = {
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

async function run() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED');

    const res = await client.query(`
      SELECT id, email, status FROM profiles;
    `);
    console.log('Profiles with status:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
