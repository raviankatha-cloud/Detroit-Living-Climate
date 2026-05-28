import type { BuildingSummary, SetupStatus } from "@/lib/types";

export const setupStatusLabels: Record<SetupStatus, string> = {
  draft: "In Progress",
  needs_mapping: "Needs Sensor Setup",
  mapped: "In Progress",
  ready: "In Progress",
  synced: "Complete",
  archived: "Archived",
  needs_install: "Needs Install",
  needs_wifi: "Needs Wi-Fi",
  needs_sensor_setup: "Needs Sensor Setup",
  needs_thermostat_move: "Needs Thermostat Move",
  in_progress: "In Progress",
  complete: "Complete"
};

export const editableSetupStatuses: Array<{ value: SetupStatus; label: string }> = [
  { value: "needs_install", label: "Needs Install" },
  { value: "needs_wifi", label: "Needs Wi-Fi" },
  { value: "needs_sensor_setup", label: "Needs Sensor Setup" },
  { value: "needs_thermostat_move", label: "Needs Thermostat Move" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" }
];

export function needsSetup(building: Pick<BuildingSummary, "setupStatus">) {
  return ["draft", "needs_mapping", "mapped", "ready", "needs_install", "needs_wifi", "needs_sensor_setup", "needs_thermostat_move", "in_progress"].includes(
    building.setupStatus
  );
}

export function toEditableSetupStatus(status: SetupStatus | undefined): SetupStatus {
  if (status === "synced" || status === "complete") {
    return "complete";
  }

  if (status === "needs_mapping") {
    return "needs_sensor_setup";
  }

  if (status === "archived") {
    return "complete";
  }

  if (status === "draft" || status === "mapped" || status === "ready" || !status) {
    return "in_progress";
  }

  return status;
}

export function getSetupStatusLabel(status: SetupStatus | undefined) {
  return status ? setupStatusLabels[status] ?? status.replaceAll("_", " ") : "In Progress";
}

export function getBuildingStatusSummary(building: BuildingSummary) {
  if (building.setupStatus === "needs_wifi") {
    return "Setup pending: Wi-Fi required before monitoring can begin.";
  }

  if (building.status === "offline") {
    return "Offline: ecobee has not reported recently.";
  }

  if (needsSetup(building)) {
    return "Setup pending: Thermostat or Sensors mapping work is still required.";
  }

  if (building.differential >= 3) {
    return "Critical: temperature continues dropping below setpoint.";
  }

  if (building.differential >= 2) {
    return `Warning: indoor temp is ${building.differential.toFixed(1)}F below setpoint.`;
  }

  return "On target. Heating appears normal.";
}
