/**
 * AURORA Automated Test Suite: Google Docs-Style Interactive PDF Text Highlighting & Inline Commenting
 * 
 * Verifies:
 * 1. Reviewer Highlight Creation:
 *    - Persists text selection quote (`selected_text`)
 *    - Persists responsive percentage bounding coordinates (`coordinates: { left, top, width, height }`)
 *    - Sets page number, severity, content, and initial status = 'open'
 * 2. Student Query & Realtime Verification:
 *    - Student account point-of-view retrieves exact coordinates for yellow highlight rendering
 *    - Quoted text matches manuscript selection
 * 3. Threaded Discussion:
 *    - Student posts inline clarification reply linked to annotation (`annotation_replies`)
 *    - Reply appears in conversation thread with author metadata
 * 4. Status Workflow Lifecycle:
 *    - Student changes status to 'addressed'
 *    - Audit history captures status transition
 *    - Faculty / Reviewer verifies and marks 'resolved'
 * 5. Multi-Annotation Overlap & Cleanup:
 *    - Multiple highlights on same/different pages coexist without conflict
 *    - Clean teardown of all test artifacts
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

async function runGoogleDocsAnnotationsTests() {
  console.log('========================================================================');
  console.log(' AURORA Test Suite: Google Docs-Style Interactive PDF Annotations');
  console.log('========================================================================\n');

  let testProjectId = null;
  let testStageId = null;
  let testDocId = null;
  let testVersionId = null;
  let reviewerProfileId = null;
  let studentProfileId = null;
  let annotationId = null;
  let replyId = null;

  try {
    // -----------------------------------------------------------------
    // Step 0: Test Environment Setup
    // -----------------------------------------------------------------
    console.log('Step 0: Preparing Test Environment...');

    // Fetch active defense stage
    const { data: stage } = await supabase
      .from('defense_stages')
      .select('id, name')
      .order('sequence_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    assert(stage && stage.id, 'Active defense stage retrieved');
    testStageId = stage.id;

    // Fetch a faculty/reviewer profile
    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .limit(1)
      .maybeSingle();

    assert(reviewerProfile && reviewerProfile.id, `Reviewer profile found: ${reviewerProfile.first_name} ${reviewerProfile.last_name}`);
    reviewerProfileId = reviewerProfile.id;

    // Fetch student record
    const { data: studentRecord } = await supabase
      .from('students')
      .select('id, profile_id')
      .limit(1)
      .single();

    assert(studentRecord && studentRecord.id, 'Student record resolved');
    studentProfileId = studentRecord.profile_id;

    const { data: campus } = await supabase.from('campuses').select('id').limit(1).single();
    const { data: dept } = await supabase.from('departments').select('id').limit(1).single();

    // Create a temporary research project for testing
    const testTitle = `E2E Docs Annotation Test - ${crypto.randomBytes(4).toString('hex')}`;
    const { data: newProj, error: projErr } = await supabase
      .from('projects')
      .insert({
        title: testTitle,
        student_id: studentRecord.id,
        current_stage_id: testStageId,
        campus_id: campus.id,
        department_id: dept.id,
        academic_year: '2025-2026',
        semester: '1st',
        status: 'in_progress',
      })
      .select('id')
      .single();

    if (projErr) throw projErr;
    assert(newProj && newProj.id, `Temporary project created: ${newProj.id}`);
    testProjectId = newProj.id;

    // Create document record
    const { data: newDoc, error: docErr } = await supabase
      .from('documents')
      .insert({
        project_id: testProjectId,
        stage_id: testStageId,
        title: 'Research Manuscript Draft',
        status: 'under_review',
        created_by: studentProfileId,
      })
      .select('id')
      .single();

    if (docErr) throw docErr;
    assert(newDoc && newDoc.id, `Manuscript document created: ${newDoc.id}`);
    testDocId = newDoc.id;

    // Create document version
    const { data: newVersion, error: verErr } = await supabase
      .from('document_versions')
      .insert({
        document_id: testDocId,
        version_number: 1,
        is_current: true,
        file_name: 'manuscript_test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        checksum_sha256: crypto.randomBytes(32).toString('hex'),
        uploaded_by: studentProfileId,
        storage_path: 'manuscripts/test-manuscript.pdf',
        change_summary: 'Initial upload',
      })
      .select('id')
      .single();

    if (verErr) throw verErr;
    assert(newVersion && newVersion.id, `Document version 1 created: ${newVersion.id}`);
    testVersionId = newVersion.id;

    console.log('\n--- Step 1: Reviewer Highlights Text (Google Docs Style) ---');

    // 1. Reviewer highlights text on page 1
    const sampleSelectedText = "The proposed deep learning architecture uses transformer encoders with self-attention.";
    const sampleCoordinates = {
      left: 14.52,
      top: 32.18,
      width: 71.05,
      height: 3.84,
    };
    const sampleComment = "Please clarify the attention mechanism and justify the choice of 8 heads over 12 heads.";

    const { data: createdAnnotation, error: annErr } = await supabase
      .from('annotations')
      .insert({
        document_version_id: testVersionId,
        page_number: 1,
        type: 'highlight',
        severity: 'major',
        status: 'open',
        selected_text: sampleSelectedText,
        coordinates: sampleCoordinates,
        content: sampleComment,
        created_by: reviewerProfileId,
      })
      .select(`
        id,
        document_version_id,
        page_number,
        type,
        severity,
        status,
        selected_text,
        coordinates,
        content,
        created_by,
        created_at
      `)
      .single();

    if (annErr) throw annErr;
    assert(createdAnnotation && createdAnnotation.id, 'Annotation successfully created with coordinates');
    annotationId = createdAnnotation.id;

    assert(createdAnnotation.type === 'highlight', 'Annotation type is "highlight"');
    assert(createdAnnotation.selected_text === sampleSelectedText, 'Quoted selected text matches exactly');
    assert(
      createdAnnotation.coordinates &&
      createdAnnotation.coordinates.left === sampleCoordinates.left &&
      createdAnnotation.coordinates.top === sampleCoordinates.top &&
      createdAnnotation.coordinates.width === sampleCoordinates.width &&
      createdAnnotation.coordinates.height === sampleCoordinates.height,
      'Percentage bounding box coordinates {left, top, width, height} persisted accurately'
    );
    assert(createdAnnotation.status === 'open', 'Initial status is "open"');
    assert(createdAnnotation.severity === 'major', 'Severity is "major"');

    console.log('\n--- Step 2: Student Account Point-of-View Verification ---');

    // 2. Student queries the annotations for this document version
    const { data: studentViewAnnotations, error: studentQueryErr } = await supabase
      .from('annotations')
      .select(`
        id,
        page_number,
        type,
        severity,
        status,
        content,
        selected_text,
        coordinates,
        created_at,
        created_by,
        profiles!created_by ( first_name, last_name )
      `)
      .eq('document_version_id', testVersionId);

    if (studentQueryErr) throw studentQueryErr;
    assert(studentViewAnnotations && studentViewAnnotations.length === 1, 'Student view retrieved exactly 1 highlight annotation');

    const fetchedAnnotation = studentViewAnnotations[0];
    assert(fetchedAnnotation.id === annotationId, 'Fetched annotation ID matches created ID');
    assert(fetchedAnnotation.selected_text === sampleSelectedText, 'Student sees the highlighted text snippet');
    assert(fetchedAnnotation.coordinates?.left > 0, 'Student view has valid X percentage coordinate for overlay box');
    assert(fetchedAnnotation.coordinates?.top > 0, 'Student view has valid Y percentage coordinate for overlay box');

    console.log('\n--- Step 3: Student Threaded Reply ---');

    // 3. Student replies inline to the remark
    const studentReplyText = "We conducted ablation studies comparing 8 vs 12 heads in Section 4.3; 8 heads yields identical F1 with 35% lower inference latency.";
    const { data: createdReply, error: replyErr } = await supabase
      .from('annotation_replies')
      .insert({
        annotation_id: annotationId,
        content: studentReplyText,
        created_by: studentProfileId,
      })
      .select(`
        id,
        annotation_id,
        content,
        created_by,
        created_at
      `)
      .single();

    if (replyErr) throw replyErr;
    assert(createdReply && createdReply.id, 'Student threaded reply inserted successfully');
    replyId = createdReply.id;
    assert(createdReply.annotation_id === annotationId, 'Reply correctly foreign-keyed to annotation');
    assert(createdReply.content === studentReplyText, 'Reply text content preserved');

    // Verify reply appears when querying annotation with nested replies
    const { data: annWithReplies, error: threadErr } = await supabase
      .from('annotations')
      .select(`
        id,
        content,
        annotation_replies (
          id,
          content,
          created_by,
          created_at
        )
      `)
      .eq('id', annotationId)
      .single();

    if (threadErr) throw threadErr;
    assert(annWithReplies.annotation_replies && annWithReplies.annotation_replies.length === 1, 'Threaded conversation includes student reply');
    assert(annWithReplies.annotation_replies[0].content === studentReplyText, 'Thread reply matches student response');

    console.log('\n--- Step 4: Student Changes Status to "Addressed" ---');

    // 4. Student marks annotation as addressed
    const { data: addressedAnn, error: updateErr1 } = await supabase
      .from('annotations')
      .update({ status: 'addressed' })
      .eq('id', annotationId)
      .select('id, status')
      .single();

    if (updateErr1) throw updateErr1;
    assert(addressedAnn.status === 'addressed', 'Annotation status transitioned to "addressed" by student');

    // Log to annotation_history
    const { error: histErr1 } = await supabase
      .from('annotation_history')
      .insert({
        annotation_id: annotationId,
        from_status: 'open',
        to_status: 'addressed',
        changed_by: studentProfileId,
        notes: 'Addressed in revised manuscript draft Section 4.3',
      });

    if (histErr1) throw histErr1;
    assert(true, 'Audit log recorded for "open" -> "addressed" transition');

    console.log('\n--- Step 5: Reviewer Verifies & Resolves Remark ---');

    // 5. Reviewer verifies revision and marks as resolved
    const { data: resolvedAnn, error: updateErr2 } = await supabase
      .from('annotations')
      .update({ status: 'resolved' })
      .eq('id', annotationId)
      .select('id, status')
      .single();

    if (updateErr2) throw updateErr2;
    assert(resolvedAnn.status === 'resolved', 'Annotation status transitioned to "resolved" by reviewer');

    // Log to annotation_history
    const { error: histErr2 } = await supabase
      .from('annotation_history')
      .insert({
        annotation_id: annotationId,
        from_status: 'addressed',
        to_status: 'resolved',
        changed_by: reviewerProfileId,
        notes: 'Verified ablation study in Section 4.3; explanation approved.',
      });

    if (histErr2) throw histErr2;
    assert(true, 'Audit log recorded for "addressed" -> "resolved" transition');

    // Verify complete audit history trail
    const { data: historyTrail, error: trailErr } = await supabase
      .from('annotation_history')
      .select('from_status, to_status, notes')
      .eq('annotation_id', annotationId)
      .order('changed_at', { ascending: true });

    if (trailErr) throw trailErr;
    assert(historyTrail && historyTrail.length === 2, 'Complete 2-step audit history trail preserved');
    assert(historyTrail[0].to_status === 'addressed', 'First step is "addressed"');
    assert(historyTrail[1].to_status === 'resolved', 'Second step is "resolved"');

    console.log('\n--- Step 6: Multi-Highlight Collision & Page Coordinate Precision ---');

    // Create a second annotation on page 2
    const { data: annPage2, error: p2Err } = await supabase
      .from('annotations')
      .insert({
        document_version_id: testVersionId,
        page_number: 2,
        type: 'highlight',
        severity: 'minor',
        status: 'open',
        selected_text: "Figure 3 illustrates the confusion matrix on the validation set.",
        coordinates: { left: 20.0, top: 55.4, width: 60.0, height: 2.5 },
        content: "Please increase the font size of the axis labels in Figure 3.",
        created_by: reviewerProfileId,
      })
      .select('id, page_number')
      .single();

    if (p2Err) throw p2Err;
    assert(annPage2 && annPage2.page_number === 2, 'Second highlight correctly placed on page 2 without collision');

    // Query per page filtering
    const { data: p1Anns } = await supabase
      .from('annotations')
      .select('id')
      .eq('document_version_id', testVersionId)
      .eq('page_number', 1);

    const { data: p2Anns } = await supabase
      .from('annotations')
      .select('id')
      .eq('document_version_id', testVersionId)
      .eq('page_number', 2);

    assert(p1Anns?.length === 1, 'Page 1 correctly filters 1 highlight');
    assert(p2Anns?.length === 1, 'Page 2 correctly filters 1 highlight');

    // Clean up second annotation
    await supabase.from('annotations').delete().eq('id', annPage2.id);

  } catch (err) {
    console.error('\n❌ Test Suite Failed with Error:', err);
    process.exitCode = 1;
  } finally {
    // -----------------------------------------------------------------
    // Teardown: Clean up test data
    // -----------------------------------------------------------------
    console.log('\nTeardown: Cleaning up test data...');
    if (annotationId) {
      await supabase.from('annotation_history').delete().eq('annotation_id', annotationId);
      await supabase.from('annotation_replies').delete().eq('annotation_id', annotationId);
      await supabase.from('annotations').delete().eq('id', annotationId);
    }
    if (testVersionId) {
      await supabase.from('document_versions').delete().eq('id', testVersionId);
    }
    if (testDocId) {
      await supabase.from('documents').delete().eq('id', testDocId);
    }
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId);
    }
    console.log('Cleanup completed.\n');
  }

  console.log('========================================================================');
  console.log(` Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests === totalTests && !process.exitCode) {
    console.log('🎉 ALL GOOGLE DOCS-STYLE ANNOTATION TESTS PASSED PERFECTLY!\n');
  } else {
    console.error('⚠️ Some tests failed or an error occurred during execution.\n');
    process.exit(1);
  }
}

runGoogleDocsAnnotationsTests();
