import { NextResponse } from "next/server";
import { requireGlobalEditor, requireSupabase } from "@/lib/api/guards";
import { requestEcobeePinAuthorization } from "@/lib/ecobee/auth";

export async function POST() {
  const user = await requireGlobalEditor();

  if ("error" in user) {
    return user.error;
  }

  const db = await requireSupabase();

  if ("error" in db) {
    return db.error;
  }

  const pin = await requestEcobeePinAuthorization();
  const expiresAt = new Date(Date.now() + pin.expires_in * 60 * 1000).toISOString();
  const { data, error } = await db.supabase
    .from("ecobee_auth_sessions")
    .insert({
      ecobee_pin: pin.ecobeePin,
      authorization_code: pin.code,
      scope: pin.scope,
      interval_seconds: pin.interval,
      expires_at: expiresAt,
      created_by: user.userId
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "Enter this PIN in the ecobee portal, then exchange the session.",
    sessionId: data.id,
    ecobeePin: pin.ecobeePin,
    expiresAt,
    intervalSeconds: pin.interval,
    scope: pin.scope
  });
}
