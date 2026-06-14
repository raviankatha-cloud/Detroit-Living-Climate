import type React from "react";
import Link from "next/link";
import { BuildingOverview } from "@/components/building-overview";
import { CountUp } from "@/components/count-up";
import { OutdoorWeatherCard } from "@/components/outdoor-weather-card";
import { APP_DOMAIN, APP_NAME } from "@/lib/brand";
import { needsSetup } from "@/lib/building-status";
import { getAccessibleBuildings } from "@/lib/data/buildings";
import { getDetroitOutdoorWeather } from "@/lib/weather";

export default async function DashboardPage() {
  const [buildings, detroitWeather] = await Promise.all([
    getAccessibleBuildings(),
    getDetroitOutdoorWeather()
  ]);
  const online = buildings.filter((building) => building.status === "online").length;
  const activeAlerts = buildings.reduce((count, building) => count + building.activeAlerts, 0);
  const buildingsWithAlerts = buildings.filter((building) => building.activeAlerts > 0).length;
  const belowSetpoint = buildings.filter((building) => building.differential >= 2).length;
  const needsInstallWifiSetup = buildings.filter(
    (building) => building.status === "offline" || needsSetup(building)
  ).length;
  const avgTemperature =
    buildings.reduce((sum, building) => sum + building.totalAverage, 0) /
    Math.max(buildings.length, 1);
  const portfolioStatus = getPortfolioStatusSentence({
    total: buildings.length,
    offline: buildings.length - online,
    buildingsWithAlerts,
    belowSetpoint,
    needsInstallWifiSetup
  });

  return (
    <>
      <section className="hero-panel dashboard-hero">
        <div>
          <span className="eyebrow">Climate command center</span>
          <h2>{APP_NAME}</h2>
          <p className="portfolio-status">{portfolioStatus}</p>
          <p>Search, triage, and control assigned buildings from one secure internal operations console.</p>
          <span className="domain-line">{APP_DOMAIN}</span>
        </div>
        <div className="hero-side-stack">
          <OutdoorWeatherCard weather={detroitWeather} compact />
          <Link className="button primary" href="/setup">
            Start setup
          </Link>
        </div>
      </section>

      <section className="grid stats-grid" aria-label="Portfolio stats">
        <div className="card stat-card" style={{ "--stat-index": 0 } as React.CSSProperties}>
          <span className="stat-label">Buildings</span>
          <span className="stat-value"><CountUp value={buildings.length} /></span>
        </div>
        <div className="card stat-card" style={{ "--stat-index": 1 } as React.CSSProperties}>
          <span className="stat-label">Online</span>
          <span className="stat-value"><CountUp value={online} /></span>
        </div>
        <div className="card stat-card" style={{ "--stat-index": 2 } as React.CSSProperties}>
          <span className="stat-label">With Alerts</span>
          <span className="stat-value"><CountUp value={buildingsWithAlerts} /></span>
          <span className="stat-note">{activeAlerts} active event{activeAlerts === 1 ? "" : "s"}</span>
        </div>
        <div className="card stat-card" style={{ "--stat-index": 3 } as React.CSSProperties}>
          <span className="stat-label">Below Setpoint</span>
          <span className="stat-value"><CountUp value={belowSetpoint} /></span>
        </div>
        <div className="card stat-card" style={{ "--stat-index": 4 } as React.CSSProperties}>
          <span className="stat-label">Needs Wi-Fi/Setup</span>
          <span className="stat-value"><CountUp value={needsInstallWifiSetup} /></span>
        </div>
        <div className="card stat-card" style={{ "--stat-index": 5 } as React.CSSProperties}>
          <span className="stat-label">Portfolio Avg</span>
          <span className="stat-value"><CountUp value={avgTemperature} decimals={1} suffix="F" /></span>
        </div>
      </section>

      <BuildingOverview buildings={buildings} canSetup={true} />
    </>
  );
}

function getPortfolioStatusSentence({
  total,
  offline,
  buildingsWithAlerts,
  belowSetpoint,
  needsInstallWifiSetup
}: {
  total: number;
  offline: number;
  buildingsWithAlerts: number;
  belowSetpoint: number;
  needsInstallWifiSetup: number;
}) {
  if (total === 0) {
    return "No buildings are assigned yet.";
  }

  if (offline > 0) {
    return `${offline} building${offline === 1 ? "" : "s"} need Wi-Fi or ecobee attention.`;
  }

  if (buildingsWithAlerts > 0 || belowSetpoint > 0) {
    return `${Math.max(buildingsWithAlerts, belowSetpoint)} building${
      Math.max(buildingsWithAlerts, belowSetpoint) === 1 ? "" : "s"
    } need heating review.`;
  }

  if (needsInstallWifiSetup > 0) {
    return `${needsInstallWifiSetup} building${
      needsInstallWifiSetup === 1 ? "" : "s"
    } still need setup or Wi-Fi completion.`;
  }

  return "Portfolio is online and heating appears normal.";
}
