import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string }>;
};

export async function PUT(request: Request, context: Context) {
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
    const name = requireString(body.name, "Thermostat name");

    const { data: existing } = await db.supabase
      .from("thermostats")
      .select("id")
      .eq("building_id", buildingId)
      .maybeSingle();

    const payload = {
      building_id: buildingId,
      name,
      ecobee_thermostat_id: optionalString(body.ecobeeIdentifier ?? body.externalDeviceId),
      external_device_id: optionalString(body.externalDeviceId ?? body.ecobeeIdentifier),
      serial_number: optionalString(body.serialNumber),
      reference_label: optionalString(body.referenceLabel),
      location_label: optionalString(body.locationLabel),
      device_reference: optionalString(body.deviceReference),
      installation_notes: optionalString(body.installationNotes),
      setup_status: body.setupStatus ?? "mapped",
      connection_status: optionalString(body.connectionStatus) ?? "not_connected",
      linked_ecobee_account: optionalString(body.linkedEcobeeAccount),
      updated_at: new Date().toISOString()
    };

    const result = existing?.id
      ? await db.supabase.from("thermostats").update(payload).eq("id", existing.id).select("id").single()
      : await db.supabase.from("thermostats").insert(payload).select("id").single();

    if (result.error) {
      throw result.error;
    }

    await logAuditEvent({
      actorUserId: user.userId,
      buildingId,
      action: existing?.id ? "thermostat.update" : "thermostat.create",
      metadata: { thermostatId: result.data.id, name }
    });

    return NextResponse.json({ message: "Thermostat saved.", thermostatId: result.data.id });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save thermostat." }, { status: 400 });
  }
}
