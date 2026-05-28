import type { BuildingDetail } from "@/lib/types";

export const demoBuildings: BuildingDetail[] = [
  {
    id: "woodward-lofts",
    name: "Woodward Lofts",
    address: "1448 Woodward Ave, Detroit, MI",
    currentSetpoint: 71,
    thermostatTemperature: 68.6,
    outdoorTemperature: 54.2,
    differential: 2.4,
    lastSetpointChange: "May 12, 2026 8:14 AM",
    lastSyncAt: "2 min ago",
    setupStatus: "complete",
    notes: "Mixed-use loft property. Boiler response is slower on upper floors during morning recovery.",
    thermostat: {
      id: "therm-woodward",
      name: "Woodward Main Thermostat",
      ecobeeIdentifier: "ecobee-310944-woodward",
      externalDeviceId: "ecobee-310944-woodward",
      serialNumber: "SN-WDL-88421",
      referenceLabel: "Mechanical room east wall",
      deviceReference: "Asset WDL-T-01",
      installNotes: "Installed near boiler panel. Confirm heat staging before winter pilot.",
      setupStatus: "complete",
      mode: "heat"
    },
    buildingRule: {
      mildDayEnabled: true,
      mildDayOutdoorThresholdF: 65,
      mildDaySetpointReductionF: 2,
      minimumHeatSetpointF: 55
    },
    floors: [
      { id: "wl-f1", name: "Floor 1", sortOrder: 1 },
      { id: "wl-f2", name: "Floor 2", sortOrder: 2 },
      { id: "wl-f3", name: "Floor 3", sortOrder: 3 }
    ],
    units: [
      { id: "wl-u205", label: "205", floor: "Floor 2" },
      { id: "wl-u312", label: "312", floor: "Floor 3" }
    ],
    floorAverages: [
      { floor: "Floor 1", average: 68.9 },
      { floor: "Floor 2", average: 69.5 },
      { floor: "Floor 3", average: 67.8 }
    ],
    totalAverage: 68.7,
    status: "online",
    activeAlerts: 1,
    sensors: [
      {
        id: "wl-101",
        sensorNumber: 1,
        name: "Lobby East Sensor",
        floor: "Floor 1",
        temperature: 69.1,
        occupancy: "occupied",
        lastUpdated: "2 min ago",
        ecobeeIdentifier: "rs-woodward-lobby",
        externalDeviceId: "rs-woodward-lobby",
        serialNumber: "S-WL-001",
        referenceLabel: "Lobby east column",
        deviceReference: "Asset WDL-S-001",
        setupStatus: "complete"
      },
      {
        id: "wl-205",
        sensorNumber: 2,
        name: "Unit 205 Sensor",
        floor: "Floor 2",
        unit: "205",
        temperature: 69.5,
        occupancy: "unoccupied",
        lastUpdated: "3 min ago",
        ecobeeIdentifier: "rs-woodward-205",
        externalDeviceId: "rs-woodward-205",
        serialNumber: "S-WL-205",
        referenceLabel: "Resident supplied location",
        deviceReference: "Asset WDL-S-205",
        setupStatus: "complete"
      },
      {
        id: "wl-312",
        sensorNumber: 3,
        name: "Unit 312 Sensor",
        floor: "Floor 3",
        unit: "312",
        temperature: 67.8,
        occupancy: "occupied",
        lastUpdated: "2 min ago",
        ecobeeIdentifier: "rs-woodward-312",
        externalDeviceId: "rs-woodward-312",
        serialNumber: "S-WL-312",
        referenceLabel: "Bedroom interior wall",
        deviceReference: "Asset WDL-S-312",
        setupStatus: "complete"
      }
    ]
  },
  {
    id: "hubbard-house",
    name: "Hubbard House",
    address: "1710 Hubbard St, Detroit, MI",
    currentSetpoint: 70,
    thermostatTemperature: 69.4,
    outdoorTemperature: 55.1,
    differential: 0.6,
    lastSetpointChange: "May 11, 2026 5:42 PM",
    lastSyncAt: "1 min ago",
    setupStatus: "in_progress",
    notes: "Starting pilot building for field onboarding and clean manual Thermostat/Sensor mapping.",
    thermostat: {
      id: "therm-hubbard",
      name: "Hubbard Main Thermostat",
      ecobeeIdentifier: "ecobee-772010-hubbard",
      externalDeviceId: "ecobee-772010-hubbard",
      serialNumber: "SN-HUB-11002",
      referenceLabel: "Rear hallway",
      deviceReference: "Asset HUB-T-01",
      installNotes: "Manual mapping complete. Awaiting final ecobee sync verification.",
      setupStatus: "in_progress",
      mode: "heat"
    },
    buildingRule: {
      mildDayEnabled: false,
      mildDayOutdoorThresholdF: 65,
      mildDaySetpointReductionF: 2,
      minimumHeatSetpointF: 55
    },
    floors: [
      { id: "hub-f1", name: "Floor 1", sortOrder: 1 },
      { id: "hub-f2", name: "Floor 2", sortOrder: 2 }
    ],
    units: [{ id: "hub-u2b", label: "2B", floor: "Floor 2" }],
    floorAverages: [
      { floor: "Floor 1", average: 70.2 },
      { floor: "Floor 2", average: 69.7 }
    ],
    totalAverage: 69.9,
    status: "online",
    activeAlerts: 0,
    sensors: [
      {
        id: "hub-1",
        sensorNumber: 1,
        name: "Hubbard Lobby Sensor",
        floor: "Floor 1",
        temperature: 70.2,
        occupancy: "occupied",
        lastUpdated: "1 min ago",
        ecobeeIdentifier: "rs-hubbard-lobby",
        externalDeviceId: "rs-hubbard-lobby",
        serialNumber: "S-HUB-001",
        referenceLabel: "Entry lobby wall",
        deviceReference: "Asset HUB-S-001",
        setupStatus: "in_progress"
      },
      {
        id: "hub-2",
        sensorNumber: 2,
        name: "Hubbard Unit 2B Sensor",
        floor: "Floor 2",
        unit: "2B",
        temperature: 69.7,
        occupancy: "unoccupied",
        lastUpdated: "1 min ago",
        ecobeeIdentifier: "rs-hubbard-2b",
        externalDeviceId: "rs-hubbard-2b",
        serialNumber: "S-HUB-2B",
        referenceLabel: "Unit 2B living area",
        deviceReference: "Asset HUB-S-2B",
        setupStatus: "in_progress"
      }
    ]
  },
  {
    id: "mabor-apartments",
    name: "Mabor Apartments",
    address: "811 Mabor Ave, Detroit, MI",
    currentSetpoint: 72,
    thermostatTemperature: 66.8,
    differential: 5.2,
    lastSetpointChange: "May 12, 2026 7:35 AM",
    lastSyncAt: "32 min ago",
    setupStatus: "needs_wifi",
    notes: "Offline/stale Thermostat. Needs on-site Wi-Fi confirmation, identifier confirmation, and Sensor remapping.",
    thermostat: {
      id: "therm-mabor",
      name: "Mabor Main Thermostat",
      ecobeeIdentifier: "ecobee-mabor-pending",
      externalDeviceId: "ecobee-mabor-pending",
      serialNumber: "SN-MBR-PENDING",
      referenceLabel: "To verify on site",
      deviceReference: "Asset MBR-T-PENDING",
      installNotes: "Thermostat was not reporting during latest drive-by setup.",
      setupStatus: "needs_wifi",
      mode: "heat"
    },
    buildingRule: {
      mildDayEnabled: true,
      mildDayOutdoorThresholdF: 65,
      mildDaySetpointReductionF: 2,
      minimumHeatSetpointF: 55
    },
    floors: [
      { id: "mbr-f4", name: "Floor 4", sortOrder: 4 },
      { id: "mbr-f5", name: "Floor 5", sortOrder: 5 }
    ],
    units: [
      { id: "mbr-u401", label: "401", floor: "Floor 4" },
      { id: "mbr-u502", label: "502", floor: "Floor 5" }
    ],
    floorAverages: [
      { floor: "Floor 4", average: 67.2 },
      { floor: "Floor 5", average: 66.1 }
    ],
    totalAverage: 66.7,
    status: "offline",
    activeAlerts: 2,
    sensors: [
      {
        id: "mbr-401",
        sensorNumber: 1,
        name: "Mabor Unit 401 Sensor",
        floor: "Floor 4",
        unit: "401",
        temperature: 67.2,
        lastUpdated: "31 min ago",
        ecobeeIdentifier: "rs-mabor-401",
        externalDeviceId: "rs-mabor-401",
        serialNumber: "S-MBR-401",
        referenceLabel: "Needs verification",
        deviceReference: "Asset MBR-S-401",
        setupStatus: "needs_wifi"
      },
      {
        id: "mbr-502",
        sensorNumber: 2,
        name: "Mabor Unit 502 Sensor",
        floor: "Floor 5",
        unit: "502",
        temperature: 66.1,
        lastUpdated: "32 min ago",
        ecobeeIdentifier: "rs-mabor-502",
        externalDeviceId: "rs-mabor-502",
        serialNumber: "S-MBR-502",
        referenceLabel: "Needs verification",
        deviceReference: "Asset MBR-S-502",
        setupStatus: "needs_wifi"
      }
    ]
  }
];

export const demoAlerts = [
  {
    id: "alert-woodward-warning",
    buildingName: "Woodward Lofts",
    severity: "warning" as const,
    status: "active" as const,
    message: "Thermostat is 2.4F below setpoint for more than 10 minutes.",
    differentialF: 2.4,
    createdAt: "May 12, 2026 8:24 AM"
  },
  {
    id: "alert-mabor-critical",
    buildingName: "Mabor Apartments",
    severity: "critical" as const,
    status: "active" as const,
    message: "Offline Thermostat and widening heat gap require field review.",
    differentialF: 5.2,
    createdAt: "May 12, 2026 8:05 AM"
  },
  {
    id: "alert-hubbard-recovered",
    buildingName: "Hubbard House",
    severity: "recovered" as const,
    status: "recovered" as const,
    message: "Differential recovered below 1.0F after schedule resumed.",
    differentialF: 0.6,
    createdAt: "May 11, 2026 6:18 PM"
  }
];

export const demoAuditLogs = [
  {
    id: "audit-1",
    actor: "Ravi Ankatha",
    buildingName: "Woodward Lofts",
    action: "Changed heat setpoint from 69F to 71F",
    createdAt: "May 12, 2026 8:14 AM"
  },
  {
    id: "audit-2",
    actor: "System automation",
    buildingName: "Hubbard House",
    action: "Skipped mild-day rule because outdoor temperature was 55.1F",
    createdAt: "May 12, 2026 8:00 AM"
  },
  {
    id: "audit-3",
    actor: "Ravi Ankatha",
    buildingName: "Mabor Apartments",
    action: "Marked Thermostat setup status as needs Wi-Fi",
    createdAt: "May 12, 2026 7:55 AM"
  }
];
