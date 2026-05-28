import { NextResponse } from "next/server";
import { requireGlobalEditor, requireSupabase } from "@/lib/api/guards";
import { exchangeEcobeePinCode, saveEcobeeTokenSet } from "@/lib/ecobee/auth";
import { requireString } from "@/lib/validation";

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
    const sessionId = requireString(body.sessionId, "Session id");
    const { data: session } = await db.supabase
      .from("ecobee_auth_sessions")
      .select("id, authorization_code, expires_at, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session || session.status !== "pending") {
      throw new Error("ecobee PIN session is not pending.");
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      throw new Error("ecobee PIN session has expired.");
    }

    const tokenSet = await exchangeEcobeePinCode(session.authorization_code);
    await saveEcobeeTokenSet(tokenSet, user.userId);
    await db.supabase
      .from("ecobee_auth_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", session.id);

    return NextResponse.json({ message: "ecobee PIN authorization completed and tokens were stored server-side." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to exchange ecobee PIN." }, { status: 400 });
  }
}
