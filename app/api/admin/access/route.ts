import { NextResponse } from "next/server";
import { requireGlobalEditor, requireSupabase } from "@/lib/api/guards";
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
    const clerkUserId = requireString(body.clerkUserId, "Clerk user id");
    const role = requireString(body.role, "Role");

    if (!["super_admin", "manager", "read_only"].includes(role)) {
      throw new Error("Invalid role.");
    }

    const buildingId = optionalString(body.buildingId);

    if (role !== "super_admin" && !buildingId) {
      throw new Error("Building id is required for manager and read_only access.");
    }

    const { error } = await db.supabase.from("user_building_access").upsert(
      {
        clerk_user_id: clerkUserId,
        building_id: role === "super_admin" ? null : buildingId,
        role
      },
      { onConflict: "clerk_user_id,building_id" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Access saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save access." }, { status: 400 });
  }
}
