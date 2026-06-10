import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { canControlBuilding } from "@/lib/auth/permissions";
import { setThermostatHold } from "@/lib/ecobee/client";
import { logAuditEvent } from "@/lib/audit";

type Context = {
  params: Promise<{ buildingId: string }>;
};

export async function POST(request: Request, context: Context) {
  const clerkReady = isClerkConfigured();
  const { userId } = clerkReady ? await auth() : { userId: "local-dev" };
  const { buildingId } = await context.params;

  if (!userId) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (clerkReady && !(await canControlBuilding(userId, buildingId))) {
    return NextResponse.json({ message: "You do not have control access for this building." }, { status: 403 });
  }

  const body = (await request.json()) as { temperature?: unknown; confirmationText?: unknown };
  const temperature = Number(body.temperature);

  if (body.confirmationText !== "CONFIRM") {
    return NextResponse.json({ message: "Secure confirmation is required." }, { status: 400 });
  }

  if (!Number.isFinite(temperature) || temperature < 45 || temperature > 90) {
    return NextResponse.json({ message: "Set temperature must be between 45F and 90F." }, { status: 400 });
  }

  try {
    await setThermostatHold({ buildingId, heatSetpointF: temperature });
    await logAuditEvent({
      actorUserId: userId,
      buildingId,
      action: "thermostat.setpoint_hold",
      metadata: { heatSetpointF: temperature, status: "success" }
    });
  } catch (error) {
    await logAuditEvent({
      actorUserId: userId,
      buildingId,
      action: "thermostat.setpoint_hold_failed",
      metadata: { heatSetpointF: temperature, error: error instanceof Error ? error.message : "Unknown error" }
    });

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to send setpoint request." },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: `Setpoint request sent: ${temperature.toFixed(1)}F.` });
}
