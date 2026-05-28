"use client";

import { useMemo, useState } from "react";

type PendingAction =
  | { kind: "setpoint"; label: string; temperature: number }
  | { kind: "resume"; label: string };

type Props = {
  buildingId: string;
  buildingName: string;
  currentSetpoint: number;
};

export function BuildingControls({ buildingId, buildingName, currentSetpoint }: Props) {
  const [customTemp, setCustomTemp] = useState(String(currentSetpoint));
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepActions = useMemo(
    () => [
      { label: "-5", temperature: currentSetpoint - 5 },
      { label: "-1", temperature: currentSetpoint - 1 },
      { label: "+1", temperature: currentSetpoint + 1 },
      { label: "+5", temperature: currentSetpoint + 5 }
    ],
    [currentSetpoint]
  );

  async function confirmAction() {
    if (!pendingAction) {
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    const endpoint =
      pendingAction.kind === "resume"
        ? `/api/buildings/${buildingId}/controls/resume`
        : `/api/buildings/${buildingId}/controls/setpoint`;

    const body =
      pendingAction.kind === "setpoint"
        ? JSON.stringify({ temperature: pendingAction.temperature, confirmationText })
        : JSON.stringify({ confirmationText });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body
      });
      const payload = (await response.json()) as { message?: string };
      setToast(response.ok ? payload.message ?? "Control change sent." : payload.message ?? "Request failed.");
    } catch {
      setToast("Unable to contact the control endpoint.");
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
      setConfirmationText("");
    }
  }

  function requestCustomSetpoint() {
    const temperature = Number(customTemp);
    if (!Number.isFinite(temperature)) {
      setToast("Enter a valid set temperature.");
      return;
    }

    setPendingAction({
      kind: "setpoint",
      label: `Set ${buildingName} to ${temperature.toFixed(1)}F`,
      temperature
    });
  }

  return (
    <section className="section control-panel">
      <h3>Thermostat Controls</h3>
      <div className="target-temperature">
        <span>Current target</span>
        <strong>{currentSetpoint.toFixed(1)}F</strong>
      </div>
      <p className="section-copy">
        Control requests are confirmed, logged, permission-checked, and sent through the server only.
      </p>
      <div className="control-row">
        {stepActions.map((action) => (
          <button
            className="button"
            key={action.label}
            type="button"
            onClick={() =>
              setPendingAction({
                kind: "setpoint",
                label: `Change setpoint ${action.label}F to ${action.temperature.toFixed(1)}F`,
                temperature: action.temperature
              })
            }
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="custom-control">
        <input
          aria-label="Custom set temperature"
          inputMode="decimal"
          value={customTemp}
          onChange={(event) => setCustomTemp(event.target.value)}
        />
        <button className="button primary" type="button" onClick={requestCustomSetpoint}>
          Set
        </button>
      </div>
      <button
        className="button"
        type="button"
        onClick={() => setPendingAction({ kind: "resume", label: `Resume schedule for ${buildingName}` })}
      >
        Resume schedule
      </button>
      {toast ? <div className="toast">{toast}</div> : null}

      {pendingAction ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h3 id="confirm-title">Confirm control change</h3>
            <p className="muted">{pendingAction.label}</p>
            <p className="muted">
              Type CONFIRM to send this thermostat command.
            </p>
            <input
              aria-label="Secure confirmation"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder="CONFIRM"
            />
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setPendingAction(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                type="button"
                onClick={confirmAction}
                disabled={isSubmitting || confirmationText !== "CONFIRM"}
              >
                {isSubmitting ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
