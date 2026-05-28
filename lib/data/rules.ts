import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type BuildingRuleSummary = {
  buildingId: string;
  buildingName: string;
  address: string;
  mildDayEnabled: boolean;
  mildDayOutdoorThresholdF: number;
  mildDaySetpointReductionF: number;
  minimumHeatSetpointF: number;
};

export async function getBuildingRuleSummaries(): Promise<BuildingRuleSummary[]> {
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data: buildings, error } = await supabase
    .from("buildings")
    .select(
      "id, name, address, building_rules(mild_day_enabled, mild_day_outdoor_threshold_f, mild_day_setpoint_reduction_f, minimum_heat_setpoint_f)"
    )
    .is("archived_at", null)
    .order("name");

  if (error) {
    console.error("Unable to load building rules", error);
    return [];
  }

  return (buildings ?? []).map((building: any) => {
    const rule = Array.isArray(building.building_rules) ? building.building_rules[0] : building.building_rules;

    return {
      buildingId: building.id,
      buildingName: building.name,
      address: building.address,
      mildDayEnabled: Boolean(rule?.mild_day_enabled),
      mildDayOutdoorThresholdF: Number(rule?.mild_day_outdoor_threshold_f ?? 65),
      mildDaySetpointReductionF: Number(rule?.mild_day_setpoint_reduction_f ?? 2),
      minimumHeatSetpointF: Number(rule?.minimum_heat_setpoint_f ?? 55)
    };
  });
}
