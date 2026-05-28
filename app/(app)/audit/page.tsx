import { getAuditLogItems } from "@/lib/data/operations";
import { EmptyState } from "@/components/empty-state";

export default async function AuditPage() {
  const auditLogs = await getAuditLogItems();

  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Audit log</span>
          <h2>Operational history</h2>
          <p className="section-copy">Thermostat changes, setup edits, automation actions, and sync activity.</p>
        </div>
      </section>

      <section className="timeline">
        {auditLogs.length === 0 ? (
          <EmptyState
            eyebrow="No activity"
            title="No audit log entries yet."
            body="Thermostat controls, setup edits, automation, and sync events will appear here."
          />
        ) : null}
        {auditLogs.map((item) => (
          <article className="timeline-item" key={item.id}>
            <span className="timeline-dot" />
            <div>
              <h3>{item.action}</h3>
              <p>
                {item.actor} at {item.buildingName}
              </p>
              <span>{item.createdAt}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
