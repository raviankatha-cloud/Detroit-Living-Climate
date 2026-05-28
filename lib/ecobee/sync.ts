import "server-only";
import { evaluateDifferentialAlerts } from "@/lib/alerts";
import {
  fetchEcobeeThermostatSummary,
  fetchEcobeeThermostats,
  type EcobeeThermostatPayload,
  type EcobeeThermostatSummary
} from "@/lib/ecobee/client";
import { evaluateBuildingRules } from "@/lib/rules";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const ECOBEE_BATCH_SIZE = 8;
const FULL_SYNC_MAX_AGE_MS = 15 * 60 * 1000;

type ThermostatMapping = {
  id: string;
  building_id: string;
  ecobee_thermostat_id: string | null;
  external_device_id: string | null;
  sensors?: Array<{ id: string; ecobee_sensor_id: string | null; external_device_id: string | null }>;
};

export async function syncEcobeePortfolio({ force = false } = {}) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: syncRun } = await supabase
    .from("sync_runs")
    .insert({ provider: "ecobee", status: "running" })
    .select("id")
    .single();

  try {
    const [{ data: mappings, error: mappingError }, summary] = await Promise.all([
      supabase
        .from("thermostats")
        .select("id, building_id, ecobee_thermostat_id, external_device_id, sensors(id, ecobee_sensor_id, external_device_id)")
        .or("ecobee_thermostat_id.not.is.null,external_device_id.not.is.null")
        .order("created_at"),
      fetchEcobeeThermostatSummary()
    ]);

    if (mappingError) {
      throw mappingError;
    }

    const thermostatMappings = (mappings ?? []) as ThermostatMapping[];
    const mappingByIdentifier = createMappingByIdentifier(thermostatMappings);
    const summariesByIdentifier = new Map(summary.map((item) => [item.identifier, item]));

    const identifiersToFetch = await getThermostatsNeedingFullSync({
      force,
      summary,
      mappingByIdentifier
    });

    await upsertSummaryCursors(summary, mappingByIdentifier);
    await updateDisconnectedThermostats(summary, mappingByIdentifier);
    let thermostatsSynced = 0;
    let sensorsSynced = 0;

    for (const batch of chunk(identifiersToFetch, ECOBEE_BATCH_SIZE)) {
      const remoteThermostats = await fetchEcobeeThermostats(batch);

      for (const remote of remoteThermostats) {
        const mapping = mappingByIdentifier.get(remote.identifier);
        const summaryRow = summariesByIdentifier.get(remote.identifier);

        if (!mapping) {
          continue;
        }

        await syncThermostatSnapshot(mapping, remote, summaryRow);
        await markCursorFullSync(remote.identifier);
        thermostatsSynced += 1;
        sensorsSynced += await syncRemoteSensors(mapping, remote);
      }
    }

    const alertResult = await evaluateDifferentialAlerts();
    const ruleResult = await evaluateBuildingRules();

    await supabase
      .from("sync_runs")
      .update({
        status: "success",
        buildings_checked: thermostatMappings.length,
        thermostats_synced: thermostatsSynced,
        sensors_synced: sensorsSynced,
        message: `ecobee sync completed. ${identifiersToFetch.length} thermostat detail fetches. Alerts: ${
          "eventsCreated" in alertResult ? alertResult.eventsCreated : 0
        }. Mild-day applied: ${"applied" in ruleResult ? ruleResult.applied : 0}.`,
        finished_at: new Date().toISOString()
      })
      .eq("id", syncRun?.id);

    return {
      ok: true,
      buildingsChecked: thermostatMappings.length,
      thermostatsSynced,
      sensorsSynced,
      thermostatDetailFetches: identifiersToFetch.length,
      alerts: alertResult,
      mildDayRules: ruleResult
    };
  } catch (error) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown sync failure.",
        finished_at: new Date().toISOString()
      })
      .eq("id", syncRun?.id);

    return { ok: false, message: error instanceof Error ? error.message : "Unknown sync failure." };
  }
}

function createMappingByIdentifier(mappings: ThermostatMapping[]) {
  const mappingByIdentifier = new Map<string, ThermostatMapping>();

  for (const mapping of mappings) {
    for (const identifier of [mapping.ecobee_thermostat_id, mapping.external_device_id]) {
      if (identifier) {
        mappingByIdentifier.set(identifier, mapping);
      }
    }
  }

  return mappingByIdentifier;
}

async function upsertSummaryCursors(
  summary: EcobeeThermostatSummary[],
  mappingByIdentifier: Map<string, ThermostatMapping>
) {
  const supabase = createServiceSupabaseClient();

  if (!supabase || summary.length === 0) {
    return;
  }

  await supabase.from("ecobee_sync_cursors").upsert(
    summary.map((item) => {
      const mapping = mappingByIdentifier.get(item.identifier);

      return {
        thermostat_identifier: item.identifier,
        thermostat_id: mapping?.id ?? null,
        building_id: mapping?.building_id ?? null,
        connected: item.connected,
        thermostat_revision: item.thermostatRevision,
        alerts_revision: item.alertsRevision,
        runtime_revision: item.runtimeRevision,
        interval_revision: item.intervalRevision,
        equipment_status: item.equipmentStatus ?? "",
        last_summary_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }),
    { onConflict: "thermostat_identifier" }
  );

  await supabase.from("ecobee_device_discoveries").upsert(
    summary.map((item) => {
      const mapping = mappingByIdentifier.get(item.identifier);

      return {
        thermostat_identifier: item.identifier,
        thermostat_id: mapping?.id ?? null,
        building_id: mapping?.building_id ?? null,
        device_type: "thermostat",
        external_id: item.identifier,
        display_name: item.name || item.identifier,
        payload: item,
        last_seen_at: new Date().toISOString()
      };
    }),
    { onConflict: "thermostat_identifier,device_type,external_id" }
  );
}

async function updateDisconnectedThermostats(
  summary: EcobeeThermostatSummary[],
  mappingByIdentifier: Map<string, ThermostatMapping>
) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  for (const item of summary) {
    if (item.connected) {
      continue;
    }

    const mapping = mappingByIdentifier.get(item.identifier);

    if (!mapping) {
      continue;
    }

    await supabase
      .from("thermostats")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "offline",
        metadata: { ecobeeName: item.name, equipmentStatus: item.equipmentStatus ?? "" }
      })
      .eq("id", mapping.id);
  }
}

async function getThermostatsNeedingFullSync({
  force,
  summary,
  mappingByIdentifier
}: {
  force: boolean;
  summary: EcobeeThermostatSummary[];
  mappingByIdentifier: Map<string, ThermostatMapping>;
}) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return [];
  }

  const identifiers = summary
    .filter((item) => item.connected && mappingByIdentifier.has(item.identifier))
    .map((item) => item.identifier);

  if (force) {
    return identifiers;
  }

  const { data: cursors } = await supabase
    .from("ecobee_sync_cursors")
    .select("thermostat_identifier, runtime_revision, interval_revision, thermostat_revision, last_full_sync_at")
    .in("thermostat_identifier", identifiers);
  const cursorByIdentifier = new Map((cursors ?? []).map((cursor) => [cursor.thermostat_identifier, cursor]));

  return identifiers.filter((identifier) => {
    const item = summary.find((row) => row.identifier === identifier);
    const cursor = cursorByIdentifier.get(identifier);

    if (!item || !cursor?.last_full_sync_at) {
      return true;
    }

    const detailIsOld = Date.now() - new Date(cursor.last_full_sync_at).getTime() > FULL_SYNC_MAX_AGE_MS;
    const runtimeChanged = cursor.runtime_revision !== item.runtimeRevision;
    const intervalChanged = cursor.interval_revision !== item.intervalRevision;
    const thermostatChanged = cursor.thermostat_revision !== item.thermostatRevision;

    return detailIsOld || runtimeChanged || intervalChanged || thermostatChanged;
  });
}

async function markCursorFullSync(thermostatIdentifier: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("ecobee_sync_cursors")
    .update({
      last_full_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("thermostat_identifier", thermostatIdentifier);
}

async function syncThermostatSnapshot(
  mapping: ThermostatMapping,
  remote: EcobeeThermostatPayload,
  summary?: EcobeeThermostatSummary
) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  const recordedAt = getRuntimeRecordedAt(remote) ?? new Date().toISOString();
  const heatSetpointF = tenthsToF(remote.runtime?.desiredHeat);
  const thermostatTemperatureF = tenthsToF(remote.runtime?.actualTemperature);

  await supabase
    .from("thermostats")
    .update({
      name: remote.name ?? summary?.name ?? undefined,
      ecobee_thermostat_id: remote.identifier,
      external_device_id: remote.identifier,
      last_reported_at: recordedAt,
      last_synced_at: new Date().toISOString(),
      last_sync_status: summary?.connected === false ? "offline" : "online",
      setup_status: "complete",
      metadata: {
        hvacMode: remote.settings?.hvacMode,
        equipmentStatus: summary?.equipmentStatus ?? remote.equipmentStatus ?? "",
        ecobeeName: remote.name ?? summary?.name
      }
    })
    .eq("id", mapping.id);

  if (heatSetpointF === null || thermostatTemperatureF === null) {
    return;
  }

  await supabase.from("thermostat_snapshots").insert({
    thermostat_id: mapping.id,
    building_id: mapping.building_id,
    heat_setpoint_f: heatSetpointF,
    thermostat_temperature_f: thermostatTemperatureF,
    outdoor_temperature_f: tenthsToF(remote.weather?.forecasts?.[0]?.temperature),
    equipment_status: summary?.equipmentStatus ?? remote.equipmentStatus ?? remote.settings?.hvacMode ?? null,
    connected: summary?.connected ?? remote.runtime?.connected ?? true,
    recorded_at: recordedAt
  });
}

async function syncRemoteSensors(mapping: ThermostatMapping, remote: EcobeeThermostatPayload) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return 0;
  }

  let synced = 0;

  for (const remoteSensor of remote.remoteSensors ?? []) {
    const sensorMapping = mapping.sensors?.find(
      (sensor) => sensor.ecobee_sensor_id === remoteSensor.id || sensor.external_device_id === remoteSensor.id
    );

    await upsertDiscoveredSensor(mapping, remote.identifier, remoteSensor, sensorMapping?.id);

    if (!sensorMapping) {
      continue;
    }

    const temperature = getSensorCapability(remoteSensor, "temperature");
    const occupancy = getSensorCapability(remoteSensor, "occupancy");
    const temperatureF = tenthsToF(temperature);

    await supabase
      .from("sensors")
      .update({
        name: remoteSensor.name ?? undefined,
        ecobee_sensor_id: remoteSensor.id,
        external_device_id: remoteSensor.id,
        last_reported_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        setup_status: "complete",
        metadata: { ecobeeName: remoteSensor.name }
      })
      .eq("id", sensorMapping.id);

    if (temperatureF !== null) {
      await supabase.from("sensor_readings").insert({
        sensor_id: sensorMapping.id,
        temperature_f: temperatureF,
        occupancy: normalizeOccupancy(occupancy),
        recorded_at: new Date().toISOString()
      });
      synced += 1;
    }
  }

  return synced;
}

async function upsertDiscoveredSensor(
  mapping: ThermostatMapping,
  thermostatIdentifier: string,
  remoteSensor: NonNullable<EcobeeThermostatPayload["remoteSensors"]>[number],
  mappedSensorId?: string
) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("ecobee_device_discoveries").upsert(
    {
      thermostat_identifier: thermostatIdentifier,
      thermostat_id: mapping.id,
      building_id: mapping.building_id,
      device_type: "remote_sensor",
      external_id: remoteSensor.id,
      display_name: remoteSensor.name ?? null,
      payload: remoteSensor,
      mapped_sensor_id: mappedSensorId ?? null,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "thermostat_identifier,device_type,external_id" }
  );
}

function getRuntimeRecordedAt(remote: EcobeeThermostatPayload) {
  if (remote.runtime?.lastStatusModified) {
    return new Date(remote.runtime.lastStatusModified).toISOString();
  }

  if (remote.runtime?.runtimeDate && typeof remote.runtime.runtimeInterval === "number") {
    const [year, month, day] = remote.runtime.runtimeDate.split("-").map(Number);
    const minutes = remote.runtime.runtimeInterval * 5;
    return new Date(Date.UTC(year, month - 1, day, 0, minutes)).toISOString();
  }

  return null;
}

function getSensorCapability(sensor: NonNullable<EcobeeThermostatPayload["remoteSensors"]>[number], type: string) {
  return sensor.capability?.find((capability) => capability.type === type)?.value ?? null;
}

function normalizeOccupancy(value: string | null) {
  if (value === null) {
    return null;
  }

  return value === "true" || value === "occupied" ? "occupied" : "unoccupied";
}

function tenthsToF(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 10 : null;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
