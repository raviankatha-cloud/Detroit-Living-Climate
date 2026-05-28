import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string }>;
};

export async function POST(request: Request, context: Context) {
  const { buildingId } = await context.params;
  const user = await requireBuildingEditor(buildingId);

  if ("error" in user) {
    return user.error;
  }

  const db = await requireSupabase();

  if ("error" in db) {
    return db.error;
  }

  try {
    const body = await request.json();
    const name = requireString(body.name, "Sensor name");
    const sensorNumber = Number(body.sensorNumber);

    if (!Number.isInteger(sensorNumber) || sensorNumber < 1) {
      throw new Error("Sensor number must be a positive integer.");
    }

    const { data: thermostat, error: thermostatError } = await db.supabase
      .from("thermostats")
      .select("id")
      .eq("building_id", buildingId)
      .maybeSingle();

    if (thermostatError || !thermostat) {
      throw new Error("Create a thermostat record before adding sensors.");
    }

    const { data, error } = await db.supabase
      .from("sensors")
      .insert({
        thermostat_id: thermostat.id,
        building_id: buildingId,
        floor_id: optionalString(body.floorId),
        unit_id: optionalString(body.unitId),
        sensor_number: sensorNumber,
        name,
        ecobee_sensor_id: optionalString(body.ecobeeIdentifier ?? body.externalDeviceId),
        external_device_id: optionalString(body.externalDeviceId ?? body.ecobeeIdentifier),
        serial_number: optionalString(body.serialNumber),
        reference_label: optionalString(body.referenceLabel),
        device_reference: optionalString(body.deviceReference),
        installation_notes: optionalString(body.installationNotes),
        setup_status: body.setupStatus ?? "mapped"
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "sensor.create", metadata: { sensorNumber, name } });
    return NextResponse.json({ message: "Sensor created.", sensorId: data.id });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create sensor." }, { status: 400 });
  }
}
