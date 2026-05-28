"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getBuildingStatusSummary, getSetupStatusLabel, needsSetup } from "@/lib/building-status";
import type { BuildingSummary } from "@/lib/types";

type Props = {
  buildings: BuildingSummary[];
  canSetup?: boolean;
};

export function BuildingOverview({ buildings, canSetup = false }: Props) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredBuildings = useMemo(() => {
    if (!normalizedQuery) {
      return buildings;
    }

    return buildings.filter((building) => building.name.toLowerCase().includes(normalizedQuery));
  }, [buildings, normalizedQuery]);

  if (buildings.length === 0) {
    return (
      <EmptyState
        eyebrow="No buildings"
        title="No assigned buildings yet."
        body="Create a building from setup or ask a super_admin to assign your account to one."
        href={canSetup ? "/setup" : undefined}
        action={canSetup ? "Open setup" : undefined}
      />
    );
  }

  return (
    <section className="building-directory" aria-label="Buildings">
      <div className="directory-toolbar">
        <div>
          <span className="eyebrow">Buildings</span>
          <h2>Open a building</h2>
          <p className="section-copy">
            Search by building name or scan the portfolio status cards below.
          </p>
        </div>
        <label className="building-search">
          <Search size={18} />
          <input
            aria-label="Search buildings by name"
            placeholder="Search building name..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="result-count">
        Showing {filteredBuildings.length} of {buildings.length} buildings
      </div>

      {filteredBuildings.length === 0 ? (
        <EmptyState
          eyebrow="No match"
          title="No buildings match that search."
          body="Clear the search field or try another building name."
        />
      ) : (
        <div className="building-list">
          {filteredBuildings.map((building) => (
            <BuildingPreview building={building} key={building.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function BuildingPreview({ building }: { building: BuildingSummary }) {
  const router = useRouter();
  const summary = getBuildingStatusSummary(building);
  const attention = building.status === "offline" || building.differential >= 2 || needsSetup(building);
  const buildingHref = `/buildings/${building.id}` as Route;

  function openBuilding(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("a,button,input,select,textarea")) {
      return;
    }

    router.push(buildingHref);
  }

  return (
    <article className={`building-card ${attention ? "needs-attention" : ""}`} onClick={openBuilding}>
      <div className="building-card-main">
        <div className="card-topline">
          <span className="status-badge">
            <span className={`dot ${building.status}`} />
            {building.status === "online" ? "Wi-Fi / ecobee connected" : "Wi-Fi / ecobee offline"}
          </span>
          {building.activeAlerts > 0 ? (
            <span className="alert-badge">{building.activeAlerts} alert{building.activeAlerts === 1 ? "" : "s"}</span>
          ) : null}
        </div>

        <Link href={buildingHref} className="building-card-title">
          {building.name}
        </Link>
        <p className="address-line">
          <MapPin size={14} />
          {building.address}
        </p>
        <p className={`building-summary ${attention ? "attention" : ""}`}>{summary}</p>
      </div>

      <div className="building-card-metrics">
        <Metric label="Setpoint" value={`${building.currentSetpoint.toFixed(1)}F`} />
        <Metric label="Current Reading" value={`${building.thermostatTemperature.toFixed(1)}F`} />
        <Metric
          label="Differential"
          value={formatDifferentialLabel(building.differential)}
          danger={building.differential >= 2}
        />
        <Metric label="Sensor Avg" value={`${building.totalAverage.toFixed(1)}F`} />
        <Metric
          label="ecobee Outdoor"
          value={building.outdoorTemperature !== undefined ? `${building.outdoorTemperature.toFixed(1)}F` : "N/A"}
        />
        <Metric label="Setup" value={getSetupStatusLabel(building.setupStatus)} muted={!needsSetup(building)} />
      </div>

      <div className="building-card-actions">
        <span className="microcopy">Synced {building.lastSyncAt}</span>
        <Link href={buildingHref} className="open-link">
          Open
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  danger = false,
  muted = false
}: {
  label: string;
  value: string;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`preview-metric ${danger ? "danger-metric" : ""} ${muted ? "muted-metric" : ""}`}>
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
