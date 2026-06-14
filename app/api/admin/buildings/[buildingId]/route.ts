import { revalidatePath } from "next/cache";
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
    const notes = optionalString(body.notes);
    const setupStatus = body.setupStatus ?? "ready";
    const wifiStatus = body.wifiStatus ?? "needs_wifi";
    const thermostatInstallStatus = body.thermostatInstallStatus ?? "needs_install";
    const sensorInstallStatus = body.sensorInstallStatus ?? "needs_sensor_setup";

    const { error } = await db.supabase
      .from("buildings")
      .update({
        name,
        address,
        notes,
        setup_status: setupStatus,
        wifi_status: wifiStatus,
        thermostat_install_status: thermostatInstallStatus,
        sensor_install_status: sensorInstallStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", buildingId);

    if (error) {
      console.error("[buildings] PATCH failed:", error.message, error);
      throw new Error(error.message);
    }

    await logAuditEvent({
      actorUserId: user.userId,
      buildingId,
      action: "building.updated",
      metadata: { name, address, notes, setupStatus, wifiStatus, thermostatInstallStatus, sensorInstallStatus }
    });

    revalidatePath(`/buildings/${buildingId}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ message: "Building saved." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save building.";
    console.error("[buildings] PATCH error:", message);
    return NextResponse.json({ message }, { status: 400 });
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
    console.error("[buildings] DELETE failed:", error.message, error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await logAuditEvent({ actorUserId: user.userId, buildingId, action: "building.archived" });

  revalidatePath("/dashboard");

  return NextResponse.json({ message: "Building archived." });
}
