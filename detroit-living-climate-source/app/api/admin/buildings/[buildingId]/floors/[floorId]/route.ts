import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";
import { optionalString, requireString } from "@/lib/validation";

type Context = {
  params: Promise<{ buildingId: string; floorId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { buildingId, floorId } = await context.params;
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
    const name = requireString(body.name, "Floor name");
    const { error } = await db.supabase
      .from("floors")
      .update({
        name,
        floor_number: optionalString(body.floorNumber),
        sort_order: Number(body.sortOrder ?? 0),
        notes: optionalString(body.notes),
        updated_at: new Date().toISOString()
      })
      .eq("id", floorId)
      .eq("building_id", buildingId);

    if (error) {
      throw error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "floor.update", metadata: { floorId, name } });
    return NextResponse.json({ message: "Floor saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save floor." }, { status: 400 });
  }
}
