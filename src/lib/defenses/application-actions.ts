"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { emitNotification } from "@/lib/notifications/emit";
import { emitAuditLog } from "@/lib/audit/log";
import {
  DefenseApplication,
  DefenseApplicationRequirements,
  AdviserCertification,
  CommitteeManifestation,
  ChairApproval,
} from "@/types/database";

/**
 * Submits or updates an Application for Oral Defense (DCS-CF-03)
 */
export async function submitDefenseApplicationAction(input: {
  projectId: string;
  stageId: string;
  defenseType?: string;
  formCode?: string;
  requirements: DefenseApplicationRequirements;
  preferredDates?: Array<{ date: string; time?: string }>;
  notes?: string;
}): Promise<{ success: boolean; application?: DefenseApplication; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const serviceClient = createServiceClient();

    // Verify project exists
    const { data: project, error: projErr } = await serviceClient
      .from("projects")
      .select("id, title, student_id, project_members(profile_id, member_role)")
      .eq("id", input.projectId)
      .single();

    if (projErr || !project) {
      return { success: false, error: "Project not found." };
    }

    // Verify caller is a project member or owner
    const { data: studentRecord } = await serviceClient
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    const isMember =
      (studentRecord && project.student_id === studentRecord.id) ||
      project.student_id === user.id ||
      (project.project_members as any[])?.some((m) => m.profile_id === user.id);

    if (!isMember) {
      return { success: false, error: "Permission denied. You are not a member of this project." };
    }

    const defenseType = input.defenseType || "Progress Report";
    const formCode = input.formCode || "DCS-CF-03";

    // Upsert into defense_applications
    const { data: application, error: upsertErr } = await serviceClient
      .from("defense_applications")
      .upsert(
        {
          project_id: input.projectId,
          stage_id: input.stageId,
          form_code: formCode,
          defense_type: defenseType,
          requirements_checklist: input.requirements,
          preferred_dates: input.preferredDates || [],
          status: "submitted_by_student",
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,stage_id" }
      )
      .select("*")
      .single();

    if (upsertErr || !application) {
      throw new Error(`Failed to submit application: ${upsertErr?.message || "Unknown error"}`);
    }

    // Notify project adviser (or link demo adviser default for concept/title defense demonstration)
    let adviserMember = (project.project_members as any[])?.find(
      (m) => m.member_role === "adviser"
    );

    if (!adviserMember?.profile_id) {
      const DEMO_ADVISER_PROFILE_ID = "ac8ab701-b052-450b-8464-3145196797c5"; // Pablo Job (panelist1@aurora.test)
      await serviceClient.from("project_members").upsert(
        {
          project_id: input.projectId,
          profile_id: DEMO_ADVISER_PROFILE_ID,
          member_role: "adviser",
          is_primary: true,
        },
        { onConflict: "project_id,profile_id,member_role" }
      );
      adviserMember = { profile_id: DEMO_ADVISER_PROFILE_ID };
    }

    if (adviserMember?.profile_id) {
      await emitNotification({
        supabase: serviceClient,
        recipientProfileId: adviserMember.profile_id,
        title: "Oral Defense Application Submitted",
        message: `Student proponents submitted an Application for Oral Defense (${formCode}) for "${project.title}". Please review and certify.`,
        eventType: "document_uploaded",
        link: `/dashboard/defenses`,
      });
    }

    // Audit log
    await emitAuditLog(supabase, {
      profile_id: user.id,
      user_email: user.email,
      action_type: "SUBMIT",
      module: "defenses",
      entity_type: "defense_applications",
      entity_id: application.id,
      description: `Submitted Application for Oral Defense (${formCode}) for "${project.title}"`,
      new_value: { stage_id: input.stageId, defense_type: defenseType },
    });

    return { success: true, application };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit defense application";
    console.error("[submitDefenseApplicationAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Adviser signs the Certification of the Adviser (DCS-CF-03)
 */
export async function certifyDefenseApplicationAction(input: {
  applicationId: string;
  remarks?: string;
  signatureUrl?: string;
}): Promise<{ success: boolean; application?: DefenseApplication; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const serviceClient = createServiceClient();

    // Fetch profile name
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const adviserName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Research Adviser";

    const certificationPayload: AdviserCertification = {
      certified_at: new Date().toISOString(),
      adviser_id: user.id,
      adviser_name: adviserName,
      signature_url: input.signatureUrl || undefined,
      remarks: input.remarks?.trim() || "Recommended for oral defense presentation.",
    };

    const { data: updatedApp, error: updateErr } = await serviceClient
      .from("defense_applications")
      .update({
        adviser_certification: certificationPayload,
        status: "certified_by_adviser",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId)
      .select("*, projects(id, title, student_id)")
      .single();

    if (updateErr || !updatedApp) {
      throw new Error(`Failed to certify application: ${updateErr?.message || "Unknown error"}`);
    }

    // Notify student owner
    const proj = (updatedApp as any).projects;
    if (proj?.student_id) {
      const { data: studentRecord } = await serviceClient
        .from("students")
        .select("profile_id")
        .eq("id", proj.student_id)
        .maybeSingle();

      const recipientProfileId = studentRecord?.profile_id || proj.student_id;

      await emitNotification({
        supabase: serviceClient,
        recipientProfileId: recipientProfileId,
        title: "Oral Defense Endorsed by Adviser",
        message: `Your adviser certified your Application for Oral Defense for "${proj.title}". It is now ready for defense scheduling.`,
        eventType: "document_approved",
        link: `/dashboard/my-project`,
      });
    }

    // Audit log
    await emitAuditLog(supabase, {
      profile_id: user.id,
      user_email: user.email,
      action_type: "APPROVE",
      module: "defenses",
      entity_type: "defense_applications",
      entity_id: input.applicationId,
      description: `Adviser certified Application for Oral Defense for "${proj?.title || input.applicationId}"`,
      new_value: certificationPayload,
    });

    return { success: true, application: updatedApp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to certify defense application";
    console.error("[certifyDefenseApplicationAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Committee member / panelist manifests agreement to schedule (DCS-CF-03)
 */
export async function manifestCommitteeAgreementAction(input: {
  applicationId: string;
  signatureUrl?: string;
}): Promise<{ success: boolean; application?: DefenseApplication; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const serviceClient = createServiceClient();

    const { data: app, error: appErr } = await serviceClient
      .from("defense_applications")
      .select("*, defense_schedules(*)")
      .eq("id", input.applicationId)
      .single();

    if (appErr || !app) {
      return { success: false, error: "Application not found." };
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const panelName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Panelist";

    const currentManifestations: CommitteeManifestation[] = Array.isArray(app.committee_manifestations)
      ? [...app.committee_manifestations]
      : [];

    const existingIdx = currentManifestations.findIndex((m) => m.profile_id === user.id);
    const newEntry: CommitteeManifestation = {
      profile_id: user.id,
      name: panelName,
      role: "member",
      agreed_at: new Date().toISOString(),
      signature_url: input.signatureUrl || undefined,
    };

    if (existingIdx >= 0) {
      currentManifestations[existingIdx] = newEntry;
    } else {
      currentManifestations.push(newEntry);
    }

    const { data: updatedApp, error: updateErr } = await serviceClient
      .from("defense_applications")
      .update({
        committee_manifestations: currentManifestations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`Failed to record manifestation: ${updateErr.message}`);
    }

    return { success: true, application: updatedApp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record manifestation";
    console.error("[manifestCommitteeAgreementAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Department Chair / Coordinator signs official approval (DCS-CF-03)
 */
export async function approveDefenseApplicationAction(input: {
  applicationId: string;
  chairName?: string;
  signatureUrl?: string;
}): Promise<{ success: boolean; application?: DefenseApplication; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const serviceClient = createServiceClient();

    const chairApproval: ChairApproval = {
      approved_at: new Date().toISOString(),
      chair_name: input.chairName || "KENNEDY C. CUYA, DIT",
      chair_id: user.id,
      signature_url: input.signatureUrl || undefined,
    };

    const { data: updatedApp, error: updateErr } = await serviceClient
      .from("defense_applications")
      .update({
        chair_approval: chairApproval,
        status: "approved_by_chair",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId)
      .select("*, projects(id, title, student_id)")
      .single();

    if (updateErr || !updatedApp) {
      throw new Error(`Failed to approve application: ${updateErr?.message || "Unknown error"}`);
    }

    // Notify student owner
    const proj = (updatedApp as any).projects;
    if (proj?.student_id) {
      const { data: studentRecord } = await serviceClient
        .from("students")
        .select("profile_id")
        .eq("id", proj.student_id)
        .maybeSingle();

      const recipientProfileId = studentRecord?.profile_id || proj.student_id;

      await emitNotification({
        supabase: serviceClient,
        recipientProfileId: recipientProfileId,
        title: "Oral Defense Application Approved",
        message: `Your Application for Oral Defense for "${proj.title}" has been approved by the Department Chair / Coordinator.`,
        eventType: "document_approved",
        link: `/dashboard/my-project`,
      });
    }

    return { success: true, application: updatedApp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve defense application";
    console.error("[approveDefenseApplicationAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Retrieves the Defense Application for a project and optional stage
 */
export async function getProjectDefenseApplicationAction(
  projectId: string,
  stageId?: string
): Promise<{ success: boolean; application?: DefenseApplication | null; error?: string }> {
  try {
    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("defense_applications")
      .select("*")
      .eq("project_id", projectId);

    if (stageId) {
      query = query.eq("stage_id", stageId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { success: true, application: data || null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load defense application";
    console.error("[getProjectDefenseApplicationAction] Error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * 1-Click simplified application filing by the student proponent.
 * Marks the project application as submitted and ready for defense gating.
 */
export async function quickFileDefenseApplicationAction(input: {
  projectId: string;
  stageId: string;
  preferredDates?: Array<{ date: string; time?: string }>;
  notes?: string;
}): Promise<{ success: boolean; application?: DefenseApplication; error?: string }> {
  return submitDefenseApplicationAction({
    projectId: input.projectId,
    stageId: input.stageId,
    requirements: {
      accomplishment_report: true,
      documentation_chapters: true,
      presentation_files: true,
    },
    preferredDates: input.preferredDates,
    notes: input.notes,
  });
}

/**
 * Fast 1-click coordinator verification of the defense application gate.
 * Toggles status between "approved_by_chair" (verified) and "submitted_by_student" (pending).
 */
export async function toggleApplicationGateAction(input: {
  projectId: string;
  stageId: string;
  verified: boolean;
}): Promise<{ success: boolean; verified: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, verified: false, error: "Unauthorized. Please log in." };
    }

    const serviceClient = createServiceClient();

    // Check existing application
    const { data: existingApp } = await serviceClient
      .from("defense_applications")
      .select("id, status, form_code, requirements_checklist")
      .eq("project_id", input.projectId)
      .eq("stage_id", input.stageId)
      .maybeSingle();

    const targetStatus = input.verified ? "approved_by_chair" : "submitted_by_student";

    if (existingApp) {
      const { error: updateErr } = await serviceClient
        .from("defense_applications")
        .update({
          status: targetStatus,
          chair_approval: input.verified
            ? {
                approved_at: new Date().toISOString(),
                chair_name: "Coordinator / Chair Gate Verification",
                chair_id: user.id,
              }
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingApp.id);

      if (updateErr) throw updateErr;
    } else {
      // Create a verified application entry
      const { error: insertErr } = await serviceClient
        .from("defense_applications")
        .insert({
          project_id: input.projectId,
          stage_id: input.stageId,
          form_code: "DCS-CF-03",
          defense_type: "Oral Defense",
          requirements_checklist: {
            accomplishment_report: true,
            documentation_chapters: true,
            presentation_files: true,
          },
          status: targetStatus,
          chair_approval: input.verified
            ? {
                approved_at: new Date().toISOString(),
                chair_name: "Coordinator / Chair Gate Verification",
                chair_id: user.id,
              }
            : null,
        });

      if (insertErr) throw insertErr;
    }

    return { success: true, verified: input.verified };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle application gate";
    console.error("[toggleApplicationGateAction] Error:", msg);
    return { success: false, verified: false, error: msg };
  }
}

