import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/auth/clerk-config";
import { canEditBuilding, canEditEverything, canViewBuilding } from "@/lib/auth/permissions";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const clerkReady = isClerkConfigured();
  const { userId } = clerkReady ? await auth() : { userId: "local-dev" };

  if (!userId) {
    return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  }

  return { userId };
}

export async function requireSupabase() {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return { error: NextResponse.json({ message: "Supabase is not configured." }, { status: 503 }) };
  }

  return { supabase };
}

export async function requireGlobalEditor() {
  const user = await requireUser();

  if ("error" in user) {
    return user;
  }

  if (!(await canEditEverything(user.userId))) {
    return { error: NextResponse.json({ message: "super_admin access required." }, { status: 403 }) };
  }

  return user;
}

export async function requireBuildingViewer(buildingId: string) {
  const user = await requireUser();

  if ("error" in user) {
    return user;
  }

  if (!(await canViewBuilding(user.userId, buildingId))) {
    return { error: NextResponse.json({ message: "Building access required." }, { status: 403 }) };
  }

  return user;
}

export async function requireBuildingEditor(buildingId: string) {
  const user = await requireUser();

  if ("error" in user) {
    return user;
  }

  if (!(await canEditBuilding(user.userId, buildingId))) {
    return { error: NextResponse.json({ message: "Building edit access required." }, { status: 403 }) };
  }

  return user;
}
