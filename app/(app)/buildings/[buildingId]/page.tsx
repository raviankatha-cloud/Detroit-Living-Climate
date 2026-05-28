import { auth } from "@clerk/nextjs/server";
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
import { OutdoorWeatherCard } from "@/components/outdoor-weather-card";
import { SensorTable } from "@/components/sensor-table";
import { canEditBuilding } from "@/lib/auth/permissions";
import { getBuildingDetail } from "@/lib/data/buildings";
import { getBuildingAlertItems, getBuildingAuditLogItems } from "@/lib/data/operations";
import { getDetroitOutdoorWeather } from "@/lib/weather";

type Props = {
  params: Promise<{ buildingId: string }>;
};

export default async function BuildingPage({ params }: Props) {
  const { buildingId } = await params;
  const { userId } = await auth();
  const building = await getBuildingDetail(buildingId);

  if (!building) {
    notFound();
  }

  const canEdit = userId ? await canEditBuilding(userId, building.id) : false;
  const [alerts, auditLogs, detroitWeather] = await Promise.all([
    getBuildingAlertItems(building.id),
    getBuildingAuditLogItems(building.id),
    getDetroitOutdoorWeather()
  ]);

  return (
    <>
      <BuildingDetailHero building={building} canEdit={canEdit} />

      <section className="building-detail-layout">
        <div className="grid">
          <ThermostatSummaryPanel building={building} />
          <DifferentialSummaryPanel building={building} />
          <FloorAveragesSection building={building} />
          <SensorTable sensors={building.sensors} editable={canEdit} />
          <SetupNotesSection building={building} />
          <BuildingAlertsSection alerts={alerts} />
          <BuildingAuditSection auditLogs={auditLogs} />
          <section className="section form-section" id="building-setup">
            <div className="section-head">
              <div>
                <h2>Building setup editor</h2>
                <p className="section-copy">
                  {canEdit
                    ? "Edit building information, manual mapping, notes, and install status while on site."
                    : "Your role can view this building but cannot edit it."}
                </p>
              </div>
            </div>
            <BuildingEditForm building={building} canEdit={canEdit} />
            <div className="divider" />
            <ThermostatEditForm building={building} canEdit={canEdit} />
          </section>
          <div id="sensor-setup">
            <FloorUnitSensorEditor building={building} canEdit={canEdit} />
          </div>
        </div>
        <aside className="building-side-panel">
          <OutdoorWeatherCard weather={detroitWeather} compact />
          {canEdit ? (
            <BuildingControls
              buildingId={building.id}
              buildingName={building.name}
              currentSetpoint={building.currentSetpoint}
            />
          ) : (
            <section className="section control-panel">
              <h3>Thermostat Controls</h3>
              <p className="section-copy">Read-only users can view climate status but cannot change thermostat settings.</p>
            </section>
          )}
        </aside>
      </section>
    </>
  );
}
