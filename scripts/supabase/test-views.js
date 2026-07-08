const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function testViews() {
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
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Testing panel_consensus_summary...');
  const { data: consensus, error: consensusError } = await supabase
    .from('panel_consensus_summary')
    .select('*')
    .limit(1);
  if (consensusError) {
    console.error('panel_consensus_summary error:', consensusError.message);
  } else {
    console.log('panel_consensus_summary exists! Data:', consensus);
  }

  console.log('Testing revision_compliance_metrics...');
  const { data: compliance, error: complianceError } = await supabase
    .from('revision_compliance_metrics')
    .select('*')
    .limit(1);
  if (complianceError) {
    console.error('revision_compliance_metrics error:', complianceError.message);
  } else {
    console.log('revision_compliance_metrics exists! Data:', compliance);
  }

  console.log('Testing project_readiness_status...');
  const { data: readiness, error: readinessError } = await supabase
    .from('project_readiness_status')
    .select('*')
    .limit(1);
  if (readinessError) {
    console.error('project_readiness_status error:', readinessError.message);
  } else {
    console.log('project_readiness_status exists! Data:', readiness);
  }
}

testViews();
