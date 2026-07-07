const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://faxzubfvjsekizeiiocg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheHp1YmZ2anNla2l6ZWlpb2NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk5MjU2NSwiZXhwIjoyMDk2NTY4NTY1fQ.ZSbcJ_rMa2OIeNU5OTqObthUFYb1mr3XeYTFUfpoHuw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Connecting via Supabase JS...');
    
    // Check tables counts
    const tables = ['profiles', 'roles', 'user_roles', 'evaluations', 'projects', 'project_members', 'rubric_templates', 'grading_templates', 'defense_stages'];
    for (const table of tables) {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error querying ${table}:`, error.message);
      } else {
        console.log(`${table}: ${count} rows`);
      }
    }

    // Get current roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, code, description');
    if (rolesError) {
      console.error('Error fetching roles:', rolesError.message);
    } else {
      console.log('\nRoles in DB:', roles);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
