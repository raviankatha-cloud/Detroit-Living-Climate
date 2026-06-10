import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { requireString } from "@/lib/validation";

export async function POST(request: Request) {
  const clerkReady = isClerkConfigured();
  const { userId } = clerkReady ? await auth() : { userId: "local-dev" };

  if (!userId) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const endpoint = requireString(body.endpoint, "Push endpoint");
    const p256dh = requireString(body.keys?.p256dh, "Push p256dh key");
    const pushAuth = requireString(body.keys?.auth, "Push auth key");

    const { error } = await supabase.from("web_push_subscriptions").upsert(
      {
        clerk_user_id: userId,
        endpoint,
        p256dh,
        auth: pushAuth,
        updated_at: new Date().toISOString()
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Web push subscription saved." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to save subscription." }, { status: 400 });
  }
}
