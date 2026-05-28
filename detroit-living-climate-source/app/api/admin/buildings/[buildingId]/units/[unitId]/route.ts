import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string; unitId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { buildingId, unitId } = await context.params;
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
    const unitNumber = requireString(body.unitNumber, "Unit number");
    const { error } = await db.supabase
      .from("units")
      .update({
        floor_id: optionalString(body.floorId),
        unit_number: unitNumber,
        unit_label: optionalString(body.unitLabel),
        notes: optionalString(body.notes),
        updated_at: new Date().toISOString()
      })
      .eq("id", unitId)
      .eq("building_id", buildingId);

    if (error) {
      throw error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "unit.update", metadata: { unitId, unitNumber } });
    return NextResponse.json({ message: "Unit saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save unit." }, { status: 400 });
  }
}
