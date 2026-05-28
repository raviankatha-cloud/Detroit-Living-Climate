"use client";

import { useState } from "react";

type PinSession = {
  sessionId: string;
  ecobeePin: string;
  expiresAt: string;
  intervalSeconds: number;
  scope: string;
};

export function EcobeeSetupPanel() {
  const [session, setSession] = useState<PinSession | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function startPinFlow() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/ecobee/pin/start", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.message ?? "Unable to start PIN authorization.");
        return;
      }

      setSession(payload);
      setMessage("Enter the PIN in the ecobee portal, then return here and exchange it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start PIN authorization.");
    } finally {
      setIsLoading(false);
    }
  }

  async function exchangePin() {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/ecobee/pin/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      const payload = await response.json();
      setMessage(payload.message ?? (response.ok ? "ecobee connected." : "Unable to connect ecobee."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect ecobee.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ecobee-connect-panel">
      <div className="ecobee-actions">
        <a className="button" href="/api/ecobee/authorize">
          Browser OAuth
        </a>
        <button className="button" type="button" onClick={startPinFlow} disabled={isLoading}>
          Start PIN flow
        </button>
      </div>
      {session ? (
        <div className="pin-box">
          <span>ecobee PIN</span>
          <strong>{session.ecobeePin}</strong>
          <p>
            Expires {new Date(session.expiresAt).toLocaleString()} | Poll interval {session.intervalSeconds}s |{" "}
            {session.scope}
          </p>
          <button className="button primary" type="button" onClick={exchangePin} disabled={isLoading}>
            Exchange PIN after approval
          </button>
        </div>
      ) : null}
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
