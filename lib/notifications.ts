import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AlertSeverity } from "@/lib/types";

type NotificationChannel = "in_app" | "email" | "web_push";

type AlertNotification = {
  alertId: string;
  buildingId: string;
  severity: AlertSeverity;
  message: string;
  channels: NotificationChannel[];
  differentialF?: number;
};

type NotificationRecipient = {
  clerkUserId: string;
  role: string;
  emailEnabled: boolean;
  webPushEnabled: boolean;
};

type PreferenceRow = {
  clerk_user_id: string;
  building_id: string | null;
  email_enabled: boolean;
  web_push_enabled: boolean;
  warning_enabled: boolean;
  critical_enabled: boolean;
  escalation_enabled: boolean;
  recovery_enabled: boolean;
};

export async function dispatchAlertNotification(notification: AlertNotification) {
  const recipients = await getNotificationRecipients(notification.buildingId, notification.severity);
  const channels = notification.channels.filter((channel) => {
    if (channel === "email") {
      return recipients.some((recipient) => recipient.emailEnabled);
    }

    if (channel === "web_push") {
      return recipients.some((recipient) => recipient.webPushEnabled);
    }

    return true;
  });

  const deliveries = await Promise.allSettled(
    channels.map(async (channel) => {
      if (channel === "in_app") {
        return { channel, delivered: true };
      }

      if (channel === "email") {
        return sendEmailAlert(notification, recipients.filter((recipient) => recipient.emailEnabled));
      }

      return sendWebPushAlert(notification, recipients.filter((recipient) => recipient.webPushEnabled));
    })
  );

  return deliveries;
}

async function getNotificationRecipients(buildingId: string, severity: AlertSeverity): Promise<NotificationRecipient[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return [];
  }

  const [{ data: buildingAccess }, { data: globalAccess }] = await Promise.all([
    supabase.from("user_building_access").select("clerk_user_id, role").eq("building_id", buildingId),
    supabase.from("user_building_access").select("clerk_user_id, role").is("building_id", null)
  ]);
  const accessRows = [...(buildingAccess ?? []), ...(globalAccess ?? [])];
  const accessByUser = new Map<string, { clerk_user_id: string; role: string }>();

  for (const row of accessRows) {
    const existing = accessByUser.get(row.clerk_user_id);

    if (!existing || existing.role !== "super_admin") {
      accessByUser.set(row.clerk_user_id, row);
    }
  }

  const userIds = [...accessByUser.keys()];

  if (userIds.length === 0) {
    return [];
  }

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select(
      "clerk_user_id, building_id, email_enabled, web_push_enabled, warning_enabled, critical_enabled, escalation_enabled, recovery_enabled"
    )
    .in("clerk_user_id", userIds);
  const preferenceByUser = new Map<string, PreferenceRow[]>();

  for (const preference of (preferences ?? []) as PreferenceRow[]) {
    preferenceByUser.set(preference.clerk_user_id, [
      ...(preferenceByUser.get(preference.clerk_user_id) ?? []),
      preference
    ]);
  }

  return userIds.flatMap((clerkUserId) => {
    const access = accessByUser.get(clerkUserId);
    const preference = getEffectivePreference(preferenceByUser.get(clerkUserId) ?? [], buildingId);

    if (!isSeverityEnabled(preference, severity)) {
      return [];
    }

    return [
      {
        clerkUserId,
        role: access?.role ?? "read_only",
        emailEnabled: preference?.email_enabled ?? true,
        webPushEnabled: preference?.web_push_enabled ?? true
      }
    ];
  });
}

function getEffectivePreference(preferences: PreferenceRow[], buildingId: string) {
  return preferences.find((preference) => preference.building_id === buildingId) ??
    preferences.find((preference) => preference.building_id === null) ??
    null;
}

function isSeverityEnabled(preference: PreferenceRow | null, severity: AlertSeverity) {
  if (!preference) {
    return true;
  }

  if (severity === "warning") {
    return preference.warning_enabled;
  }

  if (severity === "critical") {
    return preference.critical_enabled;
  }

  if (severity === "escalation") {
    return preference.escalation_enabled;
  }

  return preference.recovery_enabled;
}

async function sendEmailAlert(notification: AlertNotification, recipients: NotificationRecipient[]) {
  const webhookUrl = process.env.EMAIL_ALERT_WEBHOOK_URL;
  const payload = {
    ...notification,
    from: process.env.EMAIL_ALERT_FROM,
    recipients: recipients.map((recipient) => ({
      clerkUserId: recipient.clerkUserId,
      role: recipient.role
    }))
  };

  if (!webhookUrl) {
    console.info("Demo email alert", payload);
    return { channel: "email", delivered: false, demo: true, recipientCount: recipients.length };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Email alert webhook failed: ${response.status}`);
  }

  return { channel: "email", delivered: true, recipientCount: recipients.length };
}

async function sendWebPushAlert(notification: AlertNotification, recipients: NotificationRecipient[]) {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const webhookUrl = process.env.WEB_PUSH_WEBHOOK_URL;

  if (!publicKey || !privateKey) {
    console.info("Demo web push alert", notification);
    return { channel: "web_push", delivered: false, demo: true };
  }

  const supabase = createServiceSupabaseClient();
  const recipientIds = recipients.map((recipient) => recipient.clerkUserId);
  const { data: subscriptions } =
    supabase && recipientIds.length > 0
      ? await supabase.from("web_push_subscriptions").select("endpoint, p256dh, auth, clerk_user_id").in("clerk_user_id", recipientIds)
      : { data: [] };

  if (!webhookUrl) {
    console.info("Web push subscriptions ready; configure WEB_PUSH_WEBHOOK_URL or add direct VAPID sender.", {
      notification,
      subscriptionCount: subscriptions?.length ?? 0
    });
    return { channel: "web_push", delivered: false, subscriptionCount: subscriptions?.length ?? 0 };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notification, subscriptions, publicKey })
  });

  if (!response.ok) {
    throw new Error(`Web push webhook failed: ${response.status}`);
  }

  return { channel: "web_push", delivered: true, subscriptionCount: subscriptions?.length ?? 0 };
}
