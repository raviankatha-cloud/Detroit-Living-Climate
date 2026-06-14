"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import type { BuildingDetail, FloorConfig, SensorDetail, ThermostatConfig } from "@/lib/types";

type Msg = { ok: boolean; text: string } | null;

export function DeviceSetupPanel({ building }: { building: BuildingDetail }) {
  const thermostatExists = Boolean(building.thermostat.id);
  return (
    <div className="admin-stack" id="device-setup">
      <FloorManager buildingId={building.id} floors={building.floors} />
      <ThermostatManager buildingId={building.id} thermostat={building.thermostat} />
      <SensorManager
        buildingId={building.id}
        floors={building.floors}
        sensors={building.sensors}
        thermostatExists={thermostatExists}
      />
    </div>
  );
}

function FloorManager({ buildingId, floors }: { buildingId: string; floors: FloorConfig[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [, start] = useTransition();

  async function saveFloor(event: FormEvent<HTMLFormElement>, floorId?: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setMsg(null);

    const res = await fetch(
      floorId
        ? `/api/admin/buildings/${buildingId}/floors/${floorId}`
        : `/api/admin/buildings/${buildingId}/floors`,
      {
        method: floorId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          sortOrder: Number(fd.get("sortOrder") || 0),
          notes: fd.get("notes") || null
        })
      }
    );

    const payload = (await res.json()) as { message?: string };

    if (!res.ok) {
      setMsg({ ok: false, text: payload.message ?? "Save failed." });
      return;
    }

    setMsg({ ok: true, text: payload.message ?? "Saved." });
    if (!floorId) (event.target as HTMLFormElement).reset();
    start(() => router.refresh());
  }

  async function deleteFloor(floorId: string, name: string) {
    if (!confirm(`Delete floor "${name}"? Sensors on this floor will become unassigned.`)) return;
    setMsg(null);

    const res = await fetch(`/api/admin/buildings/${buildingId}/floors/${floorId}`, { method: "DELETE" });
    const payload = (await res.json()) as { message?: string };

    if (!res.ok) {
      setMsg({ ok: false, text: payload.message ?? "Delete failed." });
      return;
    }

    start(() => router.refresh());
  }

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Floors</h2>
          <p className="section-copy">Name the floors sensors will be assigned to.</p>
        </div>
        <span className="status-badge">{floors.length} floor{floors.length === 1 ? "" : "s"}</span>
      </div>

      {floors
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((floor) => (
          <form key={floor.id} className="inline-edit-row" onSubmit={(e) => saveFloor(e, floor.id)}>
            <input name="name" defaultValue={floor.name} placeholder="Floor name" required />
            <input name="sortOrder" defaultValue={floor.sortOrder} placeholder="Order" style={{ width: "4.5rem" }} />
            <input name="notes" defaultValue={floor.notes ?? ""} placeholder="Notes" />
            <button className="button" type="submit">Save</button>
            <button className="button ghost" type="button" onClick={() => deleteFloor(floor.id, floor.name)}>
              <Trash2 size={14} />
            </button>
          </form>
        ))}

      <form className="inline-edit-row" onSubmit={(e) => saveFloor(e)}>
        <input name="name" placeholder="New floor name" required />
        <input name="sortOrder" placeholder="Order" style={{ width: "4.5rem" }} />
        <input name="notes" placeholder="Notes" />
        <button className="button primary" type="submit">
          <Plus size={14} />
          Add floor
        </button>
      </form>

      <Feedback msg={msg} />
    </section>
  );
}

function ThermostatManager({ buildingId, thermostat }: { buildingId: string; thermostat: ThermostatConfig }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [, start] = useTransition();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setMsg(null);

    const res = await fetch(`/api/admin/buildings/${buildingId}/thermostat`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name") || "").trim() || "Thermostat",
        serialNumber: fd.get("serialNumber"),
        locationLabel: fd.get("locationLabel"),
        installationNotes: fd.get("installationNotes"),
        ecobeeIdentifier: thermostat.ecobeeIdentifier || null,
        externalDeviceId: thermostat.externalDeviceId || null,
        referenceLabel: thermostat.referenceLabel || null,
        deviceReference: thermostat.deviceReference || null,
        setupStatus: thermostat.setupStatus,
        connectionStatus: thermostat.connectionStatus || "not_connected",
        linkedEcobeeAccount: thermostat.linkedEcobeeAccount || null
      })
    });

    const payload = (await res.json()) as { message?: string };

    if (!res.ok) {
      setMsg({ ok: false, text: payload.message ?? "Save failed." });
      return;
    }

    setMsg({ ok: true, text: payload.message ?? "Thermostat saved." });
    start(() => router.refresh());
  }

  const displayName = thermostat.name === "Unmapped thermostat" ? "" : thermostat.name;

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Thermostat</h2>
          <p className="section-copy">One thermostat per building. Save this before adding sensors.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={save}>
        <label>
          Serial number *
          <input name="serialNumber" defaultValue={thermostat.serialNumber ?? ""} placeholder="Serial number" required />
        </label>
        <label>
          Name
          <input name="name" defaultValue={displayName} placeholder="e.g. Main Thermostat" />
        </label>
        <label className="span-2">
          Location
          <input name="locationLabel" defaultValue={thermostat.locationLabel ?? ""} placeholder="e.g. Mechanical room east wall" />
        </label>
        <label className="span-2">
          Notes
          <textarea
            name="installationNotes"
            defaultValue={thermostat.installNotes ?? ""}
            rows={3}
            placeholder="Mounting, wiring, Wi-Fi, or placement notes"
          />
        </label>
        <Feedback msg={msg} />
        <div className="form-actions span-2">
          <button className="button primary" type="submit">
            <Save size={16} />
            Save thermostat
          </button>
        </div>
      </form>
    </section>
  );
}

function SensorManager({
  buildingId,
  floors,
  sensors,
  thermostatExists
}: {
  buildingId: string;
  floors: FloorConfig[];
  sensors: SensorDetail[];
  thermostatExists: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [, start] = useTransition();

  const nextNumber = Math.max(0, ...sensors.map((s) => s.sensorNumber)) + 1;

  const grouped = new Map<string, SensorDetail[]>();
  for (const sensor of [...sensors].sort((a, b) => a.sensorNumber - b.sensorNumber)) {
    const key = sensor.floor || "Unassigned";
    grouped.set(key, [...(grouped.get(key) ?? []), sensor]);
  }

  async function saveSensor(event: FormEvent<HTMLFormElement>, existing?: SensorDetail) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setMsg(null);

    const res = await fetch(
      existing
        ? `/api/admin/buildings/${buildingId}/sensors/${existing.id}`
        : `/api/admin/buildings/${buildingId}/sensors`,
      {
        method: existing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sensorNumber: existing?.sensorNumber ?? nextNumber,
          name: fd.get("name"),
          serialNumber: fd.get("serialNumber") || existing?.serialNumber || null,
          floorId: fd.get("floorId") || null,
          installationNotes: fd.get("notes") || null,
          ecobeeIdentifier: existing?.ecobeeIdentifier || null,
          externalDeviceId: existing?.externalDeviceId || null,
          referenceLabel: existing?.referenceLabel || null,
          deviceReference: existing?.deviceReference || null,
          setupStatus: existing?.setupStatus ?? "mapped"
        })
      }
    );

    const payload = (await res.json()) as { message?: string };

    if (!res.ok) {
      setMsg({ ok: false, text: payload.message ?? "Save failed." });
      return;
    }

    setMsg({ ok: true, text: payload.message ?? "Saved." });
    if (!existing) (event.target as HTMLFormElement).reset();
    start(() => router.refresh());
  }

  async function deleteSensor(sensor: SensorDetail) {
    if (!confirm(`Delete sensor "${sensor.name}"?`)) return;
    setMsg(null);

    const res = await fetch(`/api/admin/buildings/${buildingId}/sensors/${sensor.id}`, { method: "DELETE" });
    const payload = (await res.json()) as { message?: string };

    if (!res.ok) {
      setMsg({ ok: false, text: payload.message ?? "Delete failed." });
      return;
    }

    start(() => router.refresh());
  }

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Sensors</h2>
          <p className="section-copy">
            {thermostatExists
              ? "Add sensors and assign each to a floor."
              : "Save a thermostat record above before adding sensors."}
          </p>
        </div>
        <span className="status-badge">{sensors.length} sensor{sensors.length === 1 ? "" : "s"}</span>
      </div>

      {[...grouped.entries()].map(([floorName, floorSensors]) => (
        <div key={floorName}>
          <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>{floorName}</p>
          {floorSensors.map((sensor) => {
            const currentFloorId = floors.find((f) => f.name === sensor.floor)?.id ?? "";
            return (
              <form key={sensor.id} className="sensor-edit-form" onSubmit={(e) => saveSensor(e, sensor)}>
                <input name="serialNumber" defaultValue={sensor.serialNumber ?? ""} placeholder="Serial *" required />
                <input name="name" defaultValue={sensor.name} placeholder="Sensor name" required />
                <select name="floorId" defaultValue={currentFloorId}>
                  <option value="">Unassigned</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input name="notes" defaultValue={sensor.installNotes ?? ""} placeholder="Notes" />
                <button className="button" type="submit">Save</button>
                <button className="button ghost" type="button" onClick={() => deleteSensor(sensor)}>
                  <Trash2 size={14} />
                </button>
              </form>
            );
          })}
        </div>
      ))}

      {thermostatExists ? (
        <form className="sensor-edit-form" onSubmit={(e) => saveSensor(e)}>
          <input name="serialNumber" placeholder="Serial *" required />
          <input name="name" placeholder="Sensor name" required />
          <select name="floorId" defaultValue="">
            <option value="">Unassigned</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <input name="notes" placeholder="Notes" />
          <button className="button primary" type="submit">
            <Plus size={14} />
            Add sensor
          </button>
        </form>
      ) : null}

      <Feedback msg={msg} />
    </section>
  );
}

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div className={`toast ${msg.ok ? "success" : "error"}`}>{msg.text}</div>;
}
