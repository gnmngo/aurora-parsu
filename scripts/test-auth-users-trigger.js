require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function testAuthUsersTrigger() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to DB to test auth.users trigger...\n");

  const testId = "11111111-2222-3333-4444-555555555555";
  const testEmail = "trigger_test_" + Date.now() + "@parsu.edu.ph";
  const rawMeta = {
    first_name: "TriggerTest",
    last_name: "Student",
    role: "student",
    student_number: "2026-88888",
    campus_id: "00000000-0000-0000-0000-000000000001",
    college_id: "10000000-0000-0000-0000-000000000003",
    department_id: "b1a3a3f7-ba6f-40f3-ad2f-020f24ca88f5",
    program_id: "ea919532-1a73-4c66-ba89-6560a90cd86a"
  };

  try {
    console.log("Inserting into auth.users...");
    await client.query(`
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        $1,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        $2,
        'encrypted_password_hash',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        $3,
        NOW(),
        NOW()
      );
    `, [testId, testEmail, JSON.stringify(rawMeta)]);

    console.log("-> auth.users INSERT OK! Trigger succeeded!");

  } catch (err) {
    console.error("\n*** TRIGGER ERROR OCCURRED ***", err.message);
    console.error("Detail:", err.detail);
    console.error("Hint:", err.hint);
    console.error("Code:", err.code);
    console.error("Where:", err.where);
  } finally {
    // Cleanup
    try {
      await client.query("DELETE FROM public.students WHERE profile_id = $1", [testId]);
      await client.query("DELETE FROM public.user_roles WHERE profile_id = $1", [testId]);
      await client.query("DELETE FROM public.profiles WHERE id = $1", [testId]);
      await client.query("DELETE FROM auth.users WHERE id = $1", [testId]);
    } catch (e) {}
    await client.end();
  }
}

testAuthUsersTrigger();
