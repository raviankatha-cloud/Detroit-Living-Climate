export type UserRole = "super_admin" | "manager" | "read_only";
export type ConnectionStatus = "online" | "offline";
export type AlertSeverity = "warning" | "critical" | "escalation" | "recovered";
export type SetupStatus =
  | "draft"
  | "needs_mapping"
  | "mapped"
  | "ready"
  | "synced"
  | "archived"
  | "needs_install"
  | "needs_wifi"
  | "needs_sensor_setup"
  | "needs_thermostat_move"
  | "in_progress"
  | "complete";

export type FloorAverage = {
  floor: string;
  average: number;
};

export type FloorConfig = {
  id: string;
  name: string;
  sortOrder: number;
};

export type UnitConfig = {
  id: string;
  label: string;
  floor: string;
};

export type ThermostatConfig = {
  id: string;
  name: string;
  ecobeeIdentifier: string;
  externalDeviceId?: string;
  serialNumber?: string;
  referenceLabel?: string;
  locationLabel?: string;
  deviceReference?: string;
  installNotes?: string;
  setupStatus: SetupStatus;
  connectionStatus?: string;
  linkedEcobeeAccount?: string;
  mode: "heat" | "auto" | "off";
};

export type BuildingRuleConfig = {
  mildDayEnabled: boolean;
  mildDayOutdoorThresholdF: number;
  mildDaySetpointReductionF: number;
  minimumHeatSetpointF: number;
};

export type SensorDetail = {
  id: string;
  sensorNumber: number;
  name: string;
  floor: string;
  unit?: string;
  temperature: number;
  occupancy?: "occupied" | "unoccupied";
  lastUpdated: string;
  ecobeeIdentifier?: string;
  externalDeviceId?: string;
  serialNumber?: string;
  referenceLabel?: string;
  deviceReference?: string;
  installNotes?: string;
  setupStatus?: SetupStatus;
};

export type BuildingSummary = {
  id: string;
  name: string;
  address: string;
  currentSetpoint: number;
  thermostatTemperature: number;
  outdoorTemperature?: number;
  differential: number;
  lastSetpointChange: string;
  floorAverages: FloorAverage[];
  totalAverage: number;
  status: ConnectionStatus;
  activeAlerts: number;
  notes?: string;
  lastSyncAt: string;
  setupStatus: SetupStatus;
  wifiStatus?: SetupStatus;
  thermostatInstallStatus?: SetupStatus;
  sensorInstallStatus?: SetupStatus;
  thermostat: ThermostatConfig;
};

export type BuildingDetail = BuildingSummary & {
  floors: FloorConfig[];
  units: UnitConfig[];
  sensors: SensorDetail[];
  buildingRule: BuildingRuleConfig;
};

export type AlertItem = {
  id: string;
  buildingName: string;
  severity: AlertSeverity;
  status: "active" | "recovered";
  message: string;
  differentialF: number;
  createdAt: string;
  events?: Array<{
    severity: AlertSeverity;
    message: string;
    createdAt: string;
  }>;
};

export type AuditLogItem = {
  id: string;
  actor: string;
  buildingName: string;
  action: string;
  createdAt: string;
};
