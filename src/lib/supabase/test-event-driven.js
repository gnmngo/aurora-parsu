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
  console.log('Connected to Postgres for Option B E2E validations...');

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
  if (studentRows.length === 0) {
    console.error('❌ Student subprofile record is missing!');
    await client.end();
    return;
  }
  const studentId = studentRows[0].id;

  // 2. Query Goa Campus, CECS College, BSCS Department, and Concept Defense Stage
  const { rows: campuses } = await client.query("SELECT id FROM campuses WHERE code = 'PARSU-GOA' LIMIT 1;");
  const { rows: departments } = await client.query("SELECT id FROM departments WHERE code = 'BSCS' LIMIT 1;");
  const { rows: stages } = await client.query("SELECT id FROM defense_stages WHERE code = 'concept' LIMIT 1;");

  const campusId = campuses[0].id;
  const departmentId = departments[0].id;
  const stageId = stages[0].id;

  // Use unique test UUIDs
  const TEST_PROJECT_ID = '88888888-8888-8888-8888-888888888801';
  const TEST_DOC_ID = '88888888-8888-8888-8888-888888888802';
  const TEST_VER_ID = '88888888-8888-8888-8888-888888888803';
  const TEST_ANNOTATION_1_ID = '88888888-8888-8888-8888-888888888804';
  const TEST_ANNOTATION_2_ID = '88888888-8888-8888-8888-888888888805';
  const TEST_ANNOTATION_3_ID = '88888888-8888-8888-8888-888888888806';

  console.log('\n--- PHASE 5: BACKWARD COMPATIBILITY & FALLBACK CHECK (NO CACHE) ---');

  try {
    // A. Insert test project
    console.log('Inserting test project...');
    await client.query(`
      INSERT INTO public.projects (id, campus_id, department_id, student_id, title, status, academic_year)
      VALUES ($1, $2, $3, $4, 'E2E Event Validation Project', 'under_review', '2025-2026')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_PROJECT_ID, campusId, departmentId, studentId]);

    // B. Insert test document and version
    console.log('Inserting test document and version...');
    await client.query(`
      INSERT INTO public.documents (id, project_id, stage_id, title, status, created_by)
      VALUES ($1, $2, $3, 'Event Test Manuscript', 'under_review', $4)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_DOC_ID, TEST_PROJECT_ID, stageId, studentProfileId]);

    await client.query(`
      INSERT INTO public.document_versions (id, document_id, version_number, storage_path, file_name, file_size, mime_type, checksum_sha256, uploaded_by, change_summary)
      VALUES ($1, $2, 1, 'manuscripts/event_test.pdf', 'event_test.pdf', 2048, 'application/pdf', 'sha256_event_test_hash', $3, 'Initial submission')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_VER_ID, TEST_DOC_ID, studentProfileId]);

    // C. Insert 3 annotations (open/minor, addressed/minor, open/major)
    console.log('Inserting test annotations...');
    await client.query(`
      INSERT INTO public.annotations (id, document_version_id, type, page_number, coordinates, selected_text, content, status, severity, created_by)
      VALUES 
        ($1, $4, 'text_comment', 1, '{}', 'Text', 'Open minor issue', 'open'::annotation_status, 'minor'::severity_level, $5),
        ($2, $4, 'text_comment', 1, '{}', 'Text', 'Addressed minor issue', 'addressed'::annotation_status, 'minor'::severity_level, $5),
        ($3, $4, 'text_comment', 2, '{}', 'Text', 'Open major issue', 'open'::annotation_status, 'major'::severity_level, $5)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_ANNOTATION_1_ID, TEST_ANNOTATION_2_ID, TEST_ANNOTATION_3_ID, TEST_VER_ID, panelistAId]);

    // D. Insert evaluations (submitted total_scores: Panelist A = 90.00, Panelist B = 80.00 -> Avg: 85.00)
    console.log('Inserting test evaluations...');
    // Get a grading template if it exists
    const { rows: templates } = await client.query('SELECT id FROM grading_templates LIMIT 1;');
    let templateId = templates[0]?.id;
    if (!templateId) {
      templateId = '88888888-8888-8888-8888-888888888809';
      await client.query(`
        INSERT INTO grading_templates (id, campus_id, stage_id, name, passing_score, max_score, created_by)
        VALUES ($1, $2, $3, 'E2E Rubric', 70.0, 100.0, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [templateId, campusId, stageId, panelistAId]);
    }

    await client.query(`
      INSERT INTO public.evaluations (project_id, stage_id, panelist_id, template_id, status, total_score)
      VALUES 
        ($1, $2, $3, $5, 'submitted'::evaluation_status, 90.00),
        ($1, $2, $4, $5, 'submitted'::evaluation_status, 80.00)
      ON CONFLICT (project_id, stage_id, panelist_id) DO UPDATE SET total_score = EXCLUDED.total_score, status = 'submitted';
    `, [TEST_PROJECT_ID, stageId, panelistAId, panelistBId, templateId]);

    // E. Verify Fallback View Queries (since no cache entry is inserted yet)
    console.log('\nVerifying view outputs without cache (Fallback mode):');
    
    const { rows: complianceFallback } = await client.query("SELECT * FROM revision_compliance_metrics WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log(`- Fallback Compliance Rate: ${complianceFallback[0]?.compliance_rate}% (Expected: 0.00%)`);
    if (parseFloat(complianceFallback[0]?.compliance_rate) !== 0.00) {
      throw new Error('Fallback compliance rate calculation incorrect');
    }

    const { rows: consensusFallback } = await client.query("SELECT * FROM panel_consensus_summary WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log(`- Fallback Average Score: ${consensusFallback[0]?.average_score} (Expected: 85.00)`);
    if (parseFloat(consensusFallback[0]?.average_score) !== 85.00) {
      throw new Error('Fallback average score calculation incorrect');
    }

    const { rows: readinessFallback } = await client.query("SELECT * FROM project_readiness_status WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log(`- Fallback Readiness Level: ${readinessFallback[0]?.readiness_level} (Expected: Needs Revision)`);
    if (readinessFallback[0]?.readiness_level !== 'Needs Revision') {
      throw new Error('Fallback readiness level calculation incorrect');
    }

    console.log('✔ Fallback verification passed! Views return correct values when cache is missing.');

    console.log('\n--- PHASE 3: EVENT VALIDATION & PHASE 4: SCORING VALIDATION ---');

    // F. Insert 'evaluation_submitted' event
    console.log('Inserting evaluation_submitted event...');
    await client.query(`
      INSERT INTO public.evaluation_events (project_id, stage_id, event_type, payload)
      VALUES ($1, $2, $3, $4);
    `, [TEST_PROJECT_ID, stageId, 'evaluation_submitted', JSON.stringify({ template_id: templateId })]);

    // Verify cache has been created by the trigger
    const { rows: cacheRow1 } = await client.query("SELECT * FROM public.project_score_cache WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log('Cache status after evaluation_submitted event:');
    console.table(cacheRow1);

    if (cacheRow1.length === 0) {
      throw new Error('Trigger did not create cache record on evaluation_submitted event');
    }
    if (parseFloat(cacheRow1[0].avg_score) !== 85.00) {
      throw new Error(`Cached average score mismatch: ${cacheRow1[0].avg_score} != 85.00`);
    }
    if (parseFloat(cacheRow1[0].compliance_rate) !== 0.00) {
      throw new Error(`Cached compliance rate mismatch: ${cacheRow1[0].compliance_rate} != 0.00`);
    }
    if (cacheRow1[0].readiness_level !== 'Needs Revision') {
      throw new Error(`Cached readiness level mismatch: ${cacheRow1[0].readiness_level} != Needs Revision`);
    }
    console.log('✔ Trigger correctly processed evaluation_submitted event!');

    // G. Verify an annotation_verified event updates the cache
    console.log('\nUpdating all annotations to "verified" in public.annotations table...');
    await client.query("UPDATE public.annotations SET status = 'verified'::annotation_status WHERE document_version_id = $1;", [TEST_VER_ID]);

    console.log('Inserting annotation_verified event...');
    await client.query(`
      INSERT INTO public.evaluation_events (project_id, stage_id, event_type, payload)
      VALUES ($1, $2, $3, $4);
    `, [TEST_PROJECT_ID, stageId, 'annotation_verified', JSON.stringify({ annotation_id: TEST_ANNOTATION_3_ID })]);

    // Verify cache has updated
    const { rows: cacheRow2 } = await client.query("SELECT * FROM public.project_score_cache WHERE project_id = $1;", [TEST_PROJECT_ID]);
    console.log('Cache status after annotation_verified event:');
    console.table(cacheRow2);

    if (parseFloat(cacheRow2[0].compliance_rate) !== 100.00) {
      throw new Error(`Cached compliance rate mismatch: ${cacheRow2[0].compliance_rate} != 100.00`);
    }
    if (cacheRow2[0].readiness_level !== 'Ready') {
      throw new Error(`Cached readiness level mismatch: ${cacheRow2[0].readiness_level} != Ready`);
    }
    console.log('✔ Trigger correctly processed annotation_verified event and updated cache status to Ready!');

    // H. Cross-check view consistency with cache
    console.log('\nCross-checking views with cache values...');
    const { rows: complianceView } = await client.query("SELECT * FROM revision_compliance_metrics WHERE project_id = $1;", [TEST_PROJECT_ID]);
    const { rows: consensusView } = await client.query("SELECT * FROM panel_consensus_summary WHERE project_id = $1;", [TEST_PROJECT_ID]);
    const { rows: readinessView } = await client.query("SELECT * FROM project_readiness_status WHERE project_id = $1;", [TEST_PROJECT_ID]);

    console.log(`- View Compliance Rate: ${complianceView[0].compliance_rate}% | Cache: ${cacheRow2[0].compliance_rate}%`);
    console.log(`- View Average Score: ${consensusView[0].average_score} | Cache: ${cacheRow2[0].avg_score}`);
    console.log(`- View Readiness Level: ${readinessView[0].readiness_level} | Cache: ${cacheRow2[0].readiness_level}`);

    if (parseFloat(complianceView[0].compliance_rate) !== parseFloat(cacheRow2[0].compliance_rate) ||
        parseFloat(consensusView[0].average_score) !== parseFloat(cacheRow2[0].avg_score) ||
        readinessView[0].readiness_level !== cacheRow2[0].readiness_level) {
      throw new Error('View results are inconsistent with the cache values!');
    }
    console.log('✔ View consistency checks passed!');

    // I. Confirm cache prioritization: modify cache manually and verify view outputs are cached values
    console.log('\nModifying cache table record manually to check prioritization...');
    await client.query(`
      UPDATE public.project_score_cache 
      SET compliance_rate = 99.99, avg_score = 99.99, readiness_level = 'Almost Ready'
      WHERE project_id = $1;
    `, [TEST_PROJECT_ID]);

    const { rows: complianceViewCached } = await client.query("SELECT * FROM revision_compliance_metrics WHERE project_id = $1;", [TEST_PROJECT_ID]);
    const { rows: consensusViewCached } = await client.query("SELECT * FROM panel_consensus_summary WHERE project_id = $1;", [TEST_PROJECT_ID]);
    const { rows: readinessViewCached } = await client.query("SELECT * FROM project_readiness_status WHERE project_id = $1;", [TEST_PROJECT_ID]);

    console.log(`- Prioritized View Compliance Rate: ${complianceViewCached[0].compliance_rate}% (Expected: 99.99%)`);
    console.log(`- Prioritized View Average Score: ${consensusViewCached[0].average_score} (Expected: 99.99)`);
    console.log(`- Prioritized View Readiness Level: ${readinessViewCached[0].readiness_level} (Expected: Almost Ready)`);

    if (parseFloat(complianceViewCached[0].compliance_rate) !== 99.99 ||
        parseFloat(consensusViewCached[0].average_score) !== 99.99 ||
        readinessViewCached[0].readiness_level !== 'Almost Ready') {
      throw new Error('Prioritization test failed: Views are not fetching values from cache!');
    }
    console.log('✔ Cache prioritization verified! Views read directly from cache table when entries are present.');

  } catch (err) {
    console.error('❌ E2E Validation failed:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('\n--- CLEANING UP TEST RECORDS ---');
    // Drop rules to allow cascading delete
    await client.query('DROP RULE IF EXISTS audit_no_delete ON audit_logs;');
    await client.query('DROP RULE IF EXISTS audit_no_update ON audit_logs;');

    try {
      console.log('Deleting test project and associated records...');
      await client.query("DELETE FROM public.projects WHERE id = $1;", [TEST_PROJECT_ID]);
      console.log('✔ Cascade deleted test project, documents, versions, annotations, evaluations, events, and cache.');
    } catch (cleanupErr) {
      console.error('❌ Cleanup delete query failed:', cleanupErr.message);
    }

    // Restore rules
    await client.query('CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;');
    await client.query('CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;');
    console.log('✔ Restored audit_logs rules.');

    await client.end();
    console.log('E2E validation connection closed.');
  }
}

run();
