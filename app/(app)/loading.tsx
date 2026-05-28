import { APP_NAME } from "@/lib/brand";

export default function Loading() {
  return (
    <section className="hero-panel compact-hero">
      <div>
        <span className="eyebrow">Loading</span>
        <h2>Preparing {APP_NAME}.</h2>
        <p>Pulling the latest building, Thermostat, Sensor, and alert context.</p>
      </div>
      <span className="status-badge">Secure session</span>
    </section>
  );
}
