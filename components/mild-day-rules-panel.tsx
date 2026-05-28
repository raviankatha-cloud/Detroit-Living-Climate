"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BuildingRuleSummary } from "@/lib/data/rules";

type SaveState = {
  id: string;
  status: "idle" | "success" | "error";
  message: string;
};

export function MildDayRulesPanel({ rules }: { rules: BuildingRuleSummary[] }) {
  const router = useRouter();
  const [state, setState] = useState<SaveState>({ id: "", status: "idle", message: "" });
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>, buildingId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/admin/buildings/${buildingId}/rules`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mildDayEnabled: form.get("mildDayEnabled") === "on",
          mildDayOutdoorThresholdF: form.get("mildDayOutdoorThresholdF"),
          mildDaySetpointReductionF: form.get("mildDaySetpointReductionF"),
          minimumHeatSetpointF: form.get("minimumHeatSetpointF")
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save rule.");
      }

      setState({ id: buildingId, status: "success", message: payload.message ?? "Rule saved." });
      startTransition(() => router.refresh());
    } catch (error) {
      setState({
        id: buildingId,
        status: "error",
        message: error instanceof Error ? error.message : "Unable to save rule."
      });
    }
  }

  return (
    <div className="settings-list">
      {rules.map((rule) => (
        <form className="rule-card" key={rule.buildingId} onSubmit={(event) => submit(event, rule.buildingId)}>
          <div className="rule-card-head">
            <div>
              <h3>{rule.buildingName}</h3>
              <p>{rule.address}</p>
            </div>
            <Link className="button ghost" href={`/buildings/${rule.buildingId}#building-rules`}>
              Open building
            </Link>
          </div>
          <label className="checkbox-label span-2">
            <input name="mildDayEnabled" type="checkbox" defaultChecked={rule.mildDayEnabled} />
            Enable mild-day setpoint reduction
          </label>
          <div className="rule-inputs">
            <label>
              Outdoor threshold
              <input name="mildDayOutdoorThresholdF" defaultValue={rule.mildDayOutdoorThresholdF} inputMode="decimal" />
            </label>
            <label>
              Setpoint reduction
              <input name="mildDaySetpointReductionF" defaultValue={rule.mildDaySetpointReductionF} inputMode="decimal" />
            </label>
            <label>
              Minimum heat setpoint
              <input name="minimumHeatSetpointF" defaultValue={rule.minimumHeatSetpointF} inputMode="decimal" />
            </label>
          </div>
          {state.id === rule.buildingId && state.message ? <div className={`toast ${state.status}`}>{state.message}</div> : null}
          <button className="button primary" type="submit" disabled={isPending}>
            <Save size={16} />
            Save rule
          </button>
        </form>
      ))}
    </div>
  );
}
