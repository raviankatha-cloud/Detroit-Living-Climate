import "server-only";
import { ECOBEE_API_BASE_URL, getValidEcobeeAccessToken } from "@/lib/ecobee/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type SetpointInput = {
  buildingId: string;
  heatSetpointF: number;
};

type BuildingInput = {
  buildingId: string;
};

export type EcobeeThermostatSummary = {
  identifier: string;
  name: string;
  connected: boolean;
  thermostatRevision?: string;
  alertsRevision?: string;
  runtimeRevision?: string;
  intervalRevision?: string;
  equipmentStatus?: string;
};

export type EcobeeThermostatPayload = {
  identifier: string;
  name?: string;
  runtime?: {
    actualTemperature?: number;
    desiredHeat?: number;
    desiredCool?: number;
    connected?: boolean;
    runtimeDate?: string;
    runtimeInterval?: number;
    lastStatusModified?: string;
  };
  settings?: {
    hvacMode?: string;
  };
  equipmentStatus?: string;
  weather?: {
    forecasts?: Array<{ temperature?: number }>;
  };
  remoteSensors?: Array<{
    id: string;
    name?: string;
    capability?: Array<{ id?: string; type: string; value: string }>;
  }>;
};

export async function setThermostatHold(input: SetpointInput) {
  const accessToken = await getRequiredAccessToken();
  const thermostatIdentifier = await getRequiredEcobeeThermostatIdentifier(input.buildingId);

  await callEcobeeFunction(accessToken, thermostatIdentifier, {
    type: "setHold",
    params: {
      heatHoldTemp: Math.round(input.heatSetpointF * 10),
      holdType: "indefinite"
    }
  });

  return { ok: true };
}

export async function resumeThermostatProgram(input: BuildingInput) {
  const accessToken = await getRequiredAccessToken();
  const thermostatIdentifier = await getRequiredEcobeeThermostatIdentifier(input.buildingId);

  await callEcobeeFunction(accessToken, thermostatIdentifier, {
    type: "resumeProgram",
    params: { resumeAll: true }
  });

  return { ok: true };
}

export async function fetchEcobeeThermostatSummary() {
  const accessToken = await getRequiredAccessToken();
  const json = {
    selection: {
      selectionType: "registered",
      selectionMatch: "",
      includeEquipmentStatus: true
    }
  };
  const url = new URL(`${ECOBEE_API_BASE_URL}/1/thermostatSummary`);
  url.searchParams.set("format", "json");
  url.searchParams.set("json", JSON.stringify(json));

  const payload = (await ecobeeGet(accessToken, url)) as {
    revisionList?: string[];
    statusList?: string[];
  };
  const equipmentByIdentifier = new Map<string, string>();

  for (const status of payload.statusList ?? []) {
    const [identifier, equipmentStatus = ""] = status.split(":");
    equipmentByIdentifier.set(identifier, equipmentStatus);
  }

  return (payload.revisionList ?? []).map((row) => parseSummaryRow(row, equipmentByIdentifier));
}

export async function fetchEcobeeThermostats(thermostatIdentifiers: string[]) {
  const accessToken = await getRequiredAccessToken();

  if (thermostatIdentifiers.length === 0) {
    return [];
  }

  const json = {
    selection: {
      selectionType: "thermostats",
      selectionMatch: thermostatIdentifiers.join(","),
      includeRuntime: true,
      includeSettings: true,
      includeSensors: true,
      includeWeather: true,
      includeEquipmentStatus: true
    }
  };
  const url = new URL(`${ECOBEE_API_BASE_URL}/1/thermostat`);
  url.searchParams.set("format", "json");
  url.searchParams.set("json", JSON.stringify(json));

  const payload = (await ecobeeGet(accessToken, url)) as { thermostatList?: EcobeeThermostatPayload[] };
  return payload.thermostatList ?? [];
}

function parseSummaryRow(row: string, equipmentByIdentifier: Map<string, string>): EcobeeThermostatSummary {
  const [
    identifier = "",
    name = "",
    connected = "false",
    thermostatRevision,
    alertsRevision,
    runtimeRevision,
    intervalRevision
  ] = row.split(":");

  return {
    identifier,
    name,
    connected: connected === "true",
    thermostatRevision,
    alertsRevision,
    runtimeRevision,
    intervalRevision,
    equipmentStatus: equipmentByIdentifier.get(identifier) ?? ""
  };
}

async function ecobeeGet(accessToken: string, url: URL) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json;charset=UTF-8"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ecobee GET failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function callEcobeeFunction(accessToken: string, thermostatIdentifier: string, fn: { type: string; params: Record<string, unknown> }) {
  const response = await fetch(`${ECOBEE_API_BASE_URL}/1/thermostat?format=json`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json;charset=UTF-8"
    },
    body: JSON.stringify({
      selection: {
        selectionType: "thermostats",
        selectionMatch: thermostatIdentifier
      },
      functions: [fn]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ecobee function ${fn.type} failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function getRequiredAccessToken() {
  const token = await getValidEcobeeAccessToken();

  if (!token) {
    throw new Error("ecobee is not authorized. Connect ecobee or set ECOBEE_REFRESH_TOKEN.");
  }

  return token;
}

async function getRequiredEcobeeThermostatIdentifier(buildingId: string) {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is required for live ecobee controls.");
  }

  const { data } = await supabase
    .from("thermostats")
    .select("ecobee_thermostat_id, external_device_id")
    .eq("building_id", buildingId)
    .maybeSingle();

  const identifier = data?.ecobee_thermostat_id ?? data?.external_device_id;

  if (!identifier) {
    throw new Error("No ecobee thermostat identifier is mapped for this building.");
  }

  return identifier as string;
}
