import "server-only";
import type { UserRole } from "@/lib/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function getUserRole(userId: string): Promise<UserRole> {
  if (isLocalDevelopmentUser(userId)) {
    return "super_admin";
  }

  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return "super_admin";
  }

  const { data } = await supabase
    .from("user_building_access")
    .select("role")
    .eq("clerk_user_id", userId)
    .is("building_id", null)
    .maybeSingle();

  return (data?.role as UserRole | undefined) ?? "read_only";
}

export async function getBuildingRole(userId: string, buildingId: string): Promise<UserRole | null> {
  if (isLocalDevelopmentUser(userId)) {
    return "super_admin";
  }

  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return "super_admin";
  }

  const { data: globalAccess } = await supabase
    .from("user_building_access")
    .select("role")
    .eq("clerk_user_id", userId)
    .is("building_id", null)
    .maybeSingle();

  if (globalAccess?.role === "super_admin") {
    return "super_admin";
  }

  const { data } = await supabase
    .from("user_building_access")
    .select("role")
    .eq("clerk_user_id", userId)
    .eq("building_id", buildingId)
    .maybeSingle();

  return (data?.role as UserRole | undefined) ?? null;
}

export async function canViewBuilding(userId: string, buildingId: string) {
  return Boolean(await getBuildingRole(userId, buildingId));
}

export async function canControlBuilding(userId: string, buildingId: string) {
  const role = await getBuildingRole(userId, buildingId);
  return role === "super_admin" || role === "manager";
}

export async function canEditBuilding(userId: string, buildingId: string) {
  return canControlBuilding(userId, buildingId);
}

export async function canEditEverything(userId: string) {
  return (await getUserRole(userId)) === "super_admin";
}

function isLocalDevelopmentUser(userId: string) {
  return process.env.NODE_ENV === "development" && Boolean(userId);
}
