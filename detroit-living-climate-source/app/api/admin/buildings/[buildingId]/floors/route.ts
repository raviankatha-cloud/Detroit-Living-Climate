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
    const name = requireString(body.name, "Floor name");

    const { data, error } = await db.supabase
      .from("floors")
      .insert({
        building_id: buildingId,
        name,
        floor_number: optionalString(body.floorNumber),
        sort_order: Number(body.sortOrder ?? 0),
        notes: optionalString(body.notes)
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "floor.create", metadata: { name } });
    return NextResponse.json({ message: "Floor created.", floorId: data.id });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create floor." }, { status: 400 });
  }
}
