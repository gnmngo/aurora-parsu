/**
 * AURORA Workflow History Service
 * Sprint 2G
 *
 * Provides functions to record immutable workflow stage transitions.
 * Every call to this module produces an INSERT-only record in
 * `workflow_history`. No UPDATE or DELETE is ever performed.
 *
 * Design: This module is called by server actions that trigger
 * stage transitions. It does NOT replace existing transition logic —
 * it augments it with an audit record.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TransitionType = "automatic" | "manual" | "override" | "rollback" | "system";

export interface RecordWorkflowTransitionInput {
  projectId: string;
  fromStageId: string | null;
  toStageId: string | null;
  transitionedBy: string | null;
  performedByRole?: string;
  transitionType?: TransitionType;
  transitionReason?: string;
  oldStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Inserts an immutable record into `workflow_history`.
 *
 * This function is idempotent-safe: it will never throw on duplicate
 * keys or RLS violations — errors are silently logged so they do not
 * interrupt the primary workflow transition.
 *
 * @param supabase - Server-side Supabase client (uses service role or auth'd user)
 * @param input    - Transition details
 */
export async function recordWorkflowTransition(
  supabase: SupabaseClient,
  input: RecordWorkflowTransitionInput
): Promise<void> {
  try {
    const { error } = await supabase
      .from("workflow_history")
      .insert({
        project_id: input.projectId,
        from_stage_id: input.fromStageId ?? null,
        to_stage_id: input.toStageId ?? null,
        transitioned_by: input.transitionedBy ?? null,
        performed_by_role: input.performedByRole ?? null,
        transition_type: input.transitionType ?? "manual",
        transition_reason: input.transitionReason ?? null,
        old_status: input.oldStatus ?? null,
        new_status: input.newStatus ?? null,
        metadata: input.metadata ?? {},
      });

    if (error) {
      // Non-blocking: workflow history is an audit record, not a critical path.
      // Log the error but do not re-throw — the primary transition must succeed.
      console.error("[WorkflowHistory] Failed to record transition:", error.message, {
        projectId: input.projectId,
        fromStageId: input.fromStageId,
        toStageId: input.toStageId,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[WorkflowHistory] Unexpected error recording transition:", message);
  }
}

/**
 * Fetches the full transition history for a project, ordered by time descending.
 * Used by the project dashboard "Stage History" timeline.
 */
export async function getWorkflowHistory(
  supabase: SupabaseClient,
  projectId: string
): Promise<WorkflowHistoryRow[]> {
  const { data, error } = await supabase
    .from("workflow_history")
    .select(`
      id,
      project_id,
      from_stage_id,
      to_stage_id,
      transitioned_by,
      performed_by_role,
      transition_type,
      transition_reason,
      old_status,
      new_status,
      metadata,
      created_at,
      from_stage:defense_stages!from_stage_id ( name ),
      to_stage:defense_stages!to_stage_id ( name ),
      actor:profiles!transitioned_by ( first_name, last_name )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[WorkflowHistory] Failed to fetch history:", error.message);
    return [];
  }

  return (data as unknown as WorkflowHistoryRow[]) ?? [];
}

export interface WorkflowHistoryRow {
  id: string;
  project_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  transitioned_by: string | null;
  performed_by_role: string | null;
  transition_type: TransitionType;
  transition_reason: string | null;
  old_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  from_stage: { name: string } | null;
  to_stage: { name: string } | null;
  actor: { first_name: string; last_name: string } | null;
}
