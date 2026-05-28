import { demoAlerts, demoAuditLogs, demoBuildings } from "@/lib/demo-data";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AlertItem, AuditLogItem } from "@/lib/types";

export async function getAlertItems(): Promise<AlertItem[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return demoAlerts;
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("id, severity, status, last_differential_f, started_at, buildings(name), alert_events(severity, message, created_at)")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("Unable to load alerts", error);
    return demoAlerts;
  }

  return data.map(mapAlertRow);
}

export async function getBuildingAlertItems(buildingId: string): Promise<AlertItem[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    const buildingName = demoBuildings.find((building) => building.id === buildingId)?.name;
    return buildingName ? demoAlerts.filter((alert) => alert.buildingName === buildingName) : [];
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("id, severity, status, last_differential_f, started_at, buildings(name), alert_events(severity, message, created_at)")
    .eq("building_id", buildingId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    console.error("Unable to load building alerts", error);
    return [];
  }

  return data.map(mapAlertRow);
}

export async function getAuditLogItems(): Promise<AuditLogItem[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return demoAuditLogs;
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, created_at, buildings(name)")
    .order("created_at", { ascending: false })
    .limit(75);

  if (error || !data) {
    console.error("Unable to load audit logs", error);
    return demoAuditLogs;
  }

  return data.map(mapAuditRow);
}

export async function getBuildingAuditLogItems(buildingId: string): Promise<AuditLogItem[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    const buildingName = demoBuildings.find((building) => building.id === buildingId)?.name;
    return buildingName ? demoAuditLogs.filter((item) => item.buildingName === buildingName) : [];
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, created_at, buildings(name)")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error("Unable to load building audit logs", error);
    return [];
  }

  return data.map(mapAuditRow);
}

function mapAlertRow(alert: any): AlertItem {
  const events = [...(alert.alert_events ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((event) => ({
      severity: event.severity,
      message: event.message,
      createdAt: formatDate(event.created_at)
    }));

  return {
    id: alert.id,
    buildingName: alert.buildings?.name ?? "Unknown building",
    severity: alert.severity,
    status: alert.status,
    message: events[0]?.message ?? "Temperature alert",
    differentialF: Number(alert.last_differential_f ?? 0),
    createdAt: formatDate(alert.started_at),
    events
  };
}

function mapAuditRow(item: any): AuditLogItem {
  return {
    id: item.id,
    actor: item.actor_user_id,
    buildingName: item.buildings?.name ?? "System",
    action: item.action,
    createdAt: formatDate(item.created_at)
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
