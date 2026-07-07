const fs = require('fs');
const path = require('path');

async function checkRPCs() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

  if (!supabaseUrlMatch || !serviceKeyMatch) {
    console.error('Missing Supabase credentials in .env.local');
    return;
  }

  const supabaseUrl = supabaseUrlMatch[1].trim();
  const serviceKey = serviceKeyMatch[1].trim();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rpcs = Object.keys(data.paths || {})
      .filter(p => p.startsWith('/rpc/'))
      .map(p => p.substring(5));

    console.log('Available RPC Functions:');
    console.log(rpcs);
  } catch (error) {
    console.error('Error fetching PostgREST spec:', error);
  }
}

checkRPCs();
