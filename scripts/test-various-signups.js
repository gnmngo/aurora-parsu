require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSignUps() {
  const cases = [
    {
      name: "Student with all UUIDs",
      data: {
        first_name: "John",
        last_name: "Doe",
        role: "student",
        student_number: "2022-12345",
        campus_id: "00000000-0000-0000-0000-000000000001",
        college_id: "10000000-0000-0000-0000-000000000003",
        department_id: "b1a3a3f7-ba6f-40f3-ad2f-020f24ca88f5",
        program_id: "ea919532-1a73-4c66-ba89-6560a90cd86a",
        major_id: null,
      }
    },
    {
      name: "Student with null department_id",
      data: {
        first_name: "Jane",
        last_name: "Smith",
        role: "student",
        student_number: "2022-54321",
        campus_id: "00000000-0000-0000-0000-000000000001",
        college_id: "10000000-0000-0000-0000-000000000003",
        department_id: null,
        program_id: "369d1cfc-b14b-439d-8f0e-dd57ea193a0e", // Civil Engineering (dept is null)
        major_id: null,
      }
    },
    {
      name: "Student with empty string for UUIDs",
      data: {
        first_name: "Alex",
        last_name: "Brown",
        role: "student",
        student_number: "2022-67890",
        campus_id: "",
        college_id: "",
        department_id: "",
        program_id: "",
        major_id: "",
      }
    },
    {
      name: "Adviser registration",
      data: {
        first_name: "Prof",
        last_name: "Advisor",
        role: "adviser",
        employee_number: "EMP-001",
        specialization: "AI & ML",
      }
    },
    {
      name: "Panelist registration",
      data: {
        first_name: "Dr",
        last_name: "Panelist",
        role: "panelist",
        employee_number: "EMP-002",
        specialization: "Networks",
      }
    }
  ];

  for (const c of cases) {
    const email = `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@parsu.edu.ph`;
    console.log(`\nTesting: ${c.name} (${email})...`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Password123!",
      options: { data: c.data },
    });

    if (error) {
      console.error(`  [FAILED]: ${error.message} (code: ${error.code}, status: ${error.status})`);
    } else {
      console.log(`  [SUCCESS]: User created (${data.user?.id})`);
    }
  }
}

testSignUps();
