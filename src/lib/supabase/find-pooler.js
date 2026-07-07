const { Client } = require('pg');

const REGIONS = [
  'ap-southeast-1', // Singapore
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-south-1',     // Mumbai
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-central-1',   // Frankfurt
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'ap-southeast-2', // Sydney
  'ca-central-1',   // Central Canada
  'eu-west-3',      // Paris
  'sa-east-1'       // Sao Paulo
];

const TENANT = 'faxzubfvjsekizeiiocg';
const PASSWORD = 'aurora-parsu';

async function findRegion() {
  console.log(`Probing regions to locate database tenant '${TENANT}'...`);
  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host: host,
      user: `postgres.${TENANT}`,
      password: PASSWORD,
      database: 'postgres',
      port: 6543,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS! Connected to host: ${host}`);
      await client.end().catch(() => {});
      break;
    } catch (err) {
      console.log(`[${region}] Error: ${err.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }
}

findRegion();
