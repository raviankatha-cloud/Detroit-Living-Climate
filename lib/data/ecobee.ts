import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/auth/permissions";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type EcobeeDeviceDiscovery = {
  id: string;
  thermostatIdentifier: string;
  buildingId?: string;
  deviceType: string;
  externalId: string;
  displayName: string;
  isMapped: boolean;
  lastSeenAt: string;
};

export async function getEcobeeDeviceDiscoveries(): Promise<EcobeeDeviceDiscovery[]> {
  const { userId } = await auth();
  const supabase = createServiceSupabaseClient();

  if (!supabase || !userId) {
    return [];
  }

  let query = supabase
    .from("ecobee_device_discoveries")
    .select("id, thermostat_identifier, thermostat_id, building_id, device_type, external_id, display_name, mapped_sensor_id, last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(80);

  if ((await getUserRole(userId)) !== "super_admin") {
    const { data: access } = await supabase
      .from("user_building_access")
      .select("building_id")
      .eq("clerk_user_id", userId)
      .not("building_id", "is", null);
    const buildingIds = (access ?? []).map((row) => row.building_id).filter(Boolean);

    if (buildingIds.length === 0) {
      return [];
    }

    query = query.in("building_id", buildingIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load ecobee discoveries", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    thermostatIdentifier: row.thermostat_identifier,
    buildingId: row.building_id ?? undefined,
    deviceType: row.device_type,
    externalId: row.external_id,
    displayName: row.display_name ?? row.external_id,
    isMapped: Boolean(row.thermostat_id || row.mapped_sensor_id),
    lastSeenAt: formatTimeAgo(row.last_seen_at)
  }));
}

function formatTimeAgo(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  return `${Math.round(minutes / 60)} hr ago`;
}
