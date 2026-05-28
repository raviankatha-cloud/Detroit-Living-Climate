import { NextResponse } from "next/server";
import { requireGlobalEditor } from "@/lib/api/guards";
import { syncEcobeePortfolio } from "@/lib/ecobee/sync";

export async function POST(request: Request) {
  const expectedSecret = process.env.ECOBEE_SYNC_SECRET;
  const providedSecret = request.headers.get("x-sync-secret");

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid sync secret." }, { status: 401 });
  }

  if (!expectedSecret) {
    const user = await requireGlobalEditor();

    if ("error" in user) {
      return user.error;
    }
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true" || request.headers.get("x-force-sync") === "true";
  const result = await syncEcobeePortfolio({ force });
  const status = result.ok ? 200 : 500;

  return NextResponse.json(result, { status });
}
