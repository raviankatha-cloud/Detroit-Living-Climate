import { NextResponse } from "next/server";
import { requireBuildingEditor, requireSupabase } from "@/lib/api/guards";
import { logAuditEvent } from "@/lib/audit";

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
    const threshold = Number(body.mildDayOutdoorThresholdF ?? 65);
    const reduction = Number(body.mildDaySetpointReductionF ?? 2);
    const minimumHeatSetpoint = Number(body.minimumHeatSetpointF ?? 55);

    if (!Number.isFinite(threshold) || !Number.isFinite(reduction) || !Number.isFinite(minimumHeatSetpoint)) {
      throw new Error("Rule threshold and reduction must be valid numbers.");
    }

    if (threshold < 45 || threshold > 85 || reduction < 0.5 || reduction > 10 || minimumHeatSetpoint < 45 || minimumHeatSetpoint > 70) {
      throw new Error("Rule values are outside the allowed safety range.");
    }

    const { data: existing } = await db.supabase
      .from("building_rules")
      .select("id")
      .eq("building_id", buildingId)
      .maybeSingle();

    const payload = {
      building_id: buildingId,
      mild_day_enabled: Boolean(body.mildDayEnabled),
      mild_day_outdoor_threshold_f: threshold,
      mild_day_setpoint_reduction_f: reduction,
      minimum_heat_setpoint_f: minimumHeatSetpoint,
      updated_at: new Date().toISOString()
    };

    const result = existing?.id
      ? await db.supabase.from("building_rules").update(payload).eq("id", existing.id).select("id").single()
      : await db.supabase.from("building_rules").insert(payload).select("id").single();

    if (result.error) {
      throw result.error;
    }

    await logAuditEvent({ actorUserId: user.userId, buildingId, action: "building_rule.update", metadata: payload });
    return NextResponse.json({ message: "Building rule saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save rule." }, { status: 400 });
  }
}
