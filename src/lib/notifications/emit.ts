"use server";

/**
 * AURORA Centralized Notification Dispatcher
 * Sprint 2E
 *
 * Single function: emitNotification()
 * All notification inserts across AURORA must use this dispatcher.
 * No module should duplicate notification INSERT logic.
 *
 * Design:
 * - Currently dispatches via Supabase `notifications` table (realtime)
 * - Architected to support Email, Push, SMS channels in the future
 *   by extending the `channels` parameter
 * - Never throws on notification failure (non-blocking)
 * - All events are typed via NotificationEvent enum
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Notification Event Types ─────────────────────────────────────────────────

export type NotificationEventType =
  // Document events
  | "document_uploaded"
  | "document_approved"
  | "document_rejected"
  | "document_returned"
  // Annotation events
  | "annotation_created"
  | "annotation_replied"
  | "annotation_resolved"
  // Schedule events
  | "defense_scheduled"
  | "defense_rescheduled"
  | "defense_cancelled"
  // Evaluation/grade events
  | "evaluation_submitted"
  | "final_verdict_released"
  | "grade_released"
  | "revision_required"
  // Signature/certificate events
  | "evaluation_signed"
  | "certificate_issued"
  // Membership events
  | "project_joined"
  | "panel_assigned"
  // System events
  | "system_announcement";

export interface EmitNotificationInput {
  /** Supabase client (server-side) */
  supabase: SupabaseClient;
  /** UUID of the recipient profile */
  recipientProfileId: string;
  /** Human-readable title (max 100 chars) */
  title: string;
  /** Full message body */
  message: string;
  /** Typed event category */
  eventType: NotificationEventType;
  /** Optional: link to navigate to on click */
  actionUrl?: string;
  /** Optional: additional structured data for the notification */
  metadata?: Record<string, unknown>;
}

/**
 * Emit a notification to a single recipient.
 *
 * This function is non-blocking: it will log errors internally but
 * never throw, ensuring notifications never interrupt primary workflows.
 *
 * Future channels (Email, Push, SMS) can be added here without
 * changing any call sites.
 */
export async function emitNotification(input: EmitNotificationInput): Promise<void> {
  const { supabase, recipientProfileId, title, message, eventType, actionUrl, metadata } = input;

  if (!recipientProfileId) {
    console.warn("[Notifications] Skipped: no recipientProfileId provided.", { title, eventType });
    return;
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        profile_id: recipientProfileId,
        title: title.slice(0, 100),  // Guard against oversized titles
        message,
        type: eventType,
        ...(actionUrl ? { action_url: actionUrl } : {}),
        ...(metadata ? { metadata } : {}),
      });

    if (error) {
      console.error("[Notifications] Failed to emit notification:", error.message, {
        recipientProfileId,
        eventType,
        title,
      });
    }
    // Future: await sendEmailNotification(...) or await sendPushNotification(...)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Notifications] Unexpected error:", msg);
  }
}

/**
 * Emit a notification to multiple recipients at once.
 * Each recipient gets an individual row (not a single multi-recipient row).
 */
export async function emitNotificationToMany(
  supabase: SupabaseClient,
  recipientProfileIds: string[],
  input: Omit<EmitNotificationInput, "supabase" | "recipientProfileId">
): Promise<void> {
  if (recipientProfileIds.length === 0) return;

  const rows = recipientProfileIds
    .filter(Boolean)
    .map((profileId) => ({
      profile_id: profileId,
      title: input.title.slice(0, 100),
      message: input.message,
      type: input.eventType,
      ...(input.actionUrl ? { action_url: input.actionUrl } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }));

  try {
    const { error } = await supabase
      .from("notifications")
      .insert(rows);

    if (error) {
      console.error("[Notifications] Failed to emit batch notifications:", error.message, {
        count: rows.length,
        eventType: input.eventType,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Notifications] Unexpected error in batch emit:", msg);
  }
}
