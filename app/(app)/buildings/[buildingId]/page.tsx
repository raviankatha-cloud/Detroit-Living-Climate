import { notFound } from "next/navigation";
import { BuildingEditForm, FloorUnitSensorEditor, ThermostatEditForm } from "@/components/admin-forms";
import {
  BuildingAlertsSection,
  BuildingAuditSection,
  BuildingDetailHero,
  DifferentialSummaryPanel,
  FloorAveragesSection,
  SetupNotesSection,
  ThermostatSummaryPanel
} from "@/components/building-detail-sections";
import { BuildingControls } from "@/components/building-controls";
import { DeviceSetupPanel } from "@/components/device-setup-panel";
import { OutdoorWeatherCard } from "@/components/outdoor-weather-card";
import { SensorTable } from "@/components/sensor-table";
import { getBuildingDetail } from "@/lib/data/buildings";
import { getBuildingAlertItems, getBuildingAuditLogItems } from "@/lib/data/operations";
import { getDetroitOutdoorWeather } from "@/lib/weather";

type Props = {
  params: Promise<{ buildingId: string }>;
};

export default async function BuildingPage({ params }: Props) {
  const { buildingId } = await params;
  const building = await getBuildingDetail(buildingId);

  if (!building) {
    notFound();
  }

  const [alerts, auditLogs, detroitWeather] = await Promise.all([
    getBuildingAlertItems(building.id),
    getBuildingAuditLogItems(building.id),
    getDetroitOutdoorWeather()
  ]);

  return (
    <>
      <BuildingDetailHero building={building} canEdit={true} />

      <section className="building-detail-layout">
        <div className="grid">
          <ThermostatSummaryPanel building={building} />
          <DifferentialSummaryPanel building={building} />
          <FloorAveragesSection building={building} />
          <SensorTable sensors={building.sensors} editable={true} />
          <SetupNotesSection building={building} />
          <BuildingAlertsSection alerts={alerts} />
          <BuildingAuditSection auditLogs={auditLogs} />
          <section className="section form-section" id="building-setup">
            <div className="section-head">
              <div>
                <h2>Building setup editor</h2>
                <p className="section-copy">Edit building information, manual mapping, notes, and install status while on site.</p>
              </div>
            </div>
            <BuildingEditForm building={building} canEdit={true} />
            <div className="divider" />
            <ThermostatEditForm building={building} canEdit={true} />
          </section>
          <div id="sensor-setup">
            <FloorUnitSensorEditor building={building} canEdit={true} />
          </div>
          <DeviceSetupPanel building={building} />
        </div>
        <aside className="building-side-panel">
          <OutdoorWeatherCard weather={detroitWeather} compact />
          <BuildingControls
            buildingId={building.id}
            buildingName={building.name}
            currentSetpoint={building.currentSetpoint}
          />
        </aside>
      </section>
    </>
  );
}
