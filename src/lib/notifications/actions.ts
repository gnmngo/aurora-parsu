"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmailNotification } from "@/lib/notifications/email";

export interface NotificationPreferences {
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  notifyDefenseSchedule: boolean;
  notifySubmissions: boolean;
  notifyEvaluations: boolean;
  notifyComments: boolean;
}

/**
 * Retrieves the current notification preferences for the logged-in user.
 */
export async function getNotificationPreferencesAction(): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // Fetch profile for fallback email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata || {};
  const defaultEmail = metadata.notification_email || profile?.email || user.email || "";

  return {
    emailNotificationsEnabled: metadata.email_notifications_enabled !== false, // default true
    notificationEmail: defaultEmail,
    notifyDefenseSchedule: metadata.notify_defense_schedule !== false,
    notifySubmissions: metadata.notify_submissions !== false,
    notifyEvaluations: metadata.notify_evaluations !== false,
    notifyComments: metadata.notify_comments !== false,
  };
}

/**
 * Saves notification preferences to the user's account metadata.
 */
export async function saveNotificationPreferencesAction(
  prefs: NotificationPreferences
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const serviceClient = createServiceClient();
  const clientToUse = serviceClient || supabase;

  // Update user_metadata in Supabase Auth
  const { error: updateError } = await clientToUse.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      email_notifications_enabled: prefs.emailNotificationsEnabled,
      notification_email: prefs.notificationEmail.trim().toLowerCase(),
      notify_defense_schedule: prefs.notifyDefenseSchedule,
      notify_submissions: prefs.notifySubmissions,
      notify_evaluations: prefs.notifyEvaluations,
      notify_comments: prefs.notifyComments,
    },
  });

  if (updateError) {
    throw new Error(`Failed to save preferences: ${updateError.message}`);
  }

  return {
    success: true,
    message: "Notification preferences saved successfully.",
  };
}

/**
 * Sends a real-time test notification email to confirm direct inbox delivery.
 */
export async function sendTestNotificationEmailAction(
  targetEmail?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const recipientEmail = targetEmail?.trim() || profile?.email || user.email || "";
  const recipientName = profile ? `${profile.first_name} ${profile.last_name}` : "Stakeholder";

  if (!recipientEmail || !recipientEmail.includes("@")) {
    throw new Error("Invalid destination email address.");
  }

  const result = await sendEmailNotification(supabase, {
    to: recipientEmail,
    recipientName,
    title: "AURORA Direct Email Notification Test",
    message: `This is a verification alert confirming that your official institutional email (${recipientEmail}) is configured to receive automated academic defense notifications, scheduling updates, and panel evaluation remarks directly from AURORA.`,
    link: "/dashboard/notifications",
    eventType: "system_announcement",
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to dispatch test email.");
  }

  return {
    success: true,
    message: `Test email notification dispatched to ${recipientEmail}!`,
  };
}
