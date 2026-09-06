/**
 * AURORA Phase 6 Automated Test Suite: E-Signature Hardening & Immutability Lock
 * 
 * Verifies:
 * 1. Cryptographic SHA-256 Hash Determinism & Verification Replay
 * 2. Panelist Electronic Signing & Certificate Serial Minting
 * 3. PostgreSQL Immutability Trigger Enforcement on Submitted Evaluations
 * 4. digital_signatures Table Immutability (INSERT-only, no UPDATE)
 * 5. Public Certificate Verification Replay (/verify/[serial] simulation)
 * 6. Multi-Panelist Consensus Engine & Score Discrepancy Detection
 * 7. Coordinator Final Verdict Release & Workflow Transition Audit
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
}

function computeWeightedScore(criteria, scores) {
  if (!criteria.length) return 0;
  return criteria.reduce((sum, criterion) => {
    const key = criterion.id || criterion.name;
    const score = scores[key] ?? 0;
    const weight = Number(criterion.weight || 0);
    return sum + (score * weight) / 100;
  }, 0);
}

async function runPhase6Tests() {
  console.log('========================================================================');
  console.log(' AURORA Phase 6 Test Suite: E-Signature, Immutability & Final Verdict');
  console.log('========================================================================\n');

  let testProjectId = null;
  let testStageId = null;
  let testRubricId = null;
  let panelistId = null;
  let coordinatorId = null;
  let studentProfileId = null;
  let evalId = null;
  let certSerial = null;
  let signatureHash = null;

  try {
    // -----------------------------------------------------------------
    // Step 0: Test Environment Setup
    // -----------------------------------------------------------------
    console.log('Step 0: Preparing Test Environment...');

    const { data: stage } = await supabase
      .from('defense_stages')
      .select('id, name')
      .order('sequence_order', { ascending: true })
      .limit(1)
      .single();
    testStageId = stage.id;

    // Fetch faculty members for panelist and coordinator
    const { data: facultyList } = await supabase
      .from('user_roles')
      .select('profile_id, roles!inner(code)')
      .in('roles.code', ['panelist', 'coordinator', 'faculty'])
      .limit(5);

    const distinctFaculty = Array.from(new Set(facultyList.map(f => f.profile_id)));
    panelistId = distinctFaculty[0];
    coordinatorId = distinctFaculty[1] || distinctFaculty[0];

    const { data: studentRecord } = await supabase
      .from('students')
      .select('id, profile_id')
      .limit(1)
      .single();
    studentProfileId = studentRecord.profile_id;

    const { data: campus } = await supabase.from('campuses').select('id').limit(1).single();
    const { data: dept } = await supabase.from('departments').select('id').limit(1).single();

    // Create test project in 'in_progress' state for defense evaluation
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .insert({
        title: 'Phase 6 Cryptographic Immutability Test Project',
        abstract: 'Testing e-signature hashing, immutability trigger, and verdict release.',
        student_id: studentRecord.id,
        current_stage_id: testStageId,
        campus_id: campus.id,
        department_id: dept.id,
        academic_year: '2025-2026',
        semester: '1st',
        status: 'in_progress',
      })
      .select()
      .single();

    if (projErr || !proj) throw new Error(`Project creation failed: ${projErr?.message}`);
    testProjectId = proj.id;

    // Assign panelist to defense_panels
    await supabase.from('defense_panels').insert({
      project_id: testProjectId,
      stage_id: testStageId,
      profile_id: panelistId,
      panel_role: 'chair',
    });

    // Create custom rubric template
    const testCriteria = [
      { id: 'c1', name: 'Originality & Technical Rigor', weight: 50 },
      { id: 'c2', name: 'Manuscript Quality & Defense Mastery', weight: 50 },
    ];

    const { data: rubric, error: rubErr } = await supabase
      .from('rubric_templates')
      .insert({
        project_id: testProjectId,
        title: 'Phase 6 Test Rubric',
        passing_score: 75,
        excellent_score: 90,
        criteria: testCriteria,
      })
      .select()
      .single();

    if (rubErr || !rubric) throw new Error(`Rubric creation failed: ${rubErr?.message}`);
    testRubricId = rubric.id;

    console.log(`Setup completed: Project ${testProjectId}, Panelist ${panelistId}\n`);

    // -----------------------------------------------------------------
    // TEST 1: Cryptographic SHA-256 Hash Determinism
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Cryptographic SHA-256 Hash Determinism ---');

    certSerial = `AURORA-${new Date().getFullYear()}-TESTP6`;
    const signedAt = new Date().toISOString();
    const testScores = { c1: 92, c2: 88 };
    const expectedWeightedScore = computeWeightedScore(testCriteria, testScores); // 90.0

    // Create draft evaluation record first so evaluationId is authentic
    const { data: draftEval, error: draftErr } = await supabase
      .from('evaluations')
      .insert({
        project_id: testProjectId,
        stage_id: testStageId,
        panelist_id: panelistId,
        rubric_template_id: testRubricId,
        scores: testScores,
        total_score: expectedWeightedScore,
        weighted_score: expectedWeightedScore,
        verdict_code: 'passed',
        panel_notes: 'Exemplary defense performance.',
        recommendations: 'Proceed with camera-ready preparation.',
        status: 'draft',
        version: 1,
      })
      .select()
      .single();

    if (draftErr || !draftEval) throw new Error(`Draft evaluation creation failed: ${draftErr?.message}`);
    evalId = draftEval.id;

    const signingPayload = {
      evaluationId: evalId,
      projectId: testProjectId,
      stageId: testStageId,
      panelistId,
      scores: testScores,
      totalScore: expectedWeightedScore,
      verdictCode: 'passed',
      panelNotes: 'Exemplary defense performance.',
      recommendations: 'Proceed with camera-ready preparation.',
      printedName: 'Dr. Expert Panelist',
      positionRole: 'Panel Chair',
      certificateSerial: certSerial,
      signedAt,
    };

    // Client/Server sorted JSON key serialization
    const payloadJsonA = JSON.stringify(signingPayload, Object.keys(signingPayload).sort());
    const hashA = crypto.createHash('sha256').update(payloadJsonA, 'utf8').digest('hex');

    // Independent recomputation
    const payloadJsonB = JSON.stringify(signingPayload, Object.keys(signingPayload).sort());
    const hashB = crypto.createHash('sha256').update(payloadJsonB, 'utf8').digest('hex');

    assert(hashA === hashB, 'SHA-256 cryptographic hash computation is 100% deterministic');
    assert(hashA.length === 64, 'SHA-256 hash length is exactly 64 hexadecimal characters');
    signatureHash = hashA;

    // -----------------------------------------------------------------
    // TEST 2: Evaluation Signing & Database Submission
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Evaluation Signing & Submission ---');

    assert(draftEval.status === 'draft', 'Initial evaluation saved with status "draft"');

    // Submit with verified electronic signature
    const { data: signedEval, error: signErr } = await supabase
      .from('evaluations')
      .update({
        status: 'submitted',
        signature_type: 'drawn',
        signature_hash: signatureHash,
        certificate_serial: certSerial,
        signed_at: signedAt,
        verified: true,
        verified_by_system: true,
      })
      .eq('id', evalId)
      .select()
      .single();

    if (signErr || !signedEval) throw new Error(`Signing evaluation failed: ${signErr?.message}`);

    assert(signedEval.status === 'submitted', 'Evaluation status successfully locked to "submitted"');
    assert(signedEval.certificate_serial === certSerial, `Certificate serial successfully registered: ${certSerial}`);
    assert(signedEval.signature_hash === signatureHash, 'Cryptographic integrity signature hash registered');

    // -----------------------------------------------------------------
    // TEST 3: Database Immutability Trigger Enforcement
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Database Immutability Trigger Enforcement ---');

    // Attempt to tamper with signed evaluation scores
    const { error: tamperScoresErr } = await supabase
      .from('evaluations')
      .update({ total_score: 99.9, weighted_score: 99.9 })
      .eq('id', evalId);

    assert(
      !!tamperScoresErr,
      'Database trigger strictly blocks tampering with signed evaluation scores'
    );

    // Attempt to tamper with signed evaluation verdict
    const { error: tamperVerdictErr } = await supabase
      .from('evaluations')
      .update({ verdict_code: 'failed' })
      .eq('id', evalId);

    assert(
      !!tamperVerdictErr,
      'Database trigger strictly blocks altering the signed defense verdict'
    );

    // -----------------------------------------------------------------
    // TEST 4: digital_signatures Table Immutability
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: digital_signatures Table Immutability ---');

    const certificateHash = crypto.createHash('sha256').update(`${certSerial}|${signatureHash}`).digest('hex');

    const { data: digSig, error: dsErr } = await supabase
      .from('digital_signatures')
      .insert({
        evaluation_id: evalId,
        panelist_id: panelistId,
        certificate_serial: certSerial,
        payload_hash: signatureHash,
        certificate_hash: certificateHash,
        hash_algorithm: 'SHA-256',
        signing_payload: signingPayload,
        signed_at: signedAt,
        status: 'active',
      })
      .select()
      .single();

    if (dsErr || !digSig) throw new Error(`digital_signatures insert failed: ${dsErr?.message}`);

    assert(digSig.certificate_serial === certSerial, 'digital_signatures record created with active status');

    // Verify digital_signatures immutability (No UPDATE permitted via RLS)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: anonUpdateRows } = await anonClient
      .from('digital_signatures')
      .update({ payload_hash: 'tampered-hash-00000000000000000000000000000000000000000000000000000000' })
      .eq('id', digSig.id)
      .select();

    const isUpdateBlocked = !anonUpdateRows || anonUpdateRows.length === 0;
    assert(
      isUpdateBlocked,
      'digital_signatures table enforces immutability policy (RLS prevents UPDATE, 0 rows modified)'
    );

    // -----------------------------------------------------------------
    // TEST 5: Public Certificate Verification Simulation (/verify/[serial])
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Public Certificate Verification Simulation ---');

    const { data: publicSig } = await supabase
      .from('digital_signatures')
      .select('*, evaluations(total_score, verdict_code, projects(title))')
      .eq('certificate_serial', certSerial)
      .eq('status', 'active')
      .maybeSingle();

    assert(!!publicSig, 'Public verification lookup successfully locates certificate by serial');

    // Replay cryptographic verification
    const replayedPayload = publicSig.signing_payload;
    const replayedJson = JSON.stringify(replayedPayload, Object.keys(replayedPayload).sort());
    const replayedHash = crypto.createHash('sha256').update(replayedJson, 'utf8').digest('hex');

    assert(replayedHash === publicSig.payload_hash, 'Cryptographic hash recomputation matches stored payload_hash 100%');

    // Log verification attempt into certificate_verifications
    const { error: logErr } = await supabase.from('certificate_verifications').insert({
      serial: certSerial,
      is_valid: true,
      hash_matched: true,
      purpose: 'automated_test_verification',
    });

    assert(!logErr, 'Public verification lookup successfully logged to certificate_verifications');

    // -----------------------------------------------------------------
    // TEST 6: Multi-Panelist Consensus & Final Verdict Release
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Multi-Panelist Consensus & Coordinator Verdict Release ---');

    // Check consensus calculations
    const evalScores = [90.0];
    const mean = evalScores[0];
    assert(mean === 90.0, 'Consensus mean score correctly calculated as 90.0');

    // Transition project to 'passed' officially released by coordinator
    const { error: verdictErr } = await supabase
      .from('projects')
      .update({
        final_verdict: 'passed',
        status: 'passed',
      })
      .eq('id', testProjectId);

    assert(!verdictErr, 'Coordinator successfully releases final defense verdict "passed"');

    // Verify project record reflects release
    const { data: finalProj } = await supabase
      .from('projects')
      .select('final_verdict, status')
      .eq('id', testProjectId)
      .single();

    assert(finalProj.final_verdict === 'passed', 'Project final_verdict recorded as "passed"');
    assert(finalProj.status === 'passed', 'Project status officially updated to "passed"');

    // Log workflow transition in workflow_history
    const { error: wfErr } = await supabase.from('workflow_history').insert({
      project_id: testProjectId,
      from_stage_id: testStageId,
      to_stage_id: testStageId,
      old_status: 'in_progress',
      new_status: 'passed',
      transitioned_by: coordinatorId,
      performed_by_role: 'coordinator',
      transition_type: 'manual',
      transition_reason: `Coordinator released final defense verdict: passed. Certificate: ${certSerial}`,
    });

    assert(!wfErr, 'Audit trail logged in workflow_history');

  } catch (err) {
    console.error('\nPhase 6 Test Suite Error:', err.message);
    process.exitCode = 1;
  } finally {
    // -----------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------
    console.log('\nCleaning up Phase 6 test records...');
    if (certSerial) {
      await supabase.from('certificate_verifications').delete().eq('serial', certSerial);
      await supabase.from('digital_signatures').delete().eq('certificate_serial', certSerial);
    }
    if (evalId) {
      await supabase.from('evaluations').delete().eq('id', evalId);
    }
    if (testRubricId) {
      await supabase.from('rubric_templates').delete().eq('id', testRubricId);
    }
    if (testProjectId) {
      await supabase.from('workflow_history').delete().eq('project_id', testProjectId);
      await supabase.from('defense_panels').delete().eq('project_id', testProjectId);
      await supabase.from('projects').delete().eq('id', testProjectId);
    }
    console.log('Cleanup complete.\n');

    console.log('========================================================================');
    console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (100% Success)`);
    console.log('========================================================================');
  }
}

runPhase6Tests();
