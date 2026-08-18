require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function fixStudentHierarchy() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL to update student records...");

  const campusId = "00000000-0000-0000-0000-000000000001";
  const collegeId = "10000000-0000-0000-0000-000000000003"; // College of Engineering and Computational Sciences
  const deptId = "b1a3a3f7-ba6f-40f3-ad2f-020f24ca88f5"; // Computer Science
  const progId = "ea919532-1a73-4c66-ba89-6560a90cd86a"; // BS Computer Science

  // 1. Update all student records with missing campus_id or department_id
  const res = await client.query(`
    UPDATE students
    SET campus_id = COALESCE(campus_id, $1),
        college_id = COALESCE(college_id, $2),
        department_id = COALESCE(department_id, $3),
        program_id = COALESCE(program_id, $4)
    WHERE campus_id IS NULL OR department_id IS NULL;
  `, [campusId, collegeId, deptId, progId]);

  console.log(`Updated ${res.rowCount} student records with default academic hierarchy.`);

  // 2. Ensure gvmanago003.pbox@parsu.edu.ph has student role and approved status
  const roleRes = await client.query(`
    SELECT id FROM roles WHERE code = 'student' LIMIT 1;
  `);
  const studentRoleId = roleRes.rows[0]?.id;

  if (studentRoleId) {
    await client.query(`
      INSERT INTO user_roles (profile_id, role_id)
      SELECT p.id, $1
      FROM profiles p
      WHERE p.email = 'gvmanago003.pbox@parsu.edu.ph'
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.profile_id = p.id
        );
    `, [studentRoleId]);

    await client.query(`
      UPDATE profiles
      SET status = 'approved'
      WHERE email = 'gvmanago003.pbox@parsu.edu.ph';
    `);
    console.log("Ensured gvmanago003.pbox@parsu.edu.ph has student role and approved status.");
  }

  // 3. Verify students in DB
  const verifyRes = await client.query(`
    SELECT s.id, p.email, s.campus_id, s.department_id, s.program_id, p.status, r.code as role
    FROM students s
    JOIN profiles p ON p.id = s.profile_id
    LEFT JOIN user_roles ur ON ur.profile_id = p.id
    LEFT JOIN roles r ON r.id = ur.role_id;
  `);
  console.log("\nVerified Students in DB:\n", verifyRes.rows);

  await client.end();
}

fixStudentHierarchy();
