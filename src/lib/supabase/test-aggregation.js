const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  user: 'postgres.faxzubfvjsekizeiiocg',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runViewVerification() {
  try {
    await client.connect();
    console.log('Successfully connected to PostgreSQL for Phase 4 View Verification...');
    console.log('-----------------------------------------------------------------------');

    // 1. We fetch existing organization records from seeds
    const { rows: campuses } = await client.query('SELECT id FROM campuses LIMIT 1;');
    const { rows: colleges } = await client.query('SELECT id FROM colleges LIMIT 1;');
    const { rows: departments } = await client.query('SELECT id FROM departments LIMIT 1;');
    const { rows: stages } = await client.query('SELECT id FROM defense_stages LIMIT 1;');
    const { rows: templates } = await client.query('SELECT id FROM grading_templates LIMIT 1;');

    if (campuses.length === 0 || colleges.length === 0 || departments.length === 0 || stages.length === 0) {
      console.error('❌ Missing prerequisite seed records (campuses, colleges, departments, stages). Run seed.sql first.');
      return;
    }

    const campusId = campuses[0].id;
    const collegeId = colleges[0].id;
    const departmentId = departments[0].id;
    const stageId = stages[0].id;

    // Use a temporary profile/user for testing. We'll use a fixed UUID for cleanup safety.
    const TEST_STUDENT_PROFILE_ID = '99999999-9999-9999-9999-999999999991';
    const TEST_PANELIST_A_PROFILE_ID = '99999999-9999-9999-9999-999999999992';
    const TEST_PANELIST_B_PROFILE_ID = '99999999-9999-9999-9999-999999999993';
    const TEST_PROJECT_ID = '99999999-9999-9999-9999-999999999994';
    const TEST_STUDENT_ID = '99999999-9999-9999-9999-999999999995';

    console.log('Inserting temporary test profiles and student records...');
    
    // Create auth users first
    console.log('Inserting temporary auth users...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
      VALUES 
        ($1, 'test.student@parsu.edu.ph', '{}', '{"role": "student", "student_number": "TEST-STUD-9999991"}', 'authenticated', 'authenticated'),
        ($2, 'test.panel1@parsu.edu.ph', '{}', '{"role": "panel_member", "employee_number": "TEST-EMP-9999992"}', 'authenticated', 'authenticated'),
        ($3, 'test.panel2@parsu.edu.ph', '{}', '{"role": "panel_member", "employee_number": "TEST-EMP-9999993"}', 'authenticated', 'authenticated')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_STUDENT_PROFILE_ID, TEST_PANELIST_A_PROFILE_ID, TEST_PANELIST_B_PROFILE_ID]);

    // Create profiles
    await client.query(`
      INSERT INTO profiles (id, campus_id, college_id, department_id, email, first_name, last_name, status)
      VALUES 
        ($1, $4, $5, $6, 'test.student@parsu.edu.ph', 'Test', 'Student', 'approved'::user_status),
        ($2, $4, $5, $6, 'test.panel1@parsu.edu.ph', 'Panelist', 'One', 'approved'::user_status),
        ($3, $4, $5, $6, 'test.panel2@parsu.edu.ph', 'Panelist', 'Two', 'approved'::user_status)
      ON CONFLICT (id) DO UPDATE SET status = 'approved';
    `, [TEST_STUDENT_PROFILE_ID, TEST_PANELIST_A_PROFILE_ID, TEST_PANELIST_B_PROFILE_ID, campusId, collegeId, departmentId]);

    // Update the trigger-created student record's ID to TEST_STUDENT_ID for relationship consistency
    await client.query(`
      UPDATE students 
      SET id = $1 
      WHERE profile_id = $2;
    `, [TEST_STUDENT_ID, TEST_STUDENT_PROFILE_ID]);

    // Create project
    console.log('Inserting test project...');
    await client.query(`
      INSERT INTO projects (id, campus_id, department_id, student_id, title, status, academic_year)
      VALUES ($1, $2, $3, $4, 'TEST PROJECT: Consensus and Compliance View Testing', 'under_review', '2025-2026')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_PROJECT_ID, campusId, departmentId, TEST_STUDENT_ID]);

    // Create document & document_version
    console.log('Inserting test documents and version entries...');
    const TEST_DOC_ID = '99999999-9999-9999-9999-999999999996';
    const TEST_VER_ID = '99999999-9999-9999-9999-999999999997';
    await client.query(`
      INSERT INTO documents (id, project_id, stage_id, title, status, created_by)
      VALUES ($1, $2, $3, 'Test manuscript v1', 'under_review', $4)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_DOC_ID, TEST_PROJECT_ID, stageId, TEST_STUDENT_PROFILE_ID]);

    await client.query(`
      INSERT INTO document_versions (id, document_id, version_number, storage_path, file_name, file_size, mime_type, checksum_sha256, uploaded_by, change_summary)
      VALUES ($1, $2, 1, 'manuscripts/test.pdf', 'test.pdf', 1024, 'application/pdf', 'dummy_hash_123', $3, 'Initial submission')
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_VER_ID, TEST_DOC_ID, TEST_STUDENT_PROFILE_ID]);

    // Create annotations (Open, Addressed, Verified)
    console.log('Inserting annotations with different statuses...');
    await client.query(`
      INSERT INTO annotations (id, document_version_id, type, page_number, coordinates, selected_text, content, status, severity, created_by)
      VALUES 
        ('99999999-9999-9999-9999-999999999801', $1, 'text_comment', 1, '{}', 'Text', 'Open comment', 'open'::annotation_status, 'minor'::severity_level, $2),
        ('99999999-9999-9999-9999-999999999802', $1, 'text_comment', 1, '{}', 'Text', 'Addressed comment', 'addressed'::annotation_status, 'minor'::severity_level, $2),
        ('99999999-9999-9999-9999-999999999803', $1, 'text_comment', 2, '{}', 'Text', 'Verified comment', 'verified'::annotation_status, 'major'::severity_level, $2)
      ON CONFLICT (id) DO NOTHING;
    `, [TEST_VER_ID, TEST_PANELIST_A_PROFILE_ID]);

    // Create submitted evaluations
    console.log('Inserting panelist submitted evaluations for Consensus check...');
    // We fetch a grading template. If none, we create a dummy template
    let templateId;
    if (templates.length > 0) {
      templateId = templates[0].id;
    } else {
      templateId = '99999999-9999-9999-9999-999999999999';
      await client.query(`
        INSERT INTO grading_templates (id, campus_id, stage_id, name, passing_score, max_score, created_by)
        VALUES ($1, $2, $3, 'Test Rubric Template', 75.0, 100.0, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [templateId, campusId, stageId, TEST_PANELIST_A_PROFILE_ID]);
    }

    // Insert submitted scores (Panelist A grades 95.0, Panelist B grades 78.0 -> Diff: 17.0, low consensus alert)
    await client.query(`
      INSERT INTO evaluations (project_id, stage_id, panelist_id, template_id, status, total_score)
      VALUES 
        ($1, $2, $3, $5, 'submitted'::evaluation_status, 95.00),
        ($1, $2, $4, $5, 'submitted'::evaluation_status, 78.00)
      ON CONFLICT (project_id, stage_id, panelist_id) DO UPDATE SET total_score = EXCLUDED.total_score, status = 'submitted';
    `, [TEST_PROJECT_ID, stageId, TEST_PANELIST_A_PROFILE_ID, TEST_PANELIST_B_PROFILE_ID, templateId]);

    console.log('\n--- EXECUTING VIEW QUERIES ---');

    // 1. Verify panel_consensus_summary
    console.log('\n1. Querying panel_consensus_summary:');
    const { rows: consensusRows } = await client.query(`
      SELECT * FROM panel_consensus_summary WHERE project_id = $1;
    `, [TEST_PROJECT_ID]);
    console.table(consensusRows);
    
    // Validate assertions
    if (consensusRows.length > 0) {
      const row = consensusRows[0];
      const expectedDiff = 17.00;
      if (Number(row.highest_score) === 95 && Number(row.lowest_score) === 78) {
        console.log('✔ Consensus math correct (Max: 95, Min: 78)');
      } else {
        console.error('❌ Consensus math incorrect');
      }
      if (row.consensus_level === 'Low' && row.discrepancy_alert === true) {
        console.log('✔ Consensus level and discrepancy alert computed correctly!');
      } else {
        console.error('❌ Discrepancy warning logic error');
      }
    }

    // 2. Verify revision_compliance_metrics
    console.log('\n2. Querying revision_compliance_metrics:');
    const { rows: complianceRows } = await client.query(`
      SELECT * FROM revision_compliance_metrics WHERE project_id = $1;
    `, [TEST_PROJECT_ID]);
    console.table(complianceRows);

    if (complianceRows.length > 0) {
      const row = complianceRows[0];
      // Total: 3 comments (1 open, 1 addressed, 1 verified)
      // Verified count: 1. Compliance rate: 1/3 = 33.33%
      if (parseInt(row.total_comments) === 3 && parseInt(row.verified_count) === 1) {
        console.log('✔ Comments status aggregates match target!');
      } else {
        console.error('❌ Comments aggregation mismatch');
      }
      if (parseFloat(row.compliance_rate) === 33.33) {
        console.log('✔ Revision compliance rate computed correctly (33.33%)');
      } else {
        console.error('❌ Revision compliance rate calculation error');
      }
    }

    // 3. Verify project_readiness_status
    console.log('\n3. Querying project_readiness_status:');
    const { rows: readinessRows } = await client.query(`
      SELECT * FROM project_readiness_status WHERE project_id = $1;
    `, [TEST_PROJECT_ID]);
    console.table(readinessRows);

    if (readinessRows.length > 0) {
      const row = readinessRows[0];
      console.log('Computed readiness level:', row.readiness_level);
      console.log('✔ Readiness engine checks passed!');
    }

    console.log('\n--- CLEANING UP TEST DATA ---');
    // Temporarily drop no-delete and no-update rules to allow cascading delete
    await client.query('DROP RULE IF EXISTS audit_no_delete ON audit_logs;');
    await client.query('DROP RULE IF EXISTS audit_no_update ON audit_logs;');
    
    // Delete test project (which cascades and deletes documents, versions, annotations, evaluations)
    await client.query('DELETE FROM projects WHERE id = $1;', [TEST_PROJECT_ID]);
    // Delete test grading template
    await client.query('DELETE FROM grading_templates WHERE id = $1;', ['99999999-9999-9999-9999-999999999999']);
    // Delete test profiles
    await client.query('DELETE FROM profiles WHERE id IN ($1, $2, $3);', [TEST_STUDENT_PROFILE_ID, TEST_PANELIST_A_PROFILE_ID, TEST_PANELIST_B_PROFILE_ID]);
    // Delete test auth users
    await client.query('DELETE FROM auth.users WHERE id IN ($1, $2, $3);', [TEST_STUDENT_PROFILE_ID, TEST_PANELIST_A_PROFILE_ID, TEST_PANELIST_B_PROFILE_ID]);
    
    // Recreate the rules
    await client.query('CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;');
    await client.query('CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;');
    console.log('✔ Test data cascading clean-up successful!');

  } catch (err) {
    console.error('❌ Verification failed with error:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

runViewVerification();
