const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://faxzubfvjsekizeiiocg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheHp1YmZ2anNla2l6ZWlpb2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTI1NjUsImV4cCI6MjA5NjU2ODU2NX0.MYpQiuIc9-vufWgvyoqcWRXgAadXTypdZvnfGVXmDSM';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  try {
    // List folders in manuscripts bucket
    const { data: list, error: listErr } = await supabase.storage.from('manuscripts').list();
    if (listErr) {
      console.error('Error listing storage:', listErr);
    } else {
      console.log('Files in manuscripts root:', list);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
