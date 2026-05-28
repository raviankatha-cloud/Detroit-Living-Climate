import "server-only";
import { logAuditEvent } from "@/lib/audit";
import { setThermostatHold } from "@/lib/ecobee/client";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type MildDayRuleInput = {
  buildingId: string;
  enabled: boolean;
  outdoorTemperatureF: number | null;
  currentHeatSetpointF: number;
  outdoorThresholdF?: number;
  reductionF?: number;
  minimumHeatSetpointF?: number;
  heatingWorkflow: boolean;
};

export async function applyMildDayRule(input: MildDayRuleInput) {
  const threshold = input.outdoorThresholdF ?? 65;
  const reduction = input.reductionF ?? 2;
  const minimumHeatSetpoint = input.minimumHeatSetpointF ?? 55;

  if (!input.enabled || !input.heatingWorkflow || input.outdoorTemperatureF === null || input.outdoorTemperatureF <= threshold) {
    return { applied: false, reason: "conditions_not_met" };
  }

  const newSetpoint = Math.max(minimumHeatSetpoint, input.currentHeatSetpointF - reduction);

  if (newSetpoint >= input.currentHeatSetpointF) {
    return { applied: false, reason: "minimum_setpoint_reached" };
  }

  await setThermostatHold({ buildingId: input.buildingId, heatSetpointF: newSetpoint });
  await logAuditEvent({
    actorUserId: "system",
    buildingId: input.buildingId,
    action: "automation.mild_day_setpoint_reduction",
    metadata: {
      previousSetpoint: input.currentHeatSetpointF,
      newSetpoint,
      outdoorTemperatureF: input.outdoorTemperatureF,
      threshold,
      reduction,
      minimumHeatSetpoint
    }
  });

  return { applied: true, newSetpoint };
}

export async function evaluateBuildingRules() {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: rules, error } = await supabase
    .from("building_rules")
    .select("building_id, mild_day_enabled, mild_day_outdoor_threshold_f, mild_day_setpoint_reduction_f, minimum_heat_setpoint_f")
    .eq("mild_day_enabled", true);

  if (error) {
    return { ok: false, message: error.message };
  }

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const rule of rules ?? []) {
    try {
      const { data: snapshot } = await supabase
        .from("latest_thermostat_snapshots")
        .select("thermostat_id, heat_setpoint_f, outdoor_temperature_f, recorded_at, connected, equipment_status")
        .eq("building_id", rule.building_id)
        .maybeSingle();

      if (!snapshot || isStale(snapshot.recorded_at) || snapshot.connected === false) {
        skipped += 1;
        continue;
      }

      if (await wasMildDayRuleAppliedRecently(rule.building_id)) {
        skipped += 1;
        continue;
      }

      const heatingWorkflow = await isHeatingWorkflow(snapshot.thermostat_id, snapshot.equipment_status);
      const result = await applyMildDayRule({
        buildingId: rule.building_id,
        enabled: rule.mild_day_enabled,
        outdoorTemperatureF: snapshot.outdoor_temperature_f === null ? null : Number(snapshot.outdoor_temperature_f),
        currentHeatSetpointF: Number(snapshot.heat_setpoint_f),
        outdoorThresholdF: Number(rule.mild_day_outdoor_threshold_f),
        reductionF: Number(rule.mild_day_setpoint_reduction_f),
        minimumHeatSetpointF: Number(rule.minimum_heat_setpoint_f),
        heatingWorkflow
      });

      if (result.applied) {
        applied += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      await logAuditEvent({
        actorUserId: "system",
        buildingId: rule.building_id,
        action: "automation.mild_day_failed",
        metadata: { error: error instanceof Error ? error.message : "Unknown mild-day automation failure" }
      });
    }
  }

  return { ok: failed === 0, applied, skipped, failed };
}

async function isHeatingWorkflow(thermostatId: string, equipmentStatus?: string | null) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data: thermostat } = await supabase.from("thermostats").select("metadata").eq("id", thermostatId).maybeSingle();
  const hvacMode = String((thermostat?.metadata as { hvacMode?: string } | null)?.hvacMode ?? "").toLowerCase();
  const equipment = String(equipmentStatus ?? "").toLowerCase();

  if (hvacMode === "off" || hvacMode === "cool") {
    return false;
  }

  return hvacMode === "heat" || hvacMode === "auto" || equipment.includes("heat") || hvacMode === "";
}

async function wasMildDayRuleAppliedRecently(buildingId: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("building_id", buildingId)
    .eq("action", "automation.mild_day_setpoint_reduction")
    .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  return Boolean(data);
}

function isStale(recordedAt: string) {
  return Date.now() - new Date(recordedAt).getTime() > 45 * 60 * 1000;
}
