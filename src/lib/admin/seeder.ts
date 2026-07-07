import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const PROJECT_TITLES = [
  "AI-Based Student Attendance System with Face Recognition",
  "Partido State University Barangay Health Monitoring System",
  "Smart Irrigation System using IoT Sensors and Mobile Alerts",
  "E-Commerce Recommendation System for Camarines Sur Crafts",
  "RFID-Based Library Management System for Goa Campus",
  "Realtime Landslide Warning System with Sensor Node Network",
  "Partido State University Virtual Classroom Platform",
  "Flood Level Detection and Alert System for Goa Bicol River",
  "Web-Based Academic Thesis Repository with NLP Searching",
  "Automated Grade Management and Evaluation System for CECS",
  "Faculty Workload Optimization and Allocation System",
  "Online Document Approval and Verification Engine for ParSU",
  "Mobile Tourism Guide App for Camarines Sur Landmarks",
  "Smart Parking Space Locator and Reservation System",
  "IoT-Based Water Quality Monitoring for local Aqua Farms",
  "Decentralized Voting System using Blockchain for student elections",
  "Psychological Counseling Chatbot and Assessment App",
  "Partido State University Alumni Tracking and Directory Portal",
  "Automatic Class Schedule Scheduler using Genetic Algorithms",
  "Mobile Crop Disease Detection App using Image Processing"
];

function generateMockPDFBytes(title: string): Buffer {
  const doc = new jsPDF();
  
  // Title Page
  doc.setFontSize(20);
  doc.text("Partido State University", 105, 50, { align: "center" });
  doc.setFontSize(14);
  doc.text("Goa Campus", 105, 60, { align: "center" });
  
  doc.setFontSize(16);
  doc.text(title, 105, 100, { align: "center" });
  doc.setFontSize(12);
  doc.text("A Capstone Research Paper", 105, 120, { align: "center" });
  
  // Abstract
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Abstract", 20, 20);
  doc.setFontSize(10);
  doc.text(
    `This research presents an innovative development of "${title}" specifically customized for the academic workflows at Partido State University. By utilizing state-of-the-art frameworks, the system aims to improve transparency, reduce document processing times, and offer dynamic data tracking for Goa campus colleges. Initial testing indicates high reliability and strong student adoption rates.`,
    20,
    30,
    { maxWidth: 170 }
  );

  // Chapter 1: Introduction
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Chapter 1: Introduction & Objectives", 20, 20);
  doc.setFontSize(10);
  doc.text(
    "In modern educational institutions, manual tracking of workflows presents significant administrative bottlenecks. This project addresses these constraints by deploying a paperless review and observation platform. The primary objective is to build a reliable web platform, while secondary objectives focus on RLS security checks and real-time syncing.",
    20,
    30,
    { maxWidth: 170 }
  );

  // Chapter 2: Methodology
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Chapter 2: System Architecture & Methodology", 20, 20);
  doc.setFontSize(10);
  doc.text(
    "The development lifecycle follows the Agile Scrum methodology, consisting of bi-weekly sprint rotations. The system architecture utilizes Next.js on the frontend, combined with Supabase PostgreSQL RLS policies on the database backend. Real-time updates are synchronized via channels.",
    20,
    30,
    { maxWidth: 170 }
  );

  const pdfBytes = doc.output("arraybuffer");
  return Buffer.from(pdfBytes);
}

export async function runDemoSeeder() {
  console.log("Starting Demo Dataset Seeder...");

  // 1. Clean existing test data matching @parsu.edu.ph
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.email?.endsWith("@parsu.edu.ph")) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
      }
    }
  }

  // Double check that profiles matching @parsu.edu.ph are cleaned
  await supabaseAdmin.from("profiles").delete().like("email", "%@parsu.edu.ph");

  // Fetch lookups
  const { data: campus } = await supabaseAdmin.from("campuses").select("id").limit(1).single();
  const { data: dept } = await supabaseAdmin.from("departments").select("id").limit(1).single();
  const { data: roles } = await supabaseAdmin.from("roles").select("id, code");
  const { data: stages } = await supabaseAdmin.from("defense_stages").select("id, name").order("sequence_order");

  if (!campus || !dept || !roles || !stages || stages.length === 0) {
    throw new Error("Missing initial schema setup (campuses, departments, roles, defense_stages). Please seed schema first.");
  }

  const campusId = campus.id;
  const departmentId = dept.id;

  const roleMap = new Map<string, string>();
  roles.forEach((r: any) => roleMap.set(r.code, r.id));

  // Seed Users: 5 System Admins, 5 Coordinators, 10 Advisers, 10 Panelists, 20 Students
  const admins: any[] = [];
  const coordinators: any[] = [];
  const advisers: any[] = [];
  const panelists: any[] = [];
  const students: any[] = [];

  const createUser = async (email: string, roleCode: string, firstName: string, lastName: string) => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        role: roleCode,
        first_name: firstName,
        last_name: lastName,
        campus_id: campusId,
        college_id: "10000000-0000-0000-0000-000000000003", // CECS
        department_id: departmentId
      }
    });

    if (error || !data.user) {
      throw new Error(`Failed to create user ${email}: ${error?.message}`);
    }
    
    // Explicit profile insert to override status to 'approved'
    const profileId = data.user.id;
    await supabaseAdmin
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", profileId);

    // Assign student table record if student
    if (roleCode === "student") {
      const { data: std } = await supabaseAdmin
        .from("students")
        .insert({
          profile_id: profileId,
          student_number: "2026-" + Math.floor(1000 + Math.random() * 9000),
          program: "BSIT",
          year_level: 4
        })
        .select()
        .single();
      return { id: profileId, studentId: std?.id, firstName, lastName, email };
    }

    return { id: profileId, firstName, lastName, email };
  };

  // Seeding System Admins
  for (let i = 1; i <= 5; i++) {
    const user = await createUser(`admin${i}@parsu.edu.ph`, "sys_admin", "Admin", `Staff ${i}`);
    admins.push(user);
  }

  // Seeding Coordinators
  for (let i = 1; i <= 5; i++) {
    const user = await createUser(`coordinator${i}@parsu.edu.ph`, "coordinator", "Coordinator", `Staff ${i}`);
    coordinators.push(user);
  }

  // Seeding Advisers
  for (let i = 1; i <= 10; i++) {
    const user = await createUser(`adviser${i}@parsu.edu.ph`, "adviser", "Dr. Adviser", `Professor ${i}`);
    advisers.push(user);
  }

  // Seeding Panelists
  for (let i = 1; i <= 10; i++) {
    const user = await createUser(`panelist${i}@parsu.edu.ph`, "panelist", "Prof. Panelist", `Evaluator ${i}`);
    panelists.push(user);
  }

  // Seeding Students
  for (let i = 1; i <= 20; i++) {
    const user = await createUser(`student${i}@parsu.edu.ph`, "student", "Student", `Researcher ${i}`);
    students.push(user);
  }

  console.log("Users seeding complete. Starting Projects & Documents seeding...");

  // Create projects for all 20 students
  for (let i = 0; i < 20; i++) {
    const student = students[i];
    const adviser = advisers[i % advisers.length];
    const title = PROJECT_TITLES[i];
    const stage = stages[i % stages.length];

    const { data: project, error: projErr } = await supabaseAdmin
      .from("projects")
      .insert({
        campus_id: campusId,
        department_id: departmentId,
        student_id: student.studentId,
        title,
        status: "in_progress",
        current_stage_id: stage.id,
        academic_year: "2025-2026",
        semester: "2nd Semester",
        system_completion_pct: (i + 1) * 5,
        workflow_template_id: "70000000-0000-0000-0000-000000000001" // BSIT
      })
      .select()
      .single();

    if (projErr || !project) {
      console.error("Error creating project:", projErr);
      continue;
    }

    // Link adviser as project member
    await supabaseAdmin.from("project_members").insert({
      project_id: project.id,
      profile_id: adviser.id,
      member_role: "adviser"
    });

    // Create manuscript document & version
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .insert({
        project_id: project.id,
        stage_id: stage.id,
        title: `${title} - Draft Manuscript`,
        status: "active"
      })
      .select()
      .single();

    if (doc) {
      const pdfBytes = generateMockPDFBytes(title);
      const storagePath = `${project.id}/${doc.id}_v1.pdf`;

      // Upload mock PDF to private bucket
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("manuscripts")
        .upload(storagePath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true
        });

      if (!uploadErr) {
        // Insert document version
        const { data: ver } = await supabaseAdmin
          .from("document_versions")
          .insert({
            document_id: doc.id,
            version_number: 1,
            file_name: `${title}_manuscript_v1.pdf`,
            storage_path: storagePath,
            is_current: true
          })
          .select()
          .single();

        // Seed some Annotations if version created
        if (ver) {
          await supabaseAdmin.from("annotations").insert([
            {
              document_version_id: ver.id,
              page_number: 2,
              comment: "Check the problem description in the abstract.",
              status: "open",
              created_by: adviser.id
            },
            {
              document_version_id: ver.id,
              page_number: 3,
              comment: "Add more citations to the methodology chapter.",
              status: "open",
              created_by: panelists[0].id
            }
          ]);
        }
      }
    }

    // Seed defense schedule for this project
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + (i - 10)); // spread dates
    const endDate = new Date(scheduleDate.getTime() + 60 * 60 * 1000);

    const { data: sched } = await supabaseAdmin
      .from("defense_schedules")
      .insert({
        project_id: project.id,
        stage_id: stage.id,
        scheduled_at: scheduleDate.toISOString(),
        end_at: endDate.toISOString(),
        room: `Room ${200 + i}`,
        building: "Goa Computational Building",
        is_online: false,
        duration_minutes: 60,
        status: i % 2 === 0 ? "scheduled" : "completed",
        created_by: coordinators[0].id
      })
      .select()
      .single();

    // Assign 3 panelists for this stage
    const p1 = panelists[i % panelists.length];
    const p2 = panelists[(i + 1) % panelists.length];
    const p3 = panelists[(i + 2) % panelists.length];

    await supabaseAdmin.from("defense_panels").insert([
      { project_id: project.id, stage_id: stage.id, profile_id: p1.id, panel_role: "chair", assigned_by: coordinators[0].id },
      { project_id: project.id, stage_id: stage.id, profile_id: p2.id, panel_role: "member", assigned_by: coordinators[0].id },
      { project_id: project.id, stage_id: stage.id, profile_id: p3.id, panel_role: "member", assigned_by: coordinators[0].id }
    ]);

    // Create rubric template
    const { data: rubric } = await supabaseAdmin
      .from("rubric_templates")
      .insert({
        project_id: project.id,
        title: `Rubric Template - ${title}`,
        criteria: [
          { name: "Significance & Objectives", weight: 30 },
          { name: "Technical Feasibility", weight: 40 },
          { name: "Presentation Quality", weight: 30 }
        ],
        passing_score: 75.00,
        excellent_score: 85.00,
        is_published: true,
        is_active: true
      })
      .select()
      .single();

    // If defense is completed, submit evaluations
    if (sched && sched.status === "completed" && rubric) {
      // Panelist 1 evaluation
      await supabaseAdmin.from("evaluations").insert({
        project_id: project.id,
        stage_id: stage.id,
        panelist_id: p1.id,
        rubric_template_id: rubric.id,
        scores: { "Significance & Objectives": 80, "Technical Feasibility": 85, "Presentation Quality": 90 },
        total_score: 84.50,
        verdict_code: "passed",
        status: "submitted",
        signed_at: new Date().toISOString(),
        certificate_serial: `AURORA-CERT-${100000 + i}`
      });
    }
  }

  console.log("Demo Dataset Seeding Finished Successfully!");
}
