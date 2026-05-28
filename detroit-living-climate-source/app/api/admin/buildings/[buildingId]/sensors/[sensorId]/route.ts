import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string; sensorId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { buildingId, sensorId } = await context.params;
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

    const { error } = await db.supabase
      .from("sensors")
      .update({
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
        setup_status: body.setupStatus ?? "mapped",
        updated_at: new Date().toISOString()
      })
      .eq("id", sensorId)
      .eq("building_id", buildingId);

    if (error) {
      throw error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "sensor.update", metadata: { sensorId, sensorNumber, name } });
    return NextResponse.json({ message: "Sensor saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save sensor." }, { status: 400 });
  }
}
