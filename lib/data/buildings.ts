import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { canViewBuilding, getUserRole } from "@/lib/auth/permissions";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { BuildingDetail, BuildingSummary, ConnectionStatus, SensorDetail } from "@/lib/types";

export async function getAccessibleBuildings(): Promise<BuildingSummary[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return [];
  }

  const clerkReady = isClerkConfigured();
  const { userId } = clerkReady ? await auth() : { userId: null };
  // null = no filter (super_admin or Clerk off → all buildings)
  const buildingIds = userId ? await getAccessibleBuildingIds(userId) : null;

  if (buildingIds && buildingIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("buildings")
    .select("id, name, address, notes, setup_status, wifi_status, thermostat_install_status, sensor_install_status, thermostats(id, name, ecobee_thermostat_id, external_device_id, serial_number, reference_label, location_label, device_reference, installation_notes, setup_status, connection_status, linked_ecobee_account, last_reported_at, last_synced_at, last_sync_status), alerts(id, status)")
    .is("archived_at", null)
    .order("name");

  if (buildingIds) {
    query = query.in("id", buildingIds);
  }

  const { data: buildings, error } = await query;

  if (error || !buildings) {
    console.error("[buildings] Unable to load buildings:", error?.message ?? error);
    return [];
  }

  const ids = buildings.map((building) => building.id);
  const snapshots = await getLatestSnapshots(ids);
  const averages = await getBuildingAverages(ids);
  const floorAverages = await getFloorAverages(ids);

  return buildings.map((building) =>
    mapBuildingRow({
      ...building,
      latestSnapshot: snapshots.get(building.id),
      buildingAverage: averages.get(building.id),
      floorAverages: floorAverages.get(building.id) ?? []
    })
  );
}

export async function getAccessibleBuildingDetails(): Promise<BuildingDetail[]> {
  const summaries = await getAccessibleBuildings();
  const details = await Promise.all(summaries.map((building) => getBuildingDetail(building.id)));
  return details.filter((building): building is BuildingDetail => Boolean(building));
}

export async function getBuildingDetail(buildingId: string): Promise<BuildingDetail | null> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return null;
  }

  const clerkReady = isClerkConfigured();
  const { userId } = clerkReady ? await auth() : { userId: null };

  // Only enforce access control when Clerk is active and we have a real userId
  if (userId && !(await canViewBuilding(userId, buildingId))) {
    return null;
  }

  const { data: building, error } = await supabase
    .from("buildings")
    .select(
      "id, name, address, notes, setup_status, wifi_status, thermostat_install_status, sensor_install_status, floors(id, name, sort_order), units(id, unit_number, unit_label, floors(name)), thermostats(id, name, ecobee_thermostat_id, external_device_id, serial_number, reference_label, location_label, device_reference, installation_notes, setup_status, connection_status, linked_ecobee_account, last_reported_at, last_synced_at, last_sync_status), sensors(id, sensor_number, name, ecobee_sensor_id, external_device_id, serial_number, reference_label, device_reference, installation_notes, setup_status, floors(name), units(unit_number)), building_rules(id, mild_day_enabled, mild_day_outdoor_threshold_f, mild_day_setpoint_reduction_f, minimum_heat_setpoint_f), alerts(id, status)"
    )
    .eq("id", buildingId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !building) {
    console.error("[buildings] Unable to load building detail:", error?.message ?? error);
    return null;
  }

  const snapshot = (await getLatestSnapshots([buildingId])).get(buildingId);
  const sensorIds = (building.sensors ?? []).map((sensor: any) => sensor.id);
  const readings = await getLatestSensorReadings(sensorIds);
  const sensors = (building.sensors ?? []).map((sensor: any) => mapSensor(sensor, readings.get(sensor.id)));
  const sensorsWithTemperatures = sensors.filter((sensor) => Number.isFinite(sensor.temperature));

  return mapBuildingRow(
    {
      ...building,
      latestSnapshot: snapshot,
      buildingAverage: sensorsWithTemperatures.length
        ? sensorsWithTemperatures.reduce((sum, sensor) => sum + sensor.temperature, 0) / sensorsWithTemperatures.length
        : undefined,
      floorAverages: computeFloorAverages(sensors),
      sensors
    },
    true
  );
}

async function getAccessibleBuildingIds(userId: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return null;
  }

  if ((await getUserRole(userId)) === "super_admin") {
    return null;
  }

  const { data } = await supabase
    .from("user_building_access")
    .select("building_id")
    .eq("clerk_user_id", userId)
    .not("building_id", "is", null);

  return (data ?? []).map((row) => row.building_id).filter(Boolean);
}

async function getLatestSnapshots(buildingIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const rowsByBuilding = new Map<string, any>();

  if (!supabase || buildingIds.length === 0) {
    return rowsByBuilding;
  }

  const { data } = await supabase.from("latest_thermostat_snapshots").select("*").in("building_id", buildingIds);

  for (const row of data ?? []) {
    rowsByBuilding.set(row.building_id, row);
  }

  return rowsByBuilding;
}

async function getBuildingAverages(buildingIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const rowsByBuilding = new Map<string, number>();

  if (!supabase || buildingIds.length === 0) {
    return rowsByBuilding;
  }

  const { data } = await supabase.from("building_latest_averages").select("building_id, average_temperature_f").in("building_id", buildingIds);

  for (const row of data ?? []) {
    rowsByBuilding.set(row.building_id, Number(row.average_temperature_f));
  }

  return rowsByBuilding;
}

async function getFloorAverages(buildingIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const grouped = new Map<string, Array<{ floor: string; average: number }>>();

  if (!supabase || buildingIds.length === 0) {
    return grouped;
  }

  const { data } = await supabase
    .from("floor_latest_averages")
    .select("building_id, floor_id, average_temperature_f")
    .in("building_id", buildingIds);

  const floorIds = [...new Set((data ?? []).map((row) => row.floor_id).filter(Boolean))];
  const floorNames = new Map<string, string>();

  if (floorIds.length > 0) {
    const { data: floors } = await supabase.from("floors").select("id, name").in("id", floorIds);

    for (const floor of floors ?? []) {
      floorNames.set(floor.id, floor.name);
    }
  }

  for (const row of data ?? []) {
    const floor = row.floor_id ? floorNames.get(row.floor_id) ?? "Unassigned" : "Unassigned";
    grouped.set(row.building_id, [
      ...(grouped.get(row.building_id) ?? []),
      { floor, average: Number(row.average_temperature_f) }
    ]);
  }

  return grouped;
}

async function getLatestSensorReadings(sensorIds: string[]) {
  const supabase = createServiceSupabaseClient();
  const readingsBySensor = new Map<string, any>();

  if (!supabase || sensorIds.length === 0) {
    return readingsBySensor;
  }

  const { data } = await supabase.from("latest_sensor_readings").select("*").in("sensor_id", sensorIds);

  for (const row of data ?? []) {
    readingsBySensor.set(row.sensor_id, row);
  }

  return readingsBySensor;
}

function mapBuildingRow(row: any, includeDetails = false): BuildingDetail {
  const latestSnapshot = row.latestSnapshot;
  const sensors: SensorDetail[] = row.sensors ?? [];
  const thermostat = Array.isArray(row.thermostats) ? row.thermostats[0] : row.thermostats;
  const thermostatTemp = Number(latestSnapshot?.thermostat_temperature_f ?? 0);
  const setpoint = Number(latestSnapshot?.heat_setpoint_f ?? 0);
  const syncFreshnessAt = thermostat?.last_synced_at ?? latestSnapshot?.recorded_at;
  const sensorsWithTemperatures = sensors.filter((sensor) => Number.isFinite(sensor.temperature));
  const status: ConnectionStatus =
    thermostat?.last_sync_status === "offline" ||
    latestSnapshot?.connected === false ||
    isStale(syncFreshnessAt, 10)
      ? "offline"
      : "online";

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    notes: row.notes ?? undefined,
    currentSetpoint: setpoint,
    thermostatTemperature: thermostatTemp,
    outdoorTemperature:
      latestSnapshot?.outdoor_temperature_f !== undefined && latestSnapshot?.outdoor_temperature_f !== null
        ? Number(latestSnapshot.outdoor_temperature_f)
        : undefined,
    differential: setpoint - thermostatTemp,
    lastSetpointChange: latestSnapshot?.recorded_at ? formatDate(latestSnapshot.recorded_at) : "No snapshot",
    floorAverages: row.floorAverages ?? computeFloorAverages(sensors),
    totalAverage: Number(
      row.buildingAverage ??
        (sensorsWithTemperatures.length
          ? sensorsWithTemperatures.reduce((sum, sensor) => sum + sensor.temperature, 0) / sensorsWithTemperatures.length
          : thermostatTemp)
    ),
    status,
    activeAlerts: (row.alerts ?? []).filter((alert: any) => alert.status === "active").length,
    lastSyncAt: syncFreshnessAt ? formatTimeAgo(syncFreshnessAt) : "never",
    setupStatus: row.setup_status ?? "draft",
    wifiStatus: row.wifi_status ?? undefined,
    thermostatInstallStatus: row.thermostat_install_status ?? undefined,
    sensorInstallStatus: row.sensor_install_status ?? undefined,
    thermostat: {
      id: thermostat?.id ?? "",
      name: thermostat?.name ?? "Unmapped thermostat",
      ecobeeIdentifier: thermostat?.ecobee_thermostat_id ?? "",
      externalDeviceId: thermostat?.external_device_id ?? thermostat?.ecobee_thermostat_id ?? undefined,
      serialNumber: thermostat?.serial_number ?? undefined,
      referenceLabel: thermostat?.reference_label ?? undefined,
      locationLabel: thermostat?.location_label ?? undefined,
      deviceReference: thermostat?.device_reference ?? undefined,
      installNotes: thermostat?.installation_notes ?? undefined,
      setupStatus: thermostat?.setup_status ?? "needs_mapping",
      connectionStatus: thermostat?.connection_status ?? thermostat?.last_sync_status ?? undefined,
      linkedEcobeeAccount: thermostat?.linked_ecobee_account ?? undefined,
      mode: "heat"
    },
    floors: includeDetails
      ? (row.floors ?? []).map((floor: any) => ({
          id: floor.id,
          name: floor.name,
          sortOrder: floor.sort_order
        }))
      : [],
    units: includeDetails
      ? (row.units ?? []).map((unit: any) => ({
          id: unit.id,
          label: unit.unit_label ?? unit.unit_number,
          floor: unit.floors?.name ?? "Unassigned"
        }))
      : [],
    sensors,
    buildingRule: mapBuildingRule(Array.isArray(row.building_rules) ? row.building_rules[0] : row.building_rules)
  };
}

function mapBuildingRule(rule: any) {
  return {
    mildDayEnabled: Boolean(rule?.mild_day_enabled),
    mildDayOutdoorThresholdF: Number(rule?.mild_day_outdoor_threshold_f ?? 65),
    mildDaySetpointReductionF: Number(rule?.mild_day_setpoint_reduction_f ?? 2),
    minimumHeatSetpointF: Number(rule?.minimum_heat_setpoint_f ?? 55)
  };
}

function mapSensor(sensor: any, reading: any): SensorDetail {
  return {
    id: sensor.id,
    sensorNumber: sensor.sensor_number,
    name: sensor.name,
    floor: sensor.floors?.name ?? "Unassigned",
    unit: sensor.units?.unit_number ?? undefined,
    temperature: reading?.temperature_f !== undefined && reading?.temperature_f !== null ? Number(reading.temperature_f) : Number.NaN,
    occupancy: reading?.occupancy ?? undefined,
    lastUpdated: reading?.recorded_at ? formatTimeAgo(reading.recorded_at) : "No reading",
    ecobeeIdentifier: sensor.ecobee_sensor_id ?? undefined,
    externalDeviceId: sensor.external_device_id ?? sensor.ecobee_sensor_id ?? undefined,
    serialNumber: sensor.serial_number ?? undefined,
    referenceLabel: sensor.reference_label ?? undefined,
    deviceReference: sensor.device_reference ?? undefined,
    installNotes: sensor.installation_notes ?? undefined,
    setupStatus: sensor.setup_status ?? "needs_mapping"
  };
}

function computeFloorAverages(sensors: Array<{ floor: string; temperature: number }>) {
  const grouped = new Map<string, number[]>();

  for (const sensor of sensors) {
    if (!Number.isFinite(sensor.temperature)) {
      continue;
    }

    grouped.set(sensor.floor, [...(grouped.get(sensor.floor) ?? []), sensor.temperature]);
  }

  return [...grouped.entries()].map(([floor, values]) => ({
    floor,
    average: values.reduce((sum, value) => sum + value, 0) / values.length
  }));
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

function formatTimeAgo(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  return `${Math.round(minutes / 60)} hr ago`;
}

function isStale(value?: string, staleAfterMinutes = 30) {
  if (!value) {
    return true;
  }

  return Date.now() - new Date(value).getTime() > staleAfterMinutes * 60 * 1000;
}
