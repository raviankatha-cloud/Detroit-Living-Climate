import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type NotificationPreference = {
  emailEnabled: boolean;
  webPushEnabled: boolean;
  warningEnabled: boolean;
  criticalEnabled: boolean;
  escalationEnabled: boolean;
  recoveryEnabled: boolean;
};

export const defaultNotificationPreference: NotificationPreference = {
  emailEnabled: true,
  webPushEnabled: true,
  warningEnabled: true,
  criticalEnabled: true,
  escalationEnabled: true,
  recoveryEnabled: true
};

export async function getCurrentUserNotificationPreference(): Promise<NotificationPreference> {
  const { userId } = await auth();
  const supabase = createServiceSupabaseClient();

  if (!supabase || !userId) {
    return defaultNotificationPreference;
  }

  const { data } = await supabase
    .from("notification_preferences")
    .select("email_enabled, web_push_enabled, warning_enabled, critical_enabled, escalation_enabled, recovery_enabled")
    .eq("clerk_user_id", userId)
    .is("building_id", null)
    .maybeSingle();

  if (!data) {
    return defaultNotificationPreference;
  }

  return {
    emailEnabled: data.email_enabled,
    webPushEnabled: data.web_push_enabled,
    warningEnabled: data.warning_enabled,
    criticalEnabled: data.critical_enabled,
    escalationEnabled: data.escalation_enabled,
    recoveryEnabled: data.recovery_enabled
  };
}
