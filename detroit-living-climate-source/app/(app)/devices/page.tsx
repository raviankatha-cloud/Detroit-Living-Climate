import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getAccessibleBuildingDetails } from "@/lib/data/buildings";
import { getEcobeeDeviceDiscoveries } from "@/lib/data/ecobee";

export default async function DevicesPage() {
  const [buildings, discoveries] = await Promise.all([
    getAccessibleBuildingDetails(),
    getEcobeeDeviceDiscoveries()
  ]);

  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Thermostats and Sensors</span>
          <h2>Thermostats and sensors</h2>
          <p className="section-copy">Manual Thermostat and Sensor records that future ecobee sync can match against returned identifiers.</p>
        </div>
        <Link className="button primary" href="/setup">
          <Plus size={16} />
          Add Thermostat or Sensor
        </Link>
      </section>

      <section className="device-list">
        {buildings.length === 0 ? (
          <EmptyState
            eyebrow="No mappings"
            title="No Thermostat or Sensor mappings are available."
            body="Create a building and add thermostat and sensor records from the setup workflow."
            href="/setup"
            action="Start setup"
          />
        ) : null}
        {buildings.map((building) => (
          <article className="section" key={building.id}>
            <div className="section-head">
              <div>
                <h2>{building.name}</h2>
                <p className="section-copy">{building.address}</p>
              </div>
              <span className="status-badge">{building.setupStatus}</span>
            </div>
            <div className="device-grid">
              <div className="device-card">
                <span className="eyebrow">Thermostat</span>
                <h3>{building.thermostat.name}</h3>
                <p>{building.thermostat.externalDeviceId ?? building.thermostat.ecobeeIdentifier ?? "Not mapped"}</p>
                <span className="status-badge">{building.thermostat.setupStatus}</span>
              </div>
              {building.sensors.map((sensor) => (
                <div className="device-card" key={sensor.id}>
                  <span className="eyebrow">Sensor #{sensor.sensorNumber}</span>
                  <h3>{sensor.name}</h3>
                  <p>{sensor.externalDeviceId ?? sensor.ecobeeIdentifier ?? "Not mapped"}</p>
                  <span className="status-badge">{sensor.floor}{sensor.unit ? ` / ${sensor.unit}` : ""}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Discovered from ecobee</h2>
            <p className="section-copy">Thermostats and Sensors seen during sync. Use these external IDs when mapping records.</p>
          </div>
          <span className="status-badge">{discoveries.length} seen</span>
        </div>
        {discoveries.length === 0 ? (
          <EmptyState
            eyebrow="No live discoveries"
            title="No ecobee Thermostats or Sensors have been discovered yet."
            body="Connect ecobee and run the sync endpoint. Discovered thermostats and remote sensors will appear here."
          />
        ) : (
          <div className="device-grid">
            {discoveries.map((device) => (
              <div className="device-card" key={device.id}>
                <span className="eyebrow">{formatDiscoveryType(device.deviceType)}</span>
                <h3>{device.displayName}</h3>
                <p>{device.externalId}</p>
                <span className={`status-badge ${device.isMapped ? "success" : "warning"}`}>
                  {device.isMapped ? "Mapped" : "Unmapped"}
                </span>
                <span className="muted-small">
                  Thermostat {device.thermostatIdentifier} | Seen {device.lastSeenAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function formatDiscoveryType(type: string) {
  if (type === "remote_sensor") {
    return "Sensor";
  }

  if (type === "thermostat") {
    return "Thermostat";
  }

  return "Thermostat/Sensor";
}
