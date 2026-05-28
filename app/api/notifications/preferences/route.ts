import { NextResponse } from "next/server";
import { canViewBuilding } from "@/lib/auth/permissions";
import { requireSupabase, requireUser } from "@/lib/api/guards";

export async function POST(request: Request) {
  const user = await requireUser();

  if ("error" in user) {
    return user.error;
  }

  const db = await requireSupabase();

  if ("error" in db) {
    return db.error;
  }

  try {
    const body = await request.json();
    const buildingId = typeof body.buildingId === "string" && body.buildingId.length > 0 ? body.buildingId : null;

    if (buildingId && !(await canViewBuilding(user.userId, buildingId))) {
      return NextResponse.json({ message: "Building access required." }, { status: 403 });
    }

    const payload = {
      clerk_user_id: user.userId,
      building_id: buildingId,
      email_enabled: Boolean(body.emailEnabled),
      web_push_enabled: Boolean(body.webPushEnabled),
      warning_enabled: Boolean(body.warningEnabled),
      critical_enabled: Boolean(body.criticalEnabled),
      escalation_enabled: Boolean(body.escalationEnabled),
      recovery_enabled: Boolean(body.recoveryEnabled),
      updated_at: new Date().toISOString()
    };
    const { error } = await db.supabase.from("notification_preferences").upsert(payload, {
      onConflict: "clerk_user_id,building_id"
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Notification preferences saved." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save notification preferences." },
      { status: 400 }
    );
  }
}
