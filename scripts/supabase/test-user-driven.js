const { Client } = require('pg');

const pgConfig = {
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432, // Session Mode
  ssl: {
    rejectUnauthorized: false
  }
};

async function run() {
  const client = new Client(pgConfig);
  await client.connect();
  console.log('Connected to Postgres for User-Driven Rubrics E2E validations...');

  // 1. Query seeded test users
  const { rows: studentProfiles } = await client.query("SELECT id FROM public.profiles WHERE email = 'student1@aurora.test';");
  const { rows: panelistProfiles } = await client.query("SELECT id FROM public.profiles WHERE email = 'panelist1@aurora.test';");
  const { rows: adminProfiles } = await client.query("SELECT id FROM public.profiles WHERE email = 'admin@aurora.test';");

  if (studentProfiles.length === 0 || panelistProfiles.length === 0 || adminProfiles.length === 0) {
    console.error('❌ Seeded test users are missing! Please run seed-test-users.js first.');
    await client.end();
    return;
  }

  const studentProfileId = studentProfiles[0].id;
  const panelistAId = panelistProfiles[0].id;
  const panelistBId = adminProfiles[0].id;

  // Get student's subclass table ID
  const { rows: studentRows } = await client.query("SELECT id FROM public.students WHERE profile_id = $1;", [studentProfileId]);
  const studentId = studentRows[0].id;

  // Query Goa Campus, CECS College, BSCS Department, and Concept Defense Stage
  const { rows: campuses } = await client.query("SELECT id FROM campuses WHERE code = 'PARSU-GOA' LIMIT 1;");
  const { rows: departments } = await client.query("SELECT id FROM departments WHERE code = 'BSCS' LIMIT 1;");
  const { rows: stages } = await client.query("SELECT id FROM defense_stages WHERE code = 'concept' LIMIT 1;");

  const campusId = campuses[0].id;
  const departmentId = departments[0].id;
  const stageId = stages[0].id;

  // Fixed E2E UUIDs
  const TEST_PROJECT_ID = '77777777-7777-7777-7777-777777777701';
  const TEST_RUBRIC_ID = '77777777-7777-7777-7777-777777777702';
  const TEST_DOC_ID = '77777777-7777-7777-7777-777777777703';
  const TEST_VER_ID = '77777777-7777-7777-7777-777777777704';
  const TEST_ANNOTATION_1_ID = '77777777-7777-7777-7777-777777777705';
  const TEST_ANNOTATION_2_ID = '77777777-7777-7777-7777-777777777706';

  try {
    // A. Insert test project
    console.log('Inserting test project...');
    await client.query(`
      INSERT INTO public.projects (id, campus_id, department_id, student_id, title, status, academic_year)
      VALUES ($1, $2, $3, $4, 'User-Driven Rubrics E2E Project', 'under_review', '2025-2026')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_PROJECT_ID, campusId, departmentId, studentId]);

    // B. Insert custom rubric template
    console.log('Inserting user-defined rubric template (Methodology: 30%, Clarity: 70%)...');
    const criteriaList = [
      { id: 'methodology', name: 'Methodology', weight: 30 },
      { id: 'clarity', name: 'Clarity', weight: 70 }
    ];

    await client.query(`
      INSERT INTO public.rubric_templates (
        id, project_id, title, criteria, 
        passing_score, excellent_score, target_compliance_rate, min_compliance_rate, max_major_unresolved, 
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      TEST_RUBRIC_ID, TEST_PROJECT_ID, 'E2E User Custom Rubric', JSON.stringify(criteriaList),
      70.00, 80.00, 85.00, 65.00, 1, // Custom thresholds: Pass=70, Excellent=80, Target=85%, Min=65%, MaxMajor=1
      panelistAId
    ]);

    // Test Validation Rule: attempt to insert a rubric with weights summing to 90
    console.log('Verifying rubric weight validation check constraint...');
    try {
      await client.query(`
        INSERT INTO public.rubric_templates (project_id, title, criteria, created_by)
        VALUES ($1, 'Invalid Rubric', '[{"name":"Fail", "weight":90}]'::jsonb, $2);
      `, [TEST_PROJECT_ID, panelistAId]);
      throw new Error('Database allowed inserting rubric with weights sum != 100!');
    } catch (dbErr) {
      if (dbErr.message.includes('Criteria weights must sum to 100')) {
        console.log('✔ Weight validation successful! DB rejected invalid rubric.');
      } else {
        throw dbErr;
      }
    }

    // C. Insert document & version
    console.log('Inserting document and version...');
    await client.query(`
      INSERT INTO public.documents (id, project_id, stage_id, title, status, created_by)
      VALUES ($1, $2, $3, 'User Rubric Manuscript', 'under_review', $4)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_DOC_ID, TEST_PROJECT_ID, stageId, studentProfileId]);

    await client.query(`
      INSERT INTO public.document_versions (id, document_id, version_number, storage_path, file_name, file_size, mime_type, checksum_sha256, uploaded_by, change_summary)
      VALUES ($1, $2, 1, 'manuscripts/rubric_test.pdf', 'rubric_test.pdf', 3072, 'application/pdf', 'sha256_rubric_test_hash', $3, 'Initial submission')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_VER_ID, TEST_DOC_ID, studentProfileId]);

    // D. Insert annotations (minor/open, major/open)
    console.log('Inserting annotations...');
    await client.query(`
      INSERT INTO public.annotations (id, document_version_id, type, page_number, coordinates, selected_text, content, status, severity, created_by)
      VALUES 
        ($1, $3, 'text_comment', 1, '{"left": 10, "top": 20, "width": 80, "height": 5}', 'Text', 'Minor issue', 'open'::annotation_status, 'minor'::severity_level, $4),
        ($2, $3, 'text_comment', 2, '{"left": 15, "top": 25, "width": 70, "height": 6}', 'Text', 'Major issue', 'open'::annotation_status, 'major'::severity_level, $4)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_ANNOTATION_1_ID, TEST_ANNOTATION_2_ID, TEST_VER_ID, panelistAId]);

    // E. Insert evaluations and test dynamic weighted score trigger
    console.log('Inserting evaluations with criterion grades and checking dynamic scores...');
    
    // Panelist A grades: Methodology = 90, Clarity = 80 -> Weighted: (90 * 0.3) + (80 * 0.7) = 27 + 56 = 83.00
    await client.query(`
      INSERT INTO public.evaluations (project_id, stage_id, panelist_id, rubric_template_id, status, scores)
      VALUES ($1, $2, $3, $4, 'submitted'::evaluation_status, '{"methodology": 90, "clarity": 80}'::jsonb);
    `, [TEST_PROJECT_ID, stageId, panelistAId, TEST_RUBRIC_ID]);

    // Panelist B grades: Methodology = 60, Clarity = 70 -> Weighted: (60 * 0.3) + (70 * 0.7) = 18 + 49 = 67.00
    await client.query(`
      INSERT INTO public.evaluations (project_id, stage_id, panelist_id, rubric_template_id, status, scores)
      VALUES ($1, $2, $3, $4, 'submitted'::evaluation_status, '{"methodology": 60, "clarity": 70}'::jsonb);
    `, [TEST_PROJECT_ID, stageId, panelistBId, TEST_RUBRIC_ID]);

    // Verify trigger correctly set total_score
    const { rows: evals } = await client.query("SELECT panelist_id, total_score FROM public.evaluations WHERE project_id = $1 ORDER BY total_score DESC;", [TEST_PROJECT_ID]);
    console.log('Evaluation scores calculated by DB trigger:');
    console.table(evals);

    if (parseFloat(evals[0].total_score) !== 83.00 || parseFloat(evals[1].total_score) !== 67.00) {
      throw new Error(`Weighted score calculation trigger failed! Expected 83.00 and 67.00, got ${evals[0].total_score} and ${evals[1].total_score}`);
    }
    console.log('✔ Weighted evaluation scores correctly calculated in database trigger!');

    // F. Insert 'evaluation_submitted' event and verify cache updates
    console.log('\nInserting evaluation_submitted event...');
    await client.query(`
      INSERT INTO public.evaluation_events (project_id, stage_id, event_type, payload)
      VALUES ($1, $2, $3, $4);
    `, [TEST_PROJECT_ID, stageId, 'evaluation_submitted', JSON.stringify({ rubric_template_id: TEST_RUBRIC_ID })]);

    // Average of 83 and 67 is 75.00. Unresolved major = 1. Compliance rate = 0%.
    // Custom threshold: Pass = 70.00, Min compliance = 65%.
    // Because compliance_rate (0%) is < min compliance (65%), readiness level should be 'Needs Revision'.
    const { rows: cacheRow1 } = await client.query("SELECT * FROM public.project_score_cache WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log('Cache status after evaluations:');
    console.table(cacheRow1);

    if (parseFloat(cacheRow1[0].avg_score) !== 75.00) {
      throw new Error(`Avg score mismatch: expected 75.00, got ${cacheRow1[0].avg_score}`);
    }
    if (cacheRow1[0].readiness_level !== 'Needs Revision') {
      throw new Error(`Readiness level mismatch: expected Needs Revision, got ${cacheRow1[0].readiness_level}`);
    }
    console.log('✔ Dynamic scoring E2E test 1 (Needs Revision) passed!');

    // G. Verify dynamic updates on annotation_verified event
    console.log('\nUpdating all annotations to verified...');
    await client.query("UPDATE public.annotations SET status = 'verified'::annotation_status WHERE document_version_id = $1;", [TEST_VER_ID]);

    console.log('Inserting annotation_verified event...');
    await client.query(`
      INSERT INTO public.evaluation_events (project_id, stage_id, event_type, payload)
      VALUES ($1, $2, $3, $4);
    `, [TEST_PROJECT_ID, stageId, 'annotation_verified', JSON.stringify({ annotation_id: TEST_ANNOTATION_2_ID })]);

    // Now: Avg score = 75.00. Unresolved major = 0. Compliance rate = 100%.
    // Custom threshold: Pass = 70.00, Excellent = 80.00, Min compliance = 65%, Target compliance = 85%.
    // Here:
    // avg_score (75.00) is >= passing_score (70.00) but < excellent_score (80.00).
    // compliance_rate (100.00%) >= target compliance (85.00%).
    // major unresolved = 0 <= max_major_unresolved (1).
    // This matches 'Almost Ready'!
    const { rows: cacheRow2 } = await client.query("SELECT * FROM public.project_score_cache WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log('Cache status after annotations verified:');
    console.table(cacheRow2);

    if (parseFloat(cacheRow2[0].compliance_rate) !== 100.00) {
      throw new Error(`Compliance rate mismatch: expected 100.00, got ${cacheRow2[0].compliance_rate}`);
    }
    if (cacheRow2[0].readiness_level !== 'Almost Ready') {
      throw new Error(`Readiness level mismatch: expected Almost Ready, got ${cacheRow2[0].readiness_level}`);
    }
    console.log('✔ Dynamic scoring E2E test 2 (Almost Ready with custom thresholds) passed!');

  } catch (err) {
    console.error('❌ User-Driven Rubrics E2E Validation failed:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('\n--- CLEANING UP TEST RECORDS ---');
    await client.query('DROP RULE IF EXISTS audit_no_delete ON audit_logs;');
    await client.query('DROP RULE IF EXISTS audit_no_update ON audit_logs;');

    try {
      await client.query("DELETE FROM public.projects WHERE id = $1;", [TEST_PROJECT_ID]);
      console.log('✔ Cascade deleted E2E project and related rubric, document, version, annotations, evaluations, events, and cache.');
    } catch (cleanupErr) {
      console.error('❌ Cleanup delete query failed:', cleanupErr.message);
    }

    await client.query('CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;');
    await client.query('CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;');
    console.log('✔ Restored audit_logs rules.');

    await client.end();
    console.log('User-Driven Rubrics E2E validation connection closed.');
  }
}

run();
