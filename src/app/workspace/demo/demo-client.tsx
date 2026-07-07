"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Wifi, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Group, Panel, Separator } from "react-resizable-panels";
import { PdfViewerPanel } from "@/components/workspace/pdf-viewer-panel";
import { GradingPanel } from "@/components/workspace/grading-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DemoClient() {
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Checking session...");
  const [pdfUrl, setPdfUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [stageId, setStageId] = useState("");
  const [docVersionId, setDocVersionId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function setupDemo() {
      try {
        // 1. Sign in demo user automatically if not authenticated
        setLoadingStatus("Authenticating demo reviewer...");
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;
        
        if (!user) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: "panelist1@aurora.test",
            password: "Panel123!"
          });
          if (signInErr) throw signInErr;
          user = signInData.user;
        }

        if (!user) throw new Error("Could not authenticate panelist.");

        // 2. Fetch required base metadata (campuses, departments, stages, students)
        setLoadingStatus("Retrieving database layout...");
        const { data: campuses } = await supabase.from("campuses").select("id").limit(1);
        const { data: depts } = await supabase.from("departments").select("id").limit(1);
        const { data: stages } = await supabase.from("defense_stages").select("id, name").order("sequence_order").limit(1);
        const { data: students } = await supabase.from("students").select("id, profile_id").limit(1);

        if (!campuses || campuses.length === 0) throw new Error("No campus seeded. Run seed-test-users.js first.");
        if (!depts || depts.length === 0) throw new Error("No department seeded. Run seed-test-users.js first.");
        if (!stages || stages.length === 0) throw new Error("No defense stages seeded. Run seed-test-users.js first.");
        if (!students || students.length === 0) throw new Error("No student profiles seeded. Run seed-test-users.js first.");

        const campusId = campuses[0].id;
        const deptId = depts[0].id;
        const resolvedStageId = stages[0].id;
        const studentId = students[0].id;
        const studentProfileId = students[0].profile_id;

        setStageId(resolvedStageId);

        // Fixed demo IDs
        const DEMO_PROJECT_ID = "77777777-7777-7777-7777-777777777701";
        const DEMO_RUBRIC_ID = "77777777-7777-7777-7777-777777777702";
        const DEMO_DOC_ID = "77777777-7777-7777-7777-777777777703";
        const DEMO_VER_ID = "77777777-7777-7777-7777-777777777704";
        const DEMO_ANN_1_ID = "77777777-7777-7777-7777-777777777705";
        const DEMO_ANN_2_ID = "77777777-7777-7777-7777-777777777706";

        setDocVersionId(DEMO_VER_ID);
        setProjectTitle("AURORA Demo Workspace Project");

        // 3. Upsert Demo Project
        setLoadingStatus("Seeding demo project...");
        const { error: projErr } = await supabase.from("projects").upsert({
          id: DEMO_PROJECT_ID,
          campus_id: campusId,
          department_id: deptId,
          student_id: studentId,
          title: "AURORA Demo Workspace Project",
          academic_year: "2025-2026",
          status: "under_review"
        });
        if (projErr) throw projErr;

        // Upsert student member
        await supabase.from("project_members").upsert({
          project_id: DEMO_PROJECT_ID,
          profile_id: studentProfileId,
          member_role: "student",
          is_primary: true
        }, { onConflict: "project_id,profile_id,member_role" });

        // 4. Upsert Rubric Template
        setLoadingStatus("Seeding proposal rubric template...");
        const criteria = [
          { id: "c1", name: "Technical Quality", weight: 40 },
          { id: "c2", name: "Methodology", weight: 35 },
          { id: "c3", name: "Clarity & Style", weight: 25 }
        ];
        const { error: rubricErr } = await supabase.from("rubric_templates").upsert({
          id: DEMO_RUBRIC_ID,
          project_id: DEMO_PROJECT_ID,
          title: "Proposal Defense Rubric",
          criteria: criteria,
          passing_score: 75.00,
          excellent_score: 85.00,
          target_compliance_rate: 90.00,
          min_compliance_rate: 70.00,
          max_major_unresolved: 2,
          created_by: user.id
        });
        if (rubricErr) throw rubricErr;

        // 5. Generate and Upload Demo PDF if not already present
        setLoadingStatus("Preparing sample manuscript PDF...");
        const storagePath = "manuscripts/demo.pdf";
        
        // Check if file already exists in bucket
        const { data: fileCheck } = await supabase.storage.from("manuscripts").list();
        const exists = fileCheck?.some(f => f.name === "demo.pdf");
        
        if (!exists) {
          const { jsPDF } = await import("jspdf");
          const doc = new jsPDF();
          doc.setFont("helvetica", "bold");
          doc.text("AURORA DEMO MANUSCRIPT", 20, 20);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.text("Title: Academic Unified Review, Observation, Rating, and Assessment", 20, 32);
          doc.text("Institution: Partido State University", 20, 38);
          doc.text("Author: student1@aurora.test", 20, 44);
          doc.text("This PDF has been generated dynamically on the client to demonstrate", 20, 60);
          doc.text("the split-screen review workspace, canvas overlays, and anchored comments.", 20, 66);
          doc.text("Scroll down to test annotations. Select tools in the toolbar and click", 20, 72);
          doc.text("anywhere on the PDF page to add a comment.", 20, 78);
          
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.text("CHAPTER II - METHODOLOGY", 20, 20);
          doc.setFont("helvetica", "normal");
          doc.text("We propose an event-driven database synchronization model that delegates", 20, 32);
          doc.text("calculations to PostgreSQL triggers, maintaining cache integrity.", 20, 38);
          
          const pdfBlob = doc.output("blob");
          const { error: uploadErr } = await supabase.storage
            .from("manuscripts")
            .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });
          
          if (uploadErr) throw uploadErr;
        }

        // 6. Upsert Demo Document & Document Version
        setLoadingStatus("Seeding document records...");
        const { error: docErr } = await supabase.from("documents").upsert({
          id: DEMO_DOC_ID,
          project_id: DEMO_PROJECT_ID,
          stage_id: resolvedStageId,
          title: "Demo Proposal Manuscript",
          status: "under_review",
          created_by: studentProfileId
        });
        if (docErr) throw docErr;

        const { error: verErr } = await supabase.from("document_versions").upsert({
          id: DEMO_VER_ID,
          document_id: DEMO_DOC_ID,
          version_number: 1,
          storage_path: storagePath,
          file_name: "demo_manuscript.pdf",
          file_size: 3000,
          mime_type: "application/pdf",
          checksum_sha256: "sha256_demo_pdf_placeholder_hash",
          uploaded_by: studentProfileId,
          is_current: true,
          change_summary: "Initial upload"
        });
        if (verErr) throw verErr;

        // 7. Upsert Sample Annotations
        setLoadingStatus("Seeding sample annotations...");
        await supabase.from("annotations").upsert([
          {
            id: DEMO_ANN_1_ID,
            document_version_id: DEMO_VER_ID,
            type: "text_comment",
            page_number: 1,
            coordinates: { left: 15, top: 20, width: 70, height: 5 },
            selected_text: null,
            content: "The title is extremely comprehensive. Ensure it is aligned with the department scope guidelines.",
            severity: "minor",
            status: "open",
            created_by: user.id
          },
          {
            id: DEMO_ANN_2_ID,
            document_version_id: DEMO_VER_ID,
            type: "text_comment",
            page_number: 2,
            coordinates: { left: 15, top: 30, width: 70, height: 6 },
            selected_text: null,
            content: "Chapter II needs a diagram representing the data flows and system events.",
            severity: "major",
            status: "in_progress",
            created_by: user.id
          }
        ]);

        // 8. Generate Signed URL
        setLoadingStatus("Creating preview url...");
        const { data: signedData, error: signErr } = await supabase.storage
          .from("manuscripts")
          .createSignedUrl(storagePath, 3600);
        
        if (signErr) throw signErr;
        setPdfUrl(signedData.signedUrl);

      } catch (err: any) {
        console.error("Demo setup failed:", err);
        setErrorMsg(err.message || "Failed to set up workspace demo.");
      } finally {
        setLoading(false);
      }
    }

    setupDemo();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span>{loadingStatus}</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-sm text-muted-foreground gap-4">
        <AlertCircle className="h-10 w-10 text-danger" />
        <p className="font-semibold text-lg text-foreground">{errorMsg}</p>
        <Button asChild variant="outline">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  const DEMO_PROJECT_ID = "77777777-7777-7777-7777-777777777701";

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/submissions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold leading-tight max-w-xl truncate">
              {projectTitle} (Demo Workspace)
            </p>
            <p className="text-xs text-muted-foreground">
              Student One • Version 1 (Seeded PDF)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="info" className="hidden sm:flex">
            <Wifi className="mr-1 h-3 w-3" />
            Online
          </Badge>
          <Badge variant="success">Auto-saved</Badge>
        </div>
      </header>

      {/* Main split-screen panel container */}
      <div className="hidden flex-1 overflow-hidden lg:block">
        <Group orientation="horizontal">
          <Panel defaultSize={65} minSize={40}>
            {pdfUrl ? (
              <PdfViewerPanel 
                title={projectTitle} 
                documentVersionId={docVersionId} 
                pdfUrl={pdfUrl} 
                projectId={DEMO_PROJECT_ID}
                stageId={stageId}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                No manuscript uploaded yet.
              </div>
            )}
          </Panel>
          <Separator className="w-1.5 bg-border transition-colors hover:bg-primary/30" />
          <Panel defaultSize={35} minSize={25}>
            <div className="h-full border-l border-border bg-card">
              <GradingPanel 
                projectId={DEMO_PROJECT_ID} 
                stageId={stageId} 
                documentVersionId={docVersionId} 
              />
            </div>
          </Panel>
        </Group>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <div className="h-[50vh] shrink-0">
          {pdfUrl ? (
            <PdfViewerPanel 
              title={projectTitle} 
              documentVersionId={docVersionId} 
              pdfUrl={pdfUrl} 
              projectId={DEMO_PROJECT_ID}
              stageId={stageId}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              No manuscript uploaded yet.
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden border-t border-border">
          <GradingPanel 
            projectId={DEMO_PROJECT_ID} 
            stageId={stageId} 
            documentVersionId={docVersionId} 
          />
        </div>
      </div>
    </div>
  );
}
