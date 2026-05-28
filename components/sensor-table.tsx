import { Edit3, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getSetupStatusLabel } from "@/lib/building-status";
import type { SensorDetail } from "@/lib/types";

export function SensorTable({ sensors, editable = false }: { sensors: SensorDetail[]; editable?: boolean }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Sensors</h2>
          <p className="section-copy">Sensor readings with manual mapping metadata for floor and unit assignments.</p>
        </div>
        {editable ? (
          <a className="button" href="#sensor-setup">
            <Plus size={16} />
            Add sensor
          </a>
        ) : null}
      </div>
      {sensors.length === 0 ? (
        <EmptyState
          eyebrow="No sensors"
          title="No sensors are mapped yet."
          body="Add sensor records during field setup, then assign each one to a floor and optional unit."
          href={editable ? "#sensor-setup" : undefined}
          action={editable ? "Add sensor mapping" : undefined}
        />
      ) : null}
      <div className="sensor-grid">
        {sensors.map((sensor) => {
          const hasTemperature = Number.isFinite(sensor.temperature);

          return (
            <article className="sensor-card" key={sensor.id}>
              <div className="card-topline">
                <span className="sensor-number">#{sensor.sensorNumber}</span>
                <span className="status-badge">{getSetupStatusLabel(sensor.setupStatus)}</span>
              </div>
              <h3>{sensor.name}</h3>
              <div className="metric-row compact">
                <div>
                  <span>Temperature</span>
                  <strong>{hasTemperature ? `${sensor.temperature.toFixed(1)}F` : "No reading"}</strong>
                </div>
                <div>
                  <span>Floor</span>
                  <strong>{sensor.floor}</strong>
                </div>
                <div>
                  <span>Unit</span>
                  <strong>{sensor.unit ?? "Common"}</strong>
                </div>
              </div>
              <p className="sensor-summary">
                {sensor.occupancy ? `${sensor.occupancy} | ` : ""}
                Updated {sensor.lastUpdated}
              </p>
              <dl className="detail-list">
                <div>
                  <dt>Occupancy</dt>
                  <dd>{sensor.occupancy ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Sensor external ID / device ID</dt>
                  <dd>{sensor.externalDeviceId ?? sensor.ecobeeIdentifier ?? "Not mapped"}</dd>
                </div>
                <div>
                  <dt>Serial/reference</dt>
                  <dd>{sensor.serialNumber ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Reference field</dt>
                  <dd>{sensor.deviceReference ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{sensor.lastUpdated}</dd>
                </div>
              </dl>
              {editable ? (
                <a className="button ghost" href="#sensor-setup">
                  <Edit3 size={16} />
                  Edit mapping
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
