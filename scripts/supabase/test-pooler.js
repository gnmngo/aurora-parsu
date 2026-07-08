const { Client } = require('pg');

async function runDiagnostics() {
  const host = 'aws-1-ap-southeast-2.pooler.supabase.com';
  const user = 'postgres.faxzubfvjsekizeiiocg';
  const password = 'aurora-parsu';
  const database = 'postgres';

  console.log(`Diagnostic test connecting to pooler host: ${host}`);

  // Test 1: Port 6543 (Transaction Mode)
  console.log('\n--- Test 1: Port 6543 (Transaction Mode) ---');
  try {
    const client = new Client({
      host,
      user,
      password,
      database,
      port: 6543,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    await client.connect();
    console.log('🎉 Port 6543 connected successfully!');
    await client.end();
  } catch (err) {
    console.error('Port 6543 Error:', err);
  }

  // Test 2: Port 5432 (Session Mode)
  console.log('\n--- Test 2: Port 5432 (Session Mode) ---');
  try {
    const client = new Client({
      host,
      user,
      password,
      database,
      port: 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    await client.connect();
    console.log('🎉 Port 5432 connected successfully!');
    await client.end();
  } catch (err) {
    console.error('Port 5432 Error:', err);
  }

  // Test 3: Using Connection String
  console.log('\n--- Test 3: Connection String Port 6543 ---');
  try {
    const connectionString = `postgres://${user}:${password}@${host}:6543/${database}?sslmode=require`;
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000
    });
    await client.connect();
    console.log('🎉 Connection string connected successfully!');
    await client.end();
  } catch (err) {
    console.error('Connection String Error:', err);
  }
}

runDiagnostics();
