import { NextResponse } from "next/server";
import { requireGlobalEditor } from "@/lib/api/guards";
import { exchangeEcobeeAuthorizationCode, saveEcobeeTokenSet } from "@/lib/ecobee/auth";

export async function GET(request: Request) {
  const user = await requireGlobalEditor();

  if ("error" in user) {
    return user.error;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ message: `ecobee authorization failed: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ message: "Missing ecobee authorization code." }, { status: 400 });
  }

  if (state && state !== user.userId) {
    return NextResponse.json({ message: "Invalid ecobee authorization state." }, { status: 400 });
  }

  const tokenSet = await exchangeEcobeeAuthorizationCode(code);
  await saveEcobeeTokenSet(tokenSet, user.userId);

  return NextResponse.json({
    message: "ecobee authorization completed and tokens were stored server-side.",
    expiresIn: tokenSet.expires_in
  });
}
