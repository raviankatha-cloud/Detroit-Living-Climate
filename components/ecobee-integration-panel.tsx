"use client";

import { useState, type FormEvent } from "react";
import { Cable, RefreshCcw, ShieldCheck } from "lucide-react";
import type { EcobeeIntegrationStatus } from "@/lib/data/ecobee-status";

type PinState = {
  sessionId?: string;
  ecobeePin?: string;
  expiresAt?: string;
  message?: string;
  status: "idle" | "success" | "error";
};

export function EcobeeIntegrationPanel({ status }: { status: EcobeeIntegrationStatus }) {
  const [pinState, setPinState] = useState<PinState>({ status: "idle" });
  const [syncState, setSyncState] = useState<PinState>({ status: "idle" });

  async function startPinConnection() {
    setPinState({ status: "idle" });

    try {
      const response = await fetch("/api/ecobee/pin/start", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to start ecobee PIN flow.");
      }

      setPinState({
        status: "success",
        sessionId: payload.sessionId,
        ecobeePin: payload.ecobeePin,
        expiresAt: payload.expiresAt,
        message: payload.message
      });
    } catch (error) {
      setPinState({ status: "error", message: error instanceof Error ? error.message : "Unable to start ecobee PIN flow." });
    }
  }

  async function finishPinConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sessionId = String(form.get("sessionId") ?? pinState.sessionId ?? "");
    setPinState((current) => ({ ...current, status: "idle" }));

    try {
      const response = await fetch("/api/ecobee/pin/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to complete ecobee connection.");
      }

      setPinState({ status: "success", message: payload.message });
    } catch (error) {
      setPinState({ status: "error", message: error instanceof Error ? error.message : "Unable to complete ecobee connection." });
    }
  }

  async function runSync() {
    setSyncState({ status: "idle" });

    try {
      const response = await fetch("/api/sync/ecobee?force=true", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to run ecobee sync.");
      }

      setSyncState({
        status: "success",
        message: `Sync complete: ${payload.thermostatsSynced ?? 0} Thermostats, ${payload.sensorsSynced ?? 0} Sensors.`
      });
    } catch (error) {
      setSyncState({ status: "error", message: error instanceof Error ? error.message : "Unable to run ecobee sync." });
    }
  }

  return (
    <section className="section install-section" id="ecobee-integration">
      <div className="section-head">
        <div>
          <span className="eyebrow">ecobee / SmartBuildings Integration</span>
          <h2>{status.mode === "smartbuildings" ? "SmartBuildings connected" : "Connect ecobee account"}</h2>
          <p className="section-copy">
            {status.mode === "smartbuildings"
              ? "Using SmartBuildings client credentials. Token is fetched automatically — no PIN or OAuth required."
              : "Server-side account authorization, token storage, refresh, and portfolio sync readiness."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`connection-ring ${status.accountConnected ? "connected" : ""}`}>
            <span className={`dot ${status.accountConnected ? "online" : "offline"}`} />
          </span>
          <span className={`status-badge ${status.accountConnected ? "success" : "warning"}`}>
            {status.accountConnected ? "Account connected" : "Not connected"}
          </span>
        </div>
      </div>

      <div className="integration-grid">
        <StatusTile label="API ready status" value={status.apiReady ? "Ready" : "Needs configuration"} ok={status.apiReady} />
        <StatusTile
          label="Integration mode"
          value={status.mode === "smartbuildings" ? "SmartBuildings" : "Consumer ecobee"}
          ok={status.mode === "smartbuildings" ? status.smartBuildingsConfigured : status.appKeyConfigured}
        />
        <StatusTile label="Supabase token store" value={status.supabaseConfigured ? "Ready" : "Missing"} ok={status.supabaseConfigured} />
        <StatusTile label="Last sync time" value={status.lastSyncAt ?? "No sync yet"} ok={status.lastSyncStatus === "success"} />
      </div>

      {status.mode === "smartbuildings" ? (
        <div className="integration-actions">
          <button className="button primary" type="button" onClick={runSync}>
            <RefreshCcw size={16} />
            Test SmartBuildings auth &amp; sync
          </button>
          <p style={{ margin: "0", color: "var(--muted)", fontSize: "13px" }}>
            SmartBuildings uses client credentials — no PIN or browser auth needed. Add
            SMARTBUILDINGS_CLIENT_ID and SMARTBUILDINGS_CLIENT_SECRET to .env.local, then run sync.
          </p>
        </div>
      ) : (
        <div className="integration-actions">
          <a className="button primary" href="/api/ecobee/authorize">
            <Cable size={16} />
            Connect ecobee Account
          </a>
          <button className="button" type="button" onClick={startPinConnection}>
            <ShieldCheck size={16} />
            Start PIN connection
          </button>
          <button className="button ghost" type="button" onClick={runSync}>
            <RefreshCcw size={16} />
            Refresh / sync now
          </button>
        </div>
      )}

      {pinState.ecobeePin ? (
        <form className="pin-connect-card" onSubmit={finishPinConnection}>
          <div>
            <span className="eyebrow">ecobee PIN</span>
            <strong>{pinState.ecobeePin}</strong>
            <p>Enter this PIN in the ecobee portal, then finish the connection here.</p>
          </div>
          <input name="sessionId" defaultValue={pinState.sessionId} aria-label="ecobee PIN session id" />
          <button className="button primary" type="submit">Finish connection</button>
        </form>
      ) : null}

      {pinState.message ? <div className={`toast ${pinState.status}`}>{pinState.message}</div> : null}
      {syncState.message ? <div className={`toast ${syncState.status}`}>{syncState.message}</div> : null}
      {status.lastSyncMessage ? <p className="muted-small">Last sync: {status.lastSyncMessage}</p> : null}
    </section>
  );
}

function StatusTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="integration-status-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={`dot ${ok ? "online" : "offline"}`} />
    </div>
  );
}

