require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function testAsAuthAdmin() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const testId = "33333333-4444-5555-6666-777777777777";
  const testEmail = "auth_admin_test_" + Date.now() + "@parsu.edu.ph";

  try {
    console.log("Setting role to supabase_auth_admin...");
    await client.query("SET ROLE supabase_auth_admin");

    console.log("Attempting INSERT into auth.users as supabase_auth_admin...");
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        $2,
        'encrypted_password_hash',
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Test","last_name":"User","role":"student","student_number":"2026-11111"}',
        NOW(),
        NOW()
      );
    `, [testId, testEmail]);

    console.log(">>> SUCCESS: supabase_auth_admin inserted user successfully! <<<");
  } catch (err) {
    console.error(">>> FAILED as supabase_auth_admin: <<<");
    console.error("Message:", err.message);
    console.error("Detail:", err.detail);
    console.error("Hint:", err.hint);
    console.error("Where:", err.where);
  } finally {
    try {
      await client.query("RESET ROLE");
      await client.query("DELETE FROM public.students WHERE profile_id = $1", [testId]);
      await client.query("DELETE FROM public.user_roles WHERE profile_id = $1", [testId]);
      await client.query("DELETE FROM public.profiles WHERE id = $1", [testId]);
      await client.query("DELETE FROM auth.users WHERE id = $1", [testId]);
    } catch (e) {}
    await client.end();
  }
}

testAsAuthAdmin();
