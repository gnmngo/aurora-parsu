require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function debugHandleNewUser() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to DB to debug handle_new_user...\n");

  const testId = "99999999-9999-9999-9999-999999999999";
  const testEmail = "debug_student@parsu.edu.ph";
  const rawMeta = {
    first_name: "Debug",
    last_name: "Student",
    role: "student",
    student_number: "2026-99999",
    campus_id: "00000000-0000-0000-0000-000000000001",
    college_id: "10000000-0000-0000-0000-000000000003",
    department_id: "b1a3a3f7-ba6f-40f3-ad2f-020f24ca88f5",
    program_id: "ea919532-1a73-4c66-ba89-6560a90cd86a"
  };

  try {
    // Clean up first if exists
    await client.query("DELETE FROM public.students WHERE profile_id = $1", [testId]);
    await client.query("DELETE FROM public.user_roles WHERE profile_id = $1", [testId]);
    await client.query("DELETE FROM public.profiles WHERE id = $1", [testId]);

    console.log("1. Testing INSERT INTO profiles...");
    await client.query(`
      INSERT INTO public.profiles (
        id, email, first_name, last_name, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'pending', NOW(), NOW()
      );
    `, [testId, testEmail, rawMeta.first_name, rawMeta.last_name]);
    console.log("   -> Profiles INSERT OK");

    console.log("2. Testing role lookup & user_roles INSERT...");
    const roleRes = await client.query("SELECT id FROM public.roles WHERE code = $1", [rawMeta.role]);
    const roleId = roleRes.rows[0]?.id;
    console.log("   -> Role ID found:", roleId);

    await client.query(`
      INSERT INTO public.user_roles (profile_id, role_id, assigned_by)
      VALUES ($1, $2, $1);
    `, [testId, roleId]);
    console.log("   -> user_roles INSERT OK");

    console.log("3. Testing students INSERT...");
    await client.query(`
      INSERT INTO public.students (
        profile_id, student_number, year_level,
        campus_id, college_id, department_id, program_id, major_id
      )
      VALUES (
        $1,
        $2,
        1,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6::uuid,
        NULL
      );
    `, [testId, rawMeta.student_number, rawMeta.campus_id, rawMeta.college_id, rawMeta.department_id, rawMeta.program_id]);
    console.log("   -> students INSERT OK");

  } catch (err) {
    console.error("\n*** ERROR OCCURRED ***", err.message);
    console.error("Detail:", err.detail);
    console.error("Hint:", err.hint);
    console.error("Code:", err.code);
  } finally {
    // Clean up
    await client.query("DELETE FROM public.students WHERE profile_id = $1", [testId]);
    await client.query("DELETE FROM public.user_roles WHERE profile_id = $1", [testId]);
    await client.query("DELETE FROM public.profiles WHERE id = $1", [testId]);
    await client.end();
  }
}

debugHandleNewUser();
