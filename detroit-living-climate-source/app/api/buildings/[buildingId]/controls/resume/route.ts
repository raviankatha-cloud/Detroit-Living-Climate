import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canControlBuilding } from "@/lib/auth/permissions";
import { resumeThermostatProgram } from "@/lib/ecobee/client";
import { logAuditEvent } from "@/lib/audit";

type Context = {
  params: Promise<{ buildingId: string }>;
};

export async function POST(request: Request, context: Context) {
  const { userId } = await auth();
  const { buildingId } = await context.params;

  if (!userId) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (!(await canControlBuilding(userId, buildingId))) {
    return NextResponse.json({ message: "You do not have control access for this building." }, { status: 403 });
  }

  const body = (await request.json()) as { confirmationText?: unknown };

  if (body.confirmationText !== "CONFIRM") {
    return NextResponse.json({ message: "Secure confirmation is required." }, { status: 400 });
  }

  try {
    await resumeThermostatProgram({ buildingId });
    await logAuditEvent({ actorUserId: userId, buildingId, action: "thermostat.resume_schedule", metadata: { status: "success" } });
  } catch (error) {
    await logAuditEvent({
      actorUserId: userId,
      buildingId,
      action: "thermostat.resume_schedule_failed",
      metadata: { error: error instanceof Error ? error.message : "Unknown error" }
    });

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to resume schedule." },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Resume schedule request sent." });
}
