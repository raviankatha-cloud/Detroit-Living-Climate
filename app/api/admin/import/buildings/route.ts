import { NextResponse } from "next/server";
import { requireGlobalEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";
import type { SetupStatus } from "@/lib/types";

type ImportBuilding = {
  name?: unknown;
  address?: unknown;
  notes?: unknown;
  setupStatus?: unknown;
  wifiStatus?: unknown;
  thermostatInstallStatus?: unknown;
  sensorInstallStatus?: unknown;
};

const allowedStatuses: SetupStatus[] = [
  "draft",
  "needs_mapping",
  "mapped",
  "ready",
  "synced",
  "archived",
  "needs_install",
  "needs_wifi",
  "needs_sensor_setup",
  "needs_thermostat_move",
  "in_progress",
  "complete"
];

export async function POST(request: Request) {
  const user = await requireGlobalEditor();

  if ("error" in user) {
    return user.error;
  }

  const db = await requireSupabase();

  if ("error" in db) {
    return db.error;
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const rows = contentType.includes("application/json")
      ? normalizeJsonRows(await request.json())
      : parseCsvRows(await request.text());

    if (rows.length === 0) {
      throw new Error("No buildings were found in the import payload.");
    }

    const payload = rows.map((row) => {
      const name = requireString(row.name, "Building name");
      const address = requireString(row.address, "Building address");

      return {
        name,
        address,
        notes: optionalString(row.notes),
        setup_status: normalizeStatus(row.setupStatus, "in_progress"),
        wifi_status: normalizeStatus(row.wifiStatus, "needs_wifi"),
        thermostat_install_status: normalizeStatus(row.thermostatInstallStatus, "needs_install"),
        sensor_install_status: normalizeStatus(row.sensorInstallStatus, "needs_sensor_setup")
      };
    });

    const { data, error } = await db.supabase.from("buildings").insert(payload).select("id, name");

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      await db.supabase.from("building_rules").insert(data.map((building) => ({ building_id: building.id })));
    }

    await logAuditEvent({
      actorUserId: user.userId,
      action: "building.bulk_import",
      metadata: { count: payload.length }
    });

    return NextResponse.json({ message: `${payload.length} building${payload.length === 1 ? "" : "s"} imported.`, count: payload.length });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to import buildings." }, { status: 400 });
  }
}

function normalizeJsonRows(payload: unknown): ImportBuilding[] {
  if (Array.isArray(payload)) {
    return payload as ImportBuilding[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { buildings?: unknown }).buildings)) {
    return (payload as { buildings: ImportBuilding[] }).buildings;
  }

  return [];
}

function parseCsvRows(value: string): ImportBuilding[] {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeStatus(value: unknown, fallback: SetupStatus): SetupStatus {
  return allowedStatuses.includes(value as SetupStatus) ? (value as SetupStatus) : fallback;
}

