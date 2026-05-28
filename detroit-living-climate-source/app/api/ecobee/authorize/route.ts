import { NextResponse } from "next/server";
import { getEcobeeAuthorizationUrl } from "@/lib/ecobee/auth";
import { requireGlobalEditor } from "@/lib/api/guards";

export async function GET() {
  const user = await requireGlobalEditor();

  if ("error" in user) {
    return user.error;
  }

  return NextResponse.redirect(getEcobeeAuthorizationUrl(user.userId));
}
