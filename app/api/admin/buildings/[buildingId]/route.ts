import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string }>;
};

export async function PATCH(request: Request, context: Context) {
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
    const name = requireString(body.name, "Building name");
    const address = requireString(body.address, "Building address");

    const { error } = await db.supabase
      .from("buildings")
      .update({
        name,
        address,
        notes: optionalString(body.notes),
        setup_status: body.setupStatus ?? "ready",
        wifi_status: body.wifiStatus ?? "needs_wifi",
        thermostat_install_status: body.thermostatInstallStatus ?? "needs_install",
        sensor_install_status: body.sensorInstallStatus ?? "needs_sensor_setup",
        updated_at: new Date().toISOString()
      })
      .eq("id", buildingId);

    if (error) {
      throw error;
    }

    await logAuditEvent({
      actorUserId: user.userId,
      buildingId,
      action: "building.update",
      metadata: { name, address }
    });

    return NextResponse.json({ message: "Building saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save building." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { buildingId } = await context.params;
  const user = await requireBuildingEditor(buildingId);

  if ("error" in user) {
    return user.error;
  }

  const db = await requireSupabase();

  if ("error" in db) {
    return db.error;
  }

  const { error } = await db.supabase
    .from("buildings")
    .update({
      archived_at: new Date().toISOString(),
      setup_status: "archived",
      updated_at: new Date().toISOString()
    })
    .eq("id", buildingId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await logAuditEvent({ actorUserId: user.userId, buildingId, action: "building.archive" });

  return NextResponse.json({ message: "Building archived." });
}
