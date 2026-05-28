import { NextResponse } from "next/server";
import { requireGlobalEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

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
    const body = await request.json();
    const name = requireString(body.name, "Building name");
    const address = requireString(body.address, "Building address");

    const { data, error } = await db.supabase
      .from("buildings")
      .insert({
        name,
        address,
        notes: optionalString(body.notes),
        setup_status: body.setupStatus ?? "draft",
        wifi_status: body.wifiStatus ?? "needs_wifi",
        thermostat_install_status: body.thermostatInstallStatus ?? "needs_install",
        sensor_install_status: body.sensorInstallStatus ?? "needs_sensor_setup"
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const floorNameToId = new Map<string, string>();
    const unitLabelToId = new Map<string, string>();

    for (const [index, floor] of Array.isArray(body.floors) ? body.floors.entries() : []) {
      const floorName = requireString(floor.name, "Floor name");
      const { data: floorRow, error: floorError } = await db.supabase
        .from("floors")
        .insert({
          building_id: data.id,
          name: floorName,
          floor_number: optionalString(floor.floorNumber),
          sort_order: Number(floor.sortOrder ?? index + 1)
        })
        .select("id, name")
        .single();

      if (floorError) {
        throw floorError;
      }

      floorNameToId.set(floorName.toLowerCase(), floorRow.id);
    }

    for (const unit of Array.isArray(body.units) ? body.units : []) {
      const unitNumber = requireString(unit.unitNumber, "Unit number");
      const floorId = optionalString(unit.floorId) ?? floorNameToId.get(String(unit.floorName ?? "").toLowerCase()) ?? null;
      const { data: unitRow, error: unitError } = await db.supabase
        .from("units")
        .insert({
          building_id: data.id,
          floor_id: floorId,
          unit_number: unitNumber,
          unit_label: optionalString(unit.unitLabel)
        })
        .select("id, unit_number")
        .single();

      if (unitError) {
        throw unitError;
      }

      unitLabelToId.set(unitNumber.toLowerCase(), unitRow.id);
    }

    let thermostatId: string | null = null;
    if (body.thermostat?.name || body.thermostat?.ecobeeIdentifier) {
      const { data: thermostat, error: thermostatError } = await db.supabase
        .from("thermostats")
        .insert({
          building_id: data.id,
          name: body.thermostat.name || `${name} Thermostat`,
          ecobee_thermostat_id: optionalString(body.thermostat.ecobeeIdentifier ?? body.thermostat.externalDeviceId),
          external_device_id: optionalString(body.thermostat.externalDeviceId ?? body.thermostat.ecobeeIdentifier),
          serial_number: optionalString(body.thermostat.serialNumber),
          reference_label: optionalString(body.thermostat.referenceLabel),
          location_label: optionalString(body.thermostat.locationLabel),
          device_reference: optionalString(body.thermostat.deviceReference),
          installation_notes: optionalString(body.thermostat.installationNotes),
          connection_status: optionalString(body.thermostat.connectionStatus) ?? "not_connected",
          linked_ecobee_account: optionalString(body.thermostat.linkedEcobeeAccount),
          setup_status: body.thermostat.setupStatus ?? "mapped"
        })
        .select("id")
        .single();

      if (thermostatError) {
        throw thermostatError;
      }

      thermostatId = thermostat.id;
    }

    if (thermostatId) {
      for (const sensor of Array.isArray(body.sensors) ? body.sensors : []) {
        const sensorNumber = Number(sensor.sensorNumber);

        if (!Number.isInteger(sensorNumber) || sensorNumber < 1) {
          continue;
        }

        const floorId = optionalString(sensor.floorId) ?? floorNameToId.get(String(sensor.floorName ?? "").toLowerCase()) ?? null;
        const unitId = optionalString(sensor.unitId) ?? unitLabelToId.get(String(sensor.unitNumber ?? "").toLowerCase()) ?? null;

        const { error: sensorError } = await db.supabase.from("sensors").insert({
          thermostat_id: thermostatId,
          building_id: data.id,
          floor_id: floorId,
          unit_id: unitId,
          sensor_number: sensorNumber,
          name: sensor.name || `Sensor ${sensorNumber}`,
          ecobee_sensor_id: optionalString(sensor.ecobeeIdentifier ?? sensor.externalDeviceId),
          external_device_id: optionalString(sensor.externalDeviceId ?? sensor.ecobeeIdentifier),
          serial_number: optionalString(sensor.serialNumber),
          reference_label: optionalString(sensor.referenceLabel),
          device_reference: optionalString(sensor.deviceReference),
          installation_notes: optionalString(sensor.installationNotes),
          setup_status: sensor.setupStatus ?? "mapped"
        });

        if (sensorError) {
          throw sensorError;
        }
      }
    }

    await db.supabase.from("building_rules").insert({ building_id: data.id });

    await logAuditEvent({
      actorUserId: user.userId,
      buildingId: data.id,
      action: "building.create",
      metadata: { name, address }
    });

    return NextResponse.json({ message: "Building created.", buildingId: data.id });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create building." }, { status: 400 });
  }
}
