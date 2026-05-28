import "server-only";
import { logAuditEvent } from "@/lib/audit";
import { dispatchAlertNotification } from "@/lib/notifications";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AlertSeverity } from "@/lib/types";

const WARNING_DIFFERENTIAL_F = 2;
const WARNING_DURATION_MINUTES = 10;
const CRITICAL_DIFFERENTIAL_F = 3;
const CRITICAL_DURATION_MINUTES = 20;
const RECOVERY_DIFFERENTIAL_F = 1;
const MATERIAL_WORSENING_F = 0.5;
const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
const LOOKBACK_HOURS = 3;

type DifferentialState = {
  differentialF: number;
  warningSince: Date | null;
  criticalSince: Date | null;
  activeSeverity?: AlertSeverity;
};

type NotificationReason = "severity_change" | "material_worsening" | "hourly_reminder";

export function classifyDifferentialAlert(state: DifferentialState, now = new Date()): AlertSeverity | null {
  if (state.differentialF < RECOVERY_DIFFERENTIAL_F) {
    return state.activeSeverity ? "recovered" : null;
  }

  let computedSeverity: AlertSeverity | null = null;

  if (state.criticalSince && elapsedMinutes(state.criticalSince, now) >= CRITICAL_DURATION_MINUTES) {
    computedSeverity = "critical";
  } else if (state.warningSince && elapsedMinutes(state.warningSince, now) >= WARNING_DURATION_MINUTES) {
    computedSeverity = "warning";
  }

  if (state.activeSeverity === "critical" && computedSeverity === "warning") {
    return "critical";
  }

  return computedSeverity;
}

export async function evaluateDifferentialAlerts() {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: snapshots, error } = await supabase
    .from("latest_thermostat_snapshots")
    .select("building_id, thermostat_id, heat_setpoint_f, thermostat_temperature_f, differential_f, recorded_at");

  if (error) {
    return { ok: false, message: error.message };
  }

  let eventsCreated = 0;

  for (const snapshot of snapshots ?? []) {
    const differentialF = Number(snapshot.differential_f);

    if (!Number.isFinite(differentialF)) {
      continue;
    }

    const { data: activeAlert } = await supabase
      .from("alerts")
      .select("id, severity, started_at, last_differential_f, last_notified_at")
      .eq("building_id", snapshot.building_id)
      .eq("alert_key", "heat_differential")
      .eq("status", "active")
      .maybeSingle();

    if (differentialF < RECOVERY_DIFFERENTIAL_F) {
      if (activeAlert) {
        await recoverAlert(activeAlert, snapshot);
        eventsCreated += 1;
      }
      continue;
    }

    const thresholdState = await getThresholdState(snapshot.building_id);
    const severity = classifyDifferentialAlert({
      differentialF,
      warningSince: thresholdState.warningSince,
      criticalSince: thresholdState.criticalSince,
      activeSeverity: activeAlert?.severity
    });

    if (!severity || severity === "recovered") {
      continue;
    }

    if (!activeAlert) {
      await createAlert(snapshot, severity, thresholdState.startedAt ?? new Date(snapshot.recorded_at));
      eventsCreated += 1;
      continue;
    }

    const reason = getNotificationReason(activeAlert, severity, differentialF);

    if (reason) {
      await updateAlert(activeAlert, snapshot, severity, reason);
      eventsCreated += 1;
    }
  }

  return { ok: true, eventsCreated };
}

async function getThresholdState(buildingId: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return { warningSince: null, criticalSince: null, startedAt: null };
  }

  const { data } = await supabase
    .from("thermostat_snapshots")
    .select("differential_f, recorded_at")
    .eq("building_id", buildingId)
    .gte("recorded_at", new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString())
    .order("recorded_at", { ascending: false });

  return {
    warningSince: findContinuousThresholdStart(data ?? [], WARNING_DIFFERENTIAL_F),
    criticalSince: findContinuousThresholdStart(data ?? [], CRITICAL_DIFFERENTIAL_F),
    startedAt: findContinuousThresholdStart(data ?? [], RECOVERY_DIFFERENTIAL_F)
  };
}

function findContinuousThresholdStart(snapshots: Array<{ differential_f: number | string; recorded_at: string }>, threshold: number) {
  let earliest: Date | null = null;

  for (const snapshot of snapshots) {
    if (Number(snapshot.differential_f) < threshold) {
      break;
    }

    earliest = new Date(snapshot.recorded_at);
  }

  return earliest;
}

async function createAlert(snapshot: any, severity: AlertSeverity, startedAt: Date) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const differentialF = Number(snapshot.differential_f);
  const message = formatAlertMessage(severity, differentialF);
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      building_id: snapshot.building_id,
      thermostat_id: snapshot.thermostat_id,
      severity,
      status: "active",
      alert_key: "heat_differential",
      last_differential_f: snapshot.differential_f,
      last_notified_at: new Date().toISOString(),
      started_at: startedAt.toISOString(),
      last_event_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !alert) {
    return;
  }

  await createAlertEvent(alert.id, snapshot.building_id, severity, message, differentialF, ["in_app", "email", "web_push"]);
  await logAuditEvent({
    actorUserId: "system",
    buildingId: snapshot.building_id,
    action: `alert.${severity}.created`,
    metadata: { differentialF, startedAt: startedAt.toISOString() }
  });
}

async function updateAlert(activeAlert: any, snapshot: any, severity: AlertSeverity, reason: NotificationReason) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const differentialF = Number(snapshot.differential_f);
  const eventSeverity: AlertSeverity = reason === "material_worsening" ? "escalation" : severity;
  const message = formatAlertMessage(eventSeverity, differentialF, reason);

  await supabase
    .from("alerts")
    .update({
      severity,
      last_differential_f: snapshot.differential_f,
      last_notified_at: new Date().toISOString(),
      last_event_at: new Date().toISOString()
    })
    .eq("id", activeAlert.id);

  await createAlertEvent(activeAlert.id, snapshot.building_id, eventSeverity, message, differentialF, [
    "in_app",
    "email",
    "web_push"
  ]);
  await logAuditEvent({
    actorUserId: "system",
    buildingId: snapshot.building_id,
    action: `alert.${eventSeverity}`,
    metadata: { differentialF, reason, previousSeverity: activeAlert.severity, currentSeverity: severity }
  });
}

async function recoverAlert(activeAlert: any, snapshot: any) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const differentialF = Number(snapshot.differential_f);

  await supabase
    .from("alerts")
    .update({
      severity: "recovered",
      status: "recovered",
      recovered_at: new Date().toISOString(),
      last_differential_f: snapshot.differential_f,
      last_notified_at: new Date().toISOString(),
      last_event_at: new Date().toISOString()
    })
    .eq("id", activeAlert.id);

  await createAlertEvent(
    activeAlert.id,
    snapshot.building_id,
    "recovered",
    "Recovery: temperature differential dropped below 1.0F.",
    differentialF,
    ["in_app", "email", "web_push"]
  );
  await logAuditEvent({
    actorUserId: "system",
    buildingId: snapshot.building_id,
    action: "alert.recovered",
    metadata: { differentialF }
  });
}

async function createAlertEvent(
  alertId: string,
  buildingId: string,
  severity: AlertSeverity,
  message: string,
  differentialF: number,
  channels: Array<"in_app" | "email" | "web_push">
) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("alert_events").insert({
    alert_id: alertId,
    severity,
    message,
    channels
  });
  await dispatchAlertNotification({ alertId, buildingId, severity, message, channels, differentialF });
}

function getNotificationReason(activeAlert: any, severity: AlertSeverity, differentialF: number): NotificationReason | null {
  const lastDifferential = Number(activeAlert.last_differential_f ?? 0);
  const lastNotifiedAt = activeAlert.last_notified_at ? new Date(activeAlert.last_notified_at).getTime() : 0;

  if (activeAlert.severity !== severity) {
    return "severity_change";
  }

  if (differentialF - lastDifferential >= MATERIAL_WORSENING_F) {
    return "material_worsening";
  }

  if (Date.now() - lastNotifiedAt >= REMINDER_INTERVAL_MS) {
    return "hourly_reminder";
  }

  return null;
}

function formatAlertMessage(severity: AlertSeverity, differentialF: number, reason?: NotificationReason) {
  if (severity === "recovered") {
    return "Recovery: temperature differential dropped below 1.0F.";
  }

  if (severity === "escalation") {
    return `Escalation: heat differential worsened to ${differentialF.toFixed(1)}F below setpoint.`;
  }

  if (reason === "hourly_reminder") {
    return `${severity === "critical" ? "Critical" : "Warning"} reminder: thermostat remains ${differentialF.toFixed(1)}F below setpoint.`;
  }

  if (severity === "critical") {
    return `Critical heat differential: thermostat is ${differentialF.toFixed(1)}F below setpoint for at least 20 minutes.`;
  }

  return `Warning heat differential: thermostat is ${differentialF.toFixed(1)}F below setpoint for at least 10 minutes.`;
}

function elapsedMinutes(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / 60000;
}
