import { getAlertItems } from "@/lib/data/operations";
import { EmptyState } from "@/components/empty-state";

export default async function AlertsPage() {
  const alerts = await getAlertItems();

  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Alerts</span>
          <h2>Temperature exceptions</h2>
          <p className="section-copy">In-app alerts with escalation rules for email and web push notification delivery.</p>
        </div>
      </section>

      <section className="alert-list">
        {alerts.length === 0 ? (
          <EmptyState
            eyebrow="Clear"
            title="No alert history yet."
            body="Warning, critical, escalation, and recovery events will appear here as sync runs evaluate thermostat snapshots."
          />
        ) : null}
        {alerts.map((alert) => (
          <article className={`alert-card ${alert.severity}`} key={alert.id}>
            <div>
              <span className={`status-badge ${alert.severity}`}>{alert.severity}</span>
              <h3>{alert.buildingName}</h3>
              <p>{alert.message}</p>
              {alert.events && alert.events.length > 0 ? (
                <div className="activity-events">
                  {alert.events.slice(0, 3).map((event) => (
                    <span key={`${event.createdAt}-${event.message}`}>
                      {event.createdAt}: {event.message}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="alert-side">
              <strong>{alert.differentialF.toFixed(1)}F</strong>
              <span>{alert.createdAt}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
