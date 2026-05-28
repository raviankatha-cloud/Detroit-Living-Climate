import Link from "next/link";
import { AlertTriangle, ClipboardList, Edit3, MapPin } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getBuildingStatusSummary, getSetupStatusLabel } from "@/lib/building-status";
import type { AlertItem, AuditLogItem, BuildingDetail } from "@/lib/types";

export function BuildingDetailHero({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  const summary = getBuildingStatusSummary(building);

  return (
    <section className="building-hero detail-hero">
      <div className="building-title">
        <span className="eyebrow">Building operations</span>
        <h2>{building.name}</h2>
        <p className="address-line hero-address">
          <MapPin size={15} />
          {building.address}
        </p>
        <p className={`building-summary ${building.differential >= 2 || building.status === "offline" ? "attention" : ""}`}>
          {summary}
        </p>
        <div className="hero-actions">
          {canEdit ? (
            <a className="button" href="#building-setup">
              <Edit3 size={16} />
              Edit building
            </a>
          ) : null}
          {canEdit ? (
            <Link className="button ghost" href="/setup">
              Full setup workflow
            </Link>
          ) : null}
          <Link className="button ghost" href="/dashboard">
            Back to portfolio
          </Link>
        </div>
      </div>

      <div className="hero-status-panel">
        <span className="status-pill">
          <span className={`dot ${building.status}`} />
          {building.status === "online" ? "Wi-Fi / ecobee connected" : "Wi-Fi / ecobee offline"}
        </span>
        <span className="status-badge">{getSetupStatusLabel(building.setupStatus)}</span>
      </div>

      <div className="hero-metric-grid">
        <HeroMetric label="Current Reading" value={`${building.thermostatTemperature.toFixed(1)}F`} />
        <HeroMetric label="Setpoint" value={`${building.currentSetpoint.toFixed(1)}F`} />
        <HeroMetric
          label="Differential"
          value={formatDifferentialLabel(building.differential)}
          danger={building.differential >= 2}
        />
        <HeroMetric label="ecobee Outdoor" value={building.outdoorTemperature !== undefined ? `${building.outdoorTemperature.toFixed(1)}F` : "N/A"} />
        <HeroMetric label="Last setpoint change" value={building.lastSetpointChange} />
        <HeroMetric label="Last sync" value={building.lastSyncAt} />
      </div>
    </section>
  );
}

export function ThermostatSummaryPanel({ building }: { building: BuildingDetail }) {
  return (
    <section className="section detail-panel">
      <div className="section-head">
        <div>
          <h2>Thermostat</h2>
          <p className="section-copy">{building.thermostat.referenceLabel ?? "No thermostat label saved yet."}</p>
        </div>
        <span className="status-badge">{getSetupStatusLabel(building.thermostat.setupStatus)}</span>
      </div>
      <dl className="detail-list roomy">
        <div>
          <dt>Thermostat mode</dt>
          <dd>{building.thermostat.mode}</dd>
        </div>
        <div>
          <dt>Setpoint</dt>
          <dd>{building.currentSetpoint.toFixed(1)}F</dd>
        </div>
        <div>
          <dt>Thermostat external ID / device ID</dt>
          <dd>{building.thermostat.externalDeviceId || building.thermostat.ecobeeIdentifier || "Not mapped"}</dd>
        </div>
        <div>
          <dt>Serial/reference</dt>
          <dd>{building.thermostat.serialNumber || "N/A"}</dd>
        </div>
        <div>
          <dt>Reference field</dt>
          <dd>{building.thermostat.deviceReference || "N/A"}</dd>
        </div>
        <div>
          <dt>Location label</dt>
          <dd>{building.thermostat.locationLabel || "N/A"}</dd>
        </div>
        <div>
          <dt>Connection status</dt>
          <dd>{building.thermostat.connectionStatus || "not_connected"}</dd>
        </div>
        <div>
          <dt>Linked ecobee account</dt>
          <dd>{building.thermostat.linkedEcobeeAccount || "N/A"}</dd>
        </div>
        <div>
          <dt>Install notes</dt>
          <dd>{building.thermostat.installNotes || "No thermostat install notes yet."}</dd>
        </div>
        <div>
          <dt>Last setpoint change</dt>
          <dd>{building.lastSetpointChange}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DifferentialSummaryPanel({ building }: { building: BuildingDetail }) {
  const belowTarget = building.differential > 0;
  const isProblem = building.differential >= 2;

  return (
    <section className={`section differential-panel ${isProblem ? "cold-gap" : ""}`}>
      <div className="section-head">
        <div>
          <h2>Thermostat differential</h2>
          <p className="section-copy">Heating gap based on the Thermostat setpoint and current Thermostat reading.</p>
        </div>
        <span className={`status-badge ${isProblem ? "critical" : "success"}`}>
          {belowTarget ? "Below target" : "On target"}
        </span>
      </div>
      <div className="differential-readout">
        <div>
          <span>Setpoint</span>
          <strong>{building.currentSetpoint.toFixed(1)}F</strong>
        </div>
        <div>
          <span>Current Reading</span>
          <strong>{building.thermostatTemperature.toFixed(1)}F</strong>
        </div>
        <div className={isProblem ? "danger-readout" : ""}>
          <span>Differential</span>
          <strong>{formatDifferentialLabel(building.differential)}</strong>
        </div>
      </div>
    </section>
  );
}

export function FloorAveragesSection({ building }: { building: BuildingDetail }) {
  const sensorCounts = new Map<string, number>();

  for (const sensor of building.sensors) {
    sensorCounts.set(sensor.floor, (sensorCounts.get(sensor.floor) ?? 0) + 1);
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Floor averages</h2>
          <p className="section-copy">Floor-level sensor averages for quick cold-spot review.</p>
        </div>
      </div>
      {building.floorAverages.length === 0 ? (
        <EmptyState
          eyebrow="No floor data"
          title="No floor averages yet."
          body="Add sensors and sync readings to calculate floor-level temperatures."
        />
      ) : (
        <div className="floor-health-grid">
          {building.floorAverages.map((floor) => {
            const cold = building.currentSetpoint - floor.average >= 2;

            return (
              <article className={`floor-health-card ${cold ? "cold" : ""}`} key={floor.floor}>
                <div>
                  <span className="stat-label">{floor.floor}</span>
                  <strong>{floor.average.toFixed(1)}F</strong>
                </div>
                <span className="status-badge">{sensorCounts.get(floor.floor) ?? 0} sensors</span>
                {cold ? (
                  <span className="alert-badge">
                    <AlertTriangle size={14} />
                    Running cold
                  </span>
                ) : (
                  <span className="status-badge">On target</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function SetupNotesSection({ building }: { building: BuildingDetail }) {
  const sensorNotes = building.sensors.filter((sensor) => sensor.installNotes || sensor.setupStatus);

  return (
    <section className="section detail-panel">
      <div className="section-head">
        <div>
          <h2>Setup and install notes</h2>
          <p className="section-copy">Field notes for Wi-Fi, thermostat placement, sensor mapping, and install status.</p>
        </div>
        <ClipboardList size={20} />
      </div>
      <dl className="detail-list roomy">
        <div>
          <dt>Building status</dt>
          <dd>{getSetupStatusLabel(building.setupStatus)}</dd>
        </div>
        <div>
          <dt>Wi-Fi status</dt>
          <dd>{getSetupStatusLabel(building.wifiStatus)}</dd>
        </div>
        <div>
          <dt>Thermostat install status</dt>
          <dd>{getSetupStatusLabel(building.thermostatInstallStatus)}</dd>
        </div>
        <div>
          <dt>Sensor install status</dt>
          <dd>{getSetupStatusLabel(building.sensorInstallStatus)}</dd>
        </div>
        <div>
          <dt>Building notes</dt>
          <dd>{building.notes || "No building setup notes yet."}</dd>
        </div>
        <div>
          <dt>Thermostat status</dt>
          <dd>{getSetupStatusLabel(building.thermostat.setupStatus)}</dd>
        </div>
        <div>
          <dt>Thermostat external ID / device ID</dt>
          <dd>{building.thermostat.externalDeviceId || building.thermostat.ecobeeIdentifier || "Not mapped"}</dd>
        </div>
        <div>
          <dt>Thermostat reference field</dt>
          <dd>{building.thermostat.deviceReference || "N/A"}</dd>
        </div>
        <div>
          <dt>Thermostat notes</dt>
          <dd>{building.thermostat.installNotes || "No thermostat install notes yet."}</dd>
        </div>
      </dl>
      {sensorNotes.length > 0 ? (
        <div className="setup-note-list">
          {sensorNotes.slice(0, 8).map((sensor) => (
            <div className="setup-note" key={sensor.id}>
              <strong>#{sensor.sensorNumber} {sensor.name}</strong>
              <span>{getSetupStatusLabel(sensor.setupStatus)}</span>
              <p>{sensor.installNotes || "No sensor install notes saved."}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function BuildingAlertsSection({ alerts }: { alerts: AlertItem[] }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Building alerts</h2>
          <p className="section-copy">Warning, critical, escalation, and recovery history for this building.</p>
        </div>
      </div>
      {alerts.length === 0 ? (
        <EmptyState eyebrow="Clear" title="No alerts for this building." body="Any warning, critical, escalation, or recovery events will appear here." />
      ) : (
        <div className="building-activity-list">
          {alerts.map((alert) => (
            <article className={`activity-card ${alert.severity}`} key={alert.id}>
              <div>
                <span className={`status-badge ${alert.severity}`}>{alert.severity}</span>
                <h3>{alert.message}</h3>
                <p>{alert.status} since {alert.createdAt}</p>
              </div>
              <strong>{alert.differentialF.toFixed(1)}F</strong>
              {alert.events && alert.events.length > 0 ? (
                <div className="activity-events">
                  {alert.events.slice(0, 4).map((event) => (
                    <span key={`${event.createdAt}-${event.message}`}>
                      {event.createdAt}: {event.message}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function BuildingAuditSection({ auditLogs }: { auditLogs: AuditLogItem[] }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Building audit log</h2>
          <p className="section-copy">Thermostat changes, setup edits, and automation actions for this building.</p>
        </div>
      </div>
      {auditLogs.length === 0 ? (
        <EmptyState eyebrow="No activity" title="No building audit events yet." body="Setup edits and thermostat controls will be logged here." />
      ) : (
        <div className="building-activity-list">
          {auditLogs.map((item) => (
            <article className="audit-card" key={item.id}>
              <span className="timeline-dot" />
              <div>
                <h3>{item.action}</h3>
                <p>{item.actor} at {item.createdAt}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HeroMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`hero-metric ${danger ? "danger-metric" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDifferentialLabel(differential: number) {
  if (differential >= 0.05) {
    return `${differential.toFixed(1)}F below target`;
  }

  if (differential <= -0.05) {
    return `${Math.abs(differential).toFixed(1)}F above target`;
  }

  return "0.0F on target";
}
