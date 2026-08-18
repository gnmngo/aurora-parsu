require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function syncEngineeringPrograms() {
  const client = new Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    user: "postgres.faxzubfvjsekizeiiocg",
    password: process.env.SUPABASE_DB_PASSWORD || "tF3cfdc3FQ7fWEdB",
    database: "postgres",
    port: 6543,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL for programs sync...\n");

  const collegeId = "10000000-0000-0000-0000-000000000003"; // College of Engineering and Computational Sciences
  const csDeptId = "b1a3a3f7-ba6f-40f3-ad2f-020f24ca88f5"; // Computer Science
  const itDeptId = "622044a2-08e1-412f-9d7f-6b6bdb46d27d"; // Information Technology

  const targetPrograms = [
    { name: "Bachelor of Science in Civil Engineering", code: "BSCE", deptId: null },
    { name: "Bachelor of Science in Sanitary Engineering", code: "BSSE", deptId: null },
    { name: "Bachelor of Science in Computer Science", code: "BSCS", deptId: csDeptId },
    { name: "Bachelor of Science in Information Technology", code: "BSIT", deptId: itDeptId },
    { name: "Bachelor of Science in Mathematics", code: "BSMath", deptId: null },
    { name: "Bachelor of Automotive Technology", code: "BAT", deptId: null },
    { name: "Bachelor of Engineering Technology", code: "BET", deptId: null },
    { name: "Bachelor of Engineering Technology in Mechanical Engineering Technology", code: "BET-MET", deptId: null },
  ];

  // 1. Rename existing 'BS Computer Science' to 'Bachelor of Science in Computer Science'
  await client.query(`
    UPDATE programs
    SET name = 'Bachelor of Science in Computer Science', code = 'BSCS'
    WHERE name = 'BS Computer Science' AND college_id = $1;
  `, [collegeId]);

  // 2. Insert or update each program
  for (const prog of targetPrograms) {
    const existing = await client.query(`
      SELECT id FROM programs WHERE name = $1 AND college_id = $2;
    `, [prog.name, collegeId]);

    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO programs (name, code, college_id, department_id)
        VALUES ($1, $2, $3, $4);
      `, [prog.name, prog.code, collegeId, prog.deptId]);
      console.log(`Inserted: ${prog.name}`);
    } else {
      await client.query(`
        UPDATE programs
        SET code = $1, department_id = $2
        WHERE id = $3;
      `, [prog.code, prog.deptId, existing.rows[0].id]);
      console.log(`Updated: ${prog.name}`);
    }
  }

  // 3. Verify all programs under College of Engineering and Computational Sciences
  const verifyRes = await client.query(`
    SELECT p.id, p.name, p.code, d.name as department_name
    FROM programs p
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE p.college_id = $1
    ORDER BY p.name;
  `, [collegeId]);

  console.log("\nPrograms for College of Engineering and Computational Sciences:");
  console.log(verifyRes.rows);

  await client.end();
}

syncEngineeringPrograms();
