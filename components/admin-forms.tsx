"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Upload, X } from "lucide-react";
import { editableSetupStatuses, toEditableSetupStatus } from "@/lib/building-status";
import type { BuildingDetail, FloorConfig, SensorDetail, UnitConfig } from "@/lib/types";

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const idleState: FormState = { status: "idle", message: "" };

type SensorDraft = {
  id: number;
};

function createSensorDraft(index: number): SensorDraft {
  return { id: Date.now() + index };
}

export function BuildingImportForm() {
  const router = useRouter();
  const [state, setState] = useState(idleState);
  const [format, setFormat] = useState<"csv" | "json">("csv");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get("importPayload") ?? "");

    setState({ status: "idle", message: "" });

    try {
      const response = await fetch("/api/admin/import/buildings", {
        method: "POST",
        headers: { "content-type": format === "json" ? "application/json" : "text/csv" },
        body: value
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Import failed.");
      }

      setState({ status: "success", message: payload.message ?? "Buildings imported." });
      router.refresh();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Unable to import buildings." });
    }
  }

  return (
    <section className="section install-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Bulk preload</span>
          <h2>Import starter buildings</h2>
          <p className="section-copy">Paste CSV or JSON from the starter files to preload 20 buildings, then edit details later.</p>
        </div>
        <span className="status-badge">CSV / JSON ready</span>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Import format
          <select value={format} onChange={(event) => setFormat(event.target.value as "csv" | "json")}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <label className="span-2">
          Building import payload
          <textarea
            name="importPayload"
            rows={8}
            placeholder={
              format === "csv"
                ? "name,address,notes,setupStatus,wifiStatus,thermostatInstallStatus,sensorInstallStatus"
                : '[{"name":"Hubbard House","address":"1710 Hubbard St, Detroit, MI","setupStatus":"in_progress"}]'
            }
            required
          />
          <span className="field-help">Starter files live in data/starter-buildings.json and data/building-import-template.csv.</span>
        </label>
        <FormFeedback state={state} />
        <div className="form-actions span-2">
          <button className="button primary" type="submit">
            <Upload size={16} />
            Import buildings
          </button>
        </div>
      </form>
    </section>
  );
}

export function BuildingEditForm({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(idleState);
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: `/api/admin/buildings/${building.id}`,
      method: "PATCH",
      body: {
        name: form.get("name"),
        address: form.get("address"),
        notes: form.get("notes"),
        setupStatus: form.get("setupStatus"),
        wifiStatus: form.get("wifiStatus"),
        thermostatInstallStatus: form.get("thermostatInstallStatus"),
        sensorInstallStatus: form.get("sensorInstallStatus")
      },
      setState,
      onSuccess: () => startTransition(() => router.refresh())
    });
  }

  async function archiveBuilding() {
    if (!confirm(`Archive ${building.name}?`)) {
      return;
    }

    await saveJson({
      url: `/api/admin/buildings/${building.id}`,
      method: "DELETE",
      body: {},
      setState,
      onSuccess: () => startTransition(() => router.push("/dashboard"))
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>
        Building name
        <input name="name" defaultValue={building.name} disabled={!canEdit} required />
      </label>
      <label>
        Address
        <input name="address" defaultValue={building.address} disabled={!canEdit} required />
      </label>
      <label>
        Setup status
        <select name="setupStatus" defaultValue={toEditableSetupStatus(building.setupStatus)} disabled={!canEdit}>
          {editableSetupStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Wi-Fi status
        <select name="wifiStatus" defaultValue={toEditableSetupStatus(building.wifiStatus)} disabled={!canEdit}>
          {editableSetupStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Thermostat install status
        <select name="thermostatInstallStatus" defaultValue={toEditableSetupStatus(building.thermostatInstallStatus)} disabled={!canEdit}>
          {editableSetupStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sensor install status
        <select name="sensorInstallStatus" defaultValue={toEditableSetupStatus(building.sensorInstallStatus)} disabled={!canEdit}>
          {editableSetupStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Notes
        <textarea name="notes" defaultValue={building.notes} rows={4} disabled={!canEdit} />
      </label>
      <FormFeedback state={state} />
      {canEdit ? (
        <div className="form-actions span-2">
          <button className="button ghost" type="button" onClick={archiveBuilding}>
            <Trash2 size={16} />
            Archive
          </button>
          <button className="button primary" type="submit" disabled={isPending}>
            <Save size={16} />
            Save building
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function ThermostatEditForm({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(idleState);
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: `/api/admin/buildings/${building.id}/thermostat`,
      method: "PUT",
      body: {
        name: form.get("name"),
        ecobeeIdentifier: form.get("ecobeeIdentifier"),
        externalDeviceId: form.get("externalDeviceId"),
        serialNumber: form.get("serialNumber"),
        referenceLabel: form.get("referenceLabel"),
        locationLabel: form.get("locationLabel"),
        deviceReference: form.get("deviceReference"),
        installationNotes: form.get("installationNotes"),
        setupStatus: form.get("setupStatus"),
        connectionStatus: form.get("connectionStatus"),
        linkedEcobeeAccount: form.get("linkedEcobeeAccount")
      },
      setState,
      onSuccess: () => startTransition(() => router.refresh())
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>
        Thermostat name
        <input name="name" defaultValue={building.thermostat.name} disabled={!canEdit} required />
      </label>
      <label>
        ecobee Thermostat ID
        <input name="ecobeeIdentifier" defaultValue={building.thermostat.ecobeeIdentifier} disabled={!canEdit} />
      </label>
      <label>
        External Device ID
        <input name="externalDeviceId" defaultValue={building.thermostat.externalDeviceId} disabled={!canEdit} />
      </label>
      <label>
        Serial Number
        <input name="serialNumber" defaultValue={building.thermostat.serialNumber} disabled={!canEdit} />
      </label>
      <label>
        Reference Label
        <input name="referenceLabel" defaultValue={building.thermostat.referenceLabel} disabled={!canEdit} />
      </label>
      <label>
        Device Reference
        <input name="deviceReference" defaultValue={building.thermostat.deviceReference} disabled={!canEdit} />
      </label>
      <label>
        Location Label
        <input name="locationLabel" defaultValue={building.thermostat.locationLabel} disabled={!canEdit} />
      </label>
      <label>
        Connection Status
        <select name="connectionStatus" defaultValue={building.thermostat.connectionStatus ?? "not_connected"} disabled={!canEdit}>
          <option value="not_connected">Not connected</option>
          <option value="ready_to_connect">Ready to connect</option>
          <option value="connected">Connected</option>
          <option value="stale">Stale</option>
          <option value="offline">Offline</option>
        </select>
      </label>
      <label>
        Linked ecobee account
        <input name="linkedEcobeeAccount" defaultValue={building.thermostat.linkedEcobeeAccount} disabled={!canEdit} />
      </label>
      <label>
        Setup status
        <select name="setupStatus" defaultValue={toEditableSetupStatus(building.thermostat.setupStatus)} disabled={!canEdit}>
          {editableSetupStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Installation notes
        <textarea name="installationNotes" defaultValue={building.thermostat.installNotes} rows={3} disabled={!canEdit} />
      </label>
      <FormFeedback state={state} />
      {canEdit ? (
        <div className="form-actions span-2">
          <button className="button primary" type="submit" disabled={isPending}>
            <Save size={16} />
            Save thermostat
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function FloorUnitSensorEditor({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  return (
    <div className="admin-stack">
      <FloorEditor buildingId={building.id} floors={building.floors} canEdit={canEdit} />
      <UnitEditor buildingId={building.id} floors={building.floors} units={building.units} canEdit={canEdit} />
      <SensorEditor building={building} canEdit={canEdit} />
      <BuildingRuleForm building={building} canEdit={canEdit} />
    </div>
  );
}

export function AccessManagementForm() {
  const [state, setState] = useState(idleState);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: "/api/admin/access",
      method: "POST",
      body: {
        clerkUserId: form.get("clerkUserId"),
        role: form.get("role"),
        buildingId: form.get("buildingId")
      },
      setState
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>
        Clerk user id
        <input name="clerkUserId" placeholder="user_..." required />
      </label>
      <label>
        Role
        <select name="role" defaultValue="manager">
          <option value="super_admin">super_admin</option>
          <option value="manager">manager</option>
          <option value="read_only">read_only</option>
        </select>
      </label>
      <label className="span-2">
        Building id
        <input name="buildingId" placeholder="Leave blank only for super_admin" />
      </label>
      <FormFeedback state={state} />
      <div className="form-actions span-2">
        <button className="button primary" type="submit">
          Save access
        </button>
      </div>
    </form>
  );
}

export function SetupWizardForm({ buildings }: { buildings: BuildingDetail[] }) {
  const router = useRouter();
  const [state, setState] = useState(idleState);
  const [isPending, startTransition] = useTransition();
  const [sensorDrafts, setSensorDrafts] = useState<SensorDraft[]>([createSensorDraft(1), createSensorDraft(2)]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const floors = parseLines(String(form.get("floors") ?? "")).map((name, index) => ({
      name,
      sortOrder: index + 1
    }));
    const units = parseLines(String(form.get("units") ?? "")).map((line) => {
      const [unitNumber, floorName] = splitCsv(line);
      return { unitNumber, floorName };
    });
    const bulkSensors = parseLines(String(form.get("sensors") ?? "")).map((line) => {
      const [sensorNumber, name, floorName, unitNumber, ecobeeIdentifier, externalDeviceId, serialNumber, deviceReference, referenceLabel, installationNotes] =
        splitCsv(line);
      return {
        sensorNumber,
        name,
        floorName,
        unitNumber,
        ecobeeIdentifier,
        externalDeviceId,
        serialNumber,
        referenceLabel,
        deviceReference,
        installationNotes,
        setupStatus: "in_progress"
      };
    });
    const manualSensors = sensorDrafts
      .map((sensor) => ({
        sensorNumber: form.get(`sensorNumber-${sensor.id}`),
        name: form.get(`sensorName-${sensor.id}`),
        floorName: form.get(`sensorFloor-${sensor.id}`),
        unitNumber: form.get(`sensorUnit-${sensor.id}`),
        ecobeeIdentifier: form.get(`sensorEcobeeId-${sensor.id}`),
        externalDeviceId: form.get(`sensorExternalDeviceId-${sensor.id}`),
        serialNumber: form.get(`sensorSerial-${sensor.id}`),
        referenceLabel: form.get(`sensorReferenceLabel-${sensor.id}`),
        deviceReference: form.get(`sensorDeviceReference-${sensor.id}`),
        installationNotes: form.get(`sensorNotes-${sensor.id}`),
        setupStatus: form.get(`sensorSetupStatus-${sensor.id}`) || "in_progress"
      }))
      .filter((sensor) => sensor.sensorNumber || sensor.name || sensor.ecobeeIdentifier || sensor.externalDeviceId);
    const sensors = [...manualSensors, ...bulkSensors];

    await saveJson({
      url: "/api/admin/buildings",
      method: "POST",
      body: {
        name: form.get("name"),
        address: form.get("address"),
        notes: form.get("notes"),
        setupStatus: form.get("setupStatus") || "in_progress",
        wifiStatus: form.get("wifiStatus") || "needs_wifi",
        thermostatInstallStatus: form.get("thermostatInstallStatus") || "needs_install",
        sensorInstallStatus: form.get("sensorInstallStatus") || "needs_sensor_setup",
        floors,
        units,
        thermostat: {
          name: form.get("thermostatName"),
          ecobeeIdentifier: form.get("thermostatIdentifier"),
          externalDeviceId: form.get("thermostatExternalDeviceId"),
          serialNumber: form.get("thermostatSerial"),
          referenceLabel: form.get("thermostatLabel"),
          locationLabel: form.get("thermostatLocationLabel"),
          deviceReference: form.get("thermostatReference"),
          installationNotes: form.get("thermostatNotes"),
          setupStatus: form.get("thermostatSetupStatus") || "in_progress",
          connectionStatus: form.get("thermostatConnectionStatus") || "ready_to_connect",
          linkedEcobeeAccount: form.get("linkedEcobeeAccount")
        },
        sensors
      },
      setState,
      onSuccess: (payload) =>
        startTransition(() => {
          if (payload.buildingId) {
            router.push(`/buildings/${payload.buildingId}`);
          } else {
            router.refresh();
          }
        })
    });
  }

  return (
    <section className="wizard">
      <div className="wizard-rail">
        {["Building Info", "Thermostat Setup", "Sensors Setup", "ecobee Integration", "Rules", "Save / Sync"].map((step, index) => (
          <span className="wizard-step" key={step}>
            <strong>{index + 1}</strong>
            {step}
          </span>
        ))}
      </div>

      <div className="section form-section">
        <div className="section-head">
          <div>
            <h2>On-site building setup</h2>
            <p className="section-copy">Manual mapping for field setup before ecobee sync is complete.</p>
          </div>
          <span className="status-badge">Mobile ready</span>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <div className="install-form-section span-2">
            <div>
              <span className="eyebrow">1. Building Info</span>
              <h3>Building record</h3>
            </div>
            <label>
              Existing buildings
              <select defaultValue="">
                <option value="">Create new building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Building name
              <input name="name" placeholder="Example: Hubbard House" required />
            </label>
            <label className="span-2">
              Building address
              <input name="address" placeholder="Street, Detroit, MI" required />
            </label>
            <label>
              Setup status
              <select name="setupStatus" defaultValue="in_progress">
                {editableSetupStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label>
              Wi-Fi status
              <select name="wifiStatus" defaultValue="needs_wifi">
                {editableSetupStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label>
              Thermostat install status
              <select name="thermostatInstallStatus" defaultValue="needs_install">
                {editableSetupStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label>
              Sensor install status
              <select name="sensorInstallStatus" defaultValue="needs_sensor_setup">
                {editableSetupStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Building notes
              <textarea name="notes" rows={3} placeholder="Access notes, boiler context, setup reminders" />
            </label>
            <label>
              Floors
              <textarea name="floors" placeholder={"Floor 1\nFloor 2\nFloor 3"} rows={4} />
            </label>
            <label>
              Units/apartments
              <textarea name="units" placeholder={"101, Floor 1\n201, Floor 2"} rows={4} />
            </label>
          </div>

          <div className="install-form-section span-2">
            <div>
              <span className="eyebrow">2. Thermostat Setup</span>
              <h3>One Thermostat per building</h3>
            </div>
            <label>
              Thermostat Name
              <input name="thermostatName" placeholder="Main Thermostat" />
            </label>
            <label>
              ecobee Thermostat ID
              <input name="thermostatIdentifier" placeholder="ecobee thermostat id" />
            </label>
            <label>
              Serial Number
              <input name="thermostatSerial" placeholder="Serial number" />
            </label>
            <label>
              External Device ID
              <input name="thermostatExternalDeviceId" placeholder="Installer/device reference" />
            </label>
            <label>
              Device Reference
              <input name="thermostatReference" placeholder="Panel tag, asset id, or reference" />
            </label>
            <label>
              Reference Label
              <input name="thermostatLabel" placeholder="Main hallway thermostat" />
            </label>
            <label>
              Location Label
              <input name="thermostatLocationLabel" placeholder="Mechanical room east wall" />
            </label>
            <label>
              Setup Status
              <select name="thermostatSetupStatus" defaultValue="in_progress">
                {editableSetupStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label>
              Connection Status
              <select name="thermostatConnectionStatus" defaultValue="ready_to_connect">
                <option value="not_connected">Not connected</option>
                <option value="ready_to_connect">Ready to connect</option>
                <option value="connected">Connected</option>
                <option value="stale">Stale</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label>
              Linked ecobee account
              <input name="linkedEcobeeAccount" placeholder="Primary account or account email" />
            </label>
            <label className="span-2">
              Installation Notes
              <textarea name="thermostatNotes" rows={3} placeholder="Mounting, Wi-Fi, wiring, and placement notes" />
            </label>
          </div>

          <div className="install-form-section span-2">
            <div className="sensor-section-head">
              <div>
                <span className="eyebrow">3. Sensors Setup</span>
                <h3>Unlimited Sensors</h3>
              </div>
              <button className="button" type="button" onClick={() => setSensorDrafts((items) => [...items, createSensorDraft(items.length + 1)])}>
                <Plus size={16} />
                Add Sensor
              </button>
            </div>
            <div className="install-sensor-list">
              {sensorDrafts.map((sensor, index) => (
                <div className="install-sensor-row" key={sensor.id}>
                  <span className="sensor-number">Sensor {index + 1}</span>
                  <input name={`sensorNumber-${sensor.id}`} placeholder="No." defaultValue={index + 1} />
                  <input name={`sensorName-${sensor.id}`} placeholder="Sensor Name" />
                  <input name={`sensorEcobeeId-${sensor.id}`} placeholder="ecobee Sensor ID" />
                  <input name={`sensorSerial-${sensor.id}`} placeholder="Serial Number" />
                  <input name={`sensorExternalDeviceId-${sensor.id}`} placeholder="External Device ID" />
                  <input name={`sensorDeviceReference-${sensor.id}`} placeholder="Device Reference" />
                  <input name={`sensorReferenceLabel-${sensor.id}`} placeholder="Reference Label" />
                  <input name={`sensorFloor-${sensor.id}`} placeholder="Floor" />
                  <input name={`sensorUnit-${sensor.id}`} placeholder="Unit / Apartment" />
                  <select name={`sensorSetupStatus-${sensor.id}`} defaultValue="in_progress">
                    {editableSetupStatuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <textarea name={`sensorNotes-${sensor.id}`} placeholder="Installation Notes" rows={2} />
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setSensorDrafts((items) => items.filter((item) => item.id !== sensor.id))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <label className="span-2">
              Sensor bulk add
              <textarea
                name="sensors"
                placeholder={"1, Lobby Sensor, Floor 1, Common, ecobee-sensor-id, external-id, S-1001, asset tag, lobby wall, Notes\n2, Unit 201 Sensor, Floor 2, 201, ecobee-sensor-id, external-id, S-1002, asset tag, unit wall, Notes"}
                rows={5}
              />
              <span className="field-help">Format: number, Sensor Name, Floor, Unit, ecobee Sensor ID, External Device ID, Serial Number, Device Reference, Reference Label, Installation Notes.</span>
            </label>
          </div>

          <div className="install-form-section span-2">
            <div>
              <span className="eyebrow">4. ecobee Integration</span>
              <h3>Server-side connection ready</h3>
              <p className="section-copy">Connect or refresh ecobee from the dedicated integration panel on this page. Secrets stay server-side.</p>
            </div>
            <a className="button" href="#ecobee-integration">Open ecobee Integration</a>
          </div>

          <div className="install-form-section span-2">
            <div>
              <span className="eyebrow">5. Building Rules / Automation</span>
              <h3>Mild-day automation defaults</h3>
              <p className="section-copy">Every imported or created building receives a default rule record. Edit thresholds from the building detail page or settings.</p>
            </div>
            <span className="status-badge">Default: above 65F, reduce heat by 2F</span>
          </div>

          <FormFeedback state={state} />
          <div className="form-actions span-2">
            <span className="eyebrow">6. Save / Sync actions</span>
            <button className="button ghost" type="reset">
              <X size={16} />
              Clear
            </button>
            <button className="button primary" type="submit" disabled={isPending}>
              <Save size={16} />
              Save and open building
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function FloorEditor({ buildingId, floors, canEdit }: { buildingId: string; floors: FloorConfig[]; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(idleState);

  async function submit(event: FormEvent<HTMLFormElement>, floorId?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: floorId ? `/api/admin/buildings/${buildingId}/floors/${floorId}` : `/api/admin/buildings/${buildingId}/floors`,
      method: floorId ? "PATCH" : "POST",
      body: {
        name: form.get("name"),
        sortOrder: form.get("sortOrder")
      },
      setState,
      onSuccess: () => router.refresh()
    });
  }

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Floors</h2>
          <p className="section-copy">Create, rename, and reorder floors.</p>
        </div>
      </div>
      {floors.map((floor) => (
        <form className="inline-edit-row" key={floor.id} onSubmit={(event) => submit(event, floor.id)}>
          <input name="name" defaultValue={floor.name} disabled={!canEdit} required />
          <input name="sortOrder" defaultValue={floor.sortOrder} disabled={!canEdit} />
          {canEdit ? <button className="button" type="submit">Save</button> : null}
        </form>
      ))}
      {canEdit ? (
        <form className="inline-edit-row" onSubmit={(event) => submit(event)}>
          <input name="name" placeholder="New floor" required />
          <input name="sortOrder" placeholder="Sort" />
          <button className="button primary" type="submit">
            <Plus size={16} />
            Add
          </button>
        </form>
      ) : null}
      <FormFeedback state={state} />
    </section>
  );
}

function UnitEditor({
  buildingId,
  floors,
  units,
  canEdit
}: {
  buildingId: string;
  floors: FloorConfig[];
  units: UnitConfig[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(idleState);

  async function submit(event: FormEvent<HTMLFormElement>, unitId?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: unitId ? `/api/admin/buildings/${buildingId}/units/${unitId}` : `/api/admin/buildings/${buildingId}/units`,
      method: unitId ? "PATCH" : "POST",
      body: {
        unitNumber: form.get("unitNumber"),
        unitLabel: form.get("unitLabel"),
        floorId: form.get("floorId")
      },
      setState,
      onSuccess: () => router.refresh()
    });
  }

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Units</h2>
          <p className="section-copy">Assign unit labels to floors.</p>
        </div>
      </div>
      {units.map((unit) => (
        <form className="inline-edit-row" key={unit.id} onSubmit={(event) => submit(event, unit.id)}>
          <input name="unitNumber" defaultValue={unit.label} disabled={!canEdit} required />
          <input name="unitLabel" defaultValue={unit.label} disabled={!canEdit} />
          <FloorSelect floors={floors} name="floorId" disabled={!canEdit} currentFloorName={unit.floor} />
          {canEdit ? <button className="button" type="submit">Save</button> : null}
        </form>
      ))}
      {canEdit ? (
        <form className="inline-edit-row" onSubmit={(event) => submit(event)}>
          <input name="unitNumber" placeholder="New unit" required />
          <input name="unitLabel" placeholder="Label" />
          <FloorSelect floors={floors} name="floorId" />
          <button className="button primary" type="submit">
            <Plus size={16} />
            Add
          </button>
        </form>
      ) : null}
      <FormFeedback state={state} />
    </section>
  );
}

function SensorEditor({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(idleState);

  async function submit(event: FormEvent<HTMLFormElement>, sensorId?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: sensorId ? `/api/admin/buildings/${building.id}/sensors/${sensorId}` : `/api/admin/buildings/${building.id}/sensors`,
      method: sensorId ? "PATCH" : "POST",
      body: {
        sensorNumber: form.get("sensorNumber"),
        name: form.get("name"),
        floorId: form.get("floorId"),
        unitId: form.get("unitId"),
        ecobeeIdentifier: form.get("ecobeeIdentifier"),
        externalDeviceId: form.get("externalDeviceId"),
        serialNumber: form.get("serialNumber"),
        referenceLabel: form.get("referenceLabel"),
        deviceReference: form.get("deviceReference"),
        installationNotes: form.get("installationNotes"),
        setupStatus: form.get("setupStatus")
      },
      setState,
      onSuccess: () => router.refresh()
    });
  }

  async function bulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rows = parseBulkSensorRows(String(form.get("bulkSensors") ?? ""), building);

    if (rows.length === 0) {
      setState({ status: "error", message: "Add at least one sensor row before saving." });
      return;
    }

    setState({ status: "idle", message: "" });

    try {
      for (const row of rows) {
        const response = await fetch(`/api/admin/buildings/${building.id}/sensors`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(row)
        });
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? `Unable to save Sensor ${row.sensorNumber}.`);
        }
      }

      setState({ status: "success", message: `${rows.length} sensor${rows.length === 1 ? "" : "s"} added.` });
      router.refresh();
      event.currentTarget.reset();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Unable to bulk add sensors." });
    }
  }

  return (
    <section className="section form-section">
      <div className="section-head">
        <div>
          <h2>Sensors setup</h2>
          <p className="section-copy">Add, edit, and remap many Sensors across floors and optional units.</p>
        </div>
        <span className="status-badge">{building.sensors.length} Sensors</span>
      </div>
      {canEdit ? (
        <form className="sensor-bulk-card" onSubmit={bulkSubmit}>
          <div>
            <h3>Quick add Sensors</h3>
            <p className="section-copy">Paste one Sensor per line while walking the building.</p>
          </div>
          <textarea
            name="bulkSensors"
            className="bulk-sensor-textarea"
            placeholder={"4, Hallway West, Floor 2, Common, ecobee-sensor-id, external-id, S-2004, asset tag, stairwell wall, Near stairwell\n5, Unit 303, Floor 3, 303, ecobee-sensor-id, external-id, S-3005, asset tag, bedroom wall, Bedroom wall"}
            rows={4}
          />
          <span className="field-help">Format: number, Sensor Name, Floor, Unit, ecobee Sensor ID, External Device ID, Serial Number, Device Reference, Reference Label, Installation Notes.</span>
          <button className="button primary" type="submit">
            <Plus size={16} />
            Add Sensors
          </button>
        </form>
      ) : null}
      {building.sensors.map((sensor) => (
        <SensorMappingForm
          key={sensor.id}
          sensor={sensor}
          building={building}
          canEdit={canEdit}
          onSubmit={(event) => submit(event, sensor.id)}
        />
      ))}
      {canEdit ? (
        <SensorMappingForm building={building} canEdit={canEdit} onSubmit={(event) => submit(event)} />
      ) : null}
      <FormFeedback state={state} />
    </section>
  );
}

function SensorMappingForm({
  sensor,
  building,
  canEdit,
  onSubmit
}: {
  sensor?: SensorDetail;
  building: BuildingDetail;
  canEdit: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="sensor-edit-form" onSubmit={onSubmit}>
      <input name="sensorNumber" defaultValue={sensor?.sensorNumber} placeholder="No." disabled={!canEdit} required />
      <input name="name" defaultValue={sensor?.name} placeholder="Sensor name" disabled={!canEdit} required />
      <FloorSelect floors={building.floors} name="floorId" disabled={!canEdit} currentFloorName={sensor?.floor} />
      <UnitSelect units={building.units} name="unitId" disabled={!canEdit} currentUnitLabel={sensor?.unit} />
      <input name="ecobeeIdentifier" defaultValue={sensor?.ecobeeIdentifier} placeholder="ecobee Sensor ID" disabled={!canEdit} />
      <input
        name="externalDeviceId"
        defaultValue={sensor?.externalDeviceId}
        placeholder="External Device ID"
        disabled={!canEdit}
      />
      <input name="serialNumber" defaultValue={sensor?.serialNumber} placeholder="Serial/reference" disabled={!canEdit} />
      <input name="referenceLabel" defaultValue={sensor?.referenceLabel} placeholder="Sensor label" disabled={!canEdit} />
      <input name="deviceReference" defaultValue={sensor?.deviceReference} placeholder="Reference field" disabled={!canEdit} />
      <select name="setupStatus" defaultValue={toEditableSetupStatus(sensor?.setupStatus)} disabled={!canEdit}>
        {editableSetupStatuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <textarea name="installationNotes" defaultValue={sensor?.installNotes} placeholder="Installation notes" disabled={!canEdit} rows={2} />
      {canEdit ? <button className="button" type="submit">{sensor ? "Save" : "Add sensor"}</button> : null}
    </form>
  );
}

function BuildingRuleForm({ building, canEdit }: { building: BuildingDetail; canEdit: boolean }) {
  const [state, setState] = useState(idleState);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveJson({
      url: `/api/admin/buildings/${building.id}/rules`,
      method: "PUT",
      body: {
        mildDayEnabled: form.get("mildDayEnabled") === "on",
        mildDayOutdoorThresholdF: form.get("mildDayOutdoorThresholdF"),
        mildDaySetpointReductionF: form.get("mildDaySetpointReductionF"),
        minimumHeatSetpointF: form.get("minimumHeatSetpointF")
      },
      setState
    });
  }

  return (
    <section className="section form-section" id="building-rules">
      <div className="section-head">
        <div>
          <h2>Building rules</h2>
          <p className="section-copy">Configure mild-day automation per building.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2 checkbox-label">
          <input name="mildDayEnabled" type="checkbox" defaultChecked={building.buildingRule.mildDayEnabled} disabled={!canEdit} />
          Enable mild-day setpoint reduction
        </label>
        <label>
          Outdoor threshold
          <input name="mildDayOutdoorThresholdF" defaultValue={building.buildingRule.mildDayOutdoorThresholdF} disabled={!canEdit} />
        </label>
        <label>
          Setpoint reduction
          <input name="mildDaySetpointReductionF" defaultValue={building.buildingRule.mildDaySetpointReductionF} disabled={!canEdit} />
        </label>
        <label>
          Minimum heat setpoint
          <input name="minimumHeatSetpointF" defaultValue={building.buildingRule.minimumHeatSetpointF} disabled={!canEdit} />
        </label>
        <FormFeedback state={state} />
        {canEdit ? (
          <div className="form-actions span-2">
            <button className="button primary" type="submit">
              <Save size={16} />
              Save rule
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function FloorSelect({
  floors,
  name,
  disabled,
  currentFloorName
}: {
  floors: FloorConfig[];
  name: string;
  disabled?: boolean;
  currentFloorName?: string;
}) {
  const current = useMemo(() => floors.find((floor) => floor.name === currentFloorName)?.id ?? "", [currentFloorName, floors]);
  return (
    <select name={name} defaultValue={current} disabled={disabled}>
      <option value="">No floor</option>
      {floors.map((floor) => (
        <option key={floor.id} value={floor.id}>
          {floor.name}
        </option>
      ))}
    </select>
  );
}

function UnitSelect({
  units,
  name,
  disabled,
  currentUnitLabel
}: {
  units: UnitConfig[];
  name: string;
  disabled?: boolean;
  currentUnitLabel?: string;
}) {
  const current = useMemo(() => units.find((unit) => unit.label === currentUnitLabel)?.id ?? "", [currentUnitLabel, units]);
  return (
    <select name={name} defaultValue={current} disabled={disabled}>
      <option value="">No unit</option>
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.label} / {unit.floor}
        </option>
      ))}
    </select>
  );
}

function FormFeedback({ state }: { state: FormState }) {
  if (state.status === "idle") {
    return null;
  }

  return <div className={`toast ${state.status}`}>{state.message}</div>;
}

async function saveJson({
  url,
  method,
  body,
  setState,
  onSuccess
}: {
  url: string;
  method: string;
  body: Record<string, unknown>;
  setState: (state: FormState) => void;
  onSuccess?: (payload: Record<string, any>) => void;
}) {
  setState({ status: "idle", message: "" });

  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(body)
    });
    const payload = (await response.json()) as { message?: string; [key: string]: any };

    if (!response.ok) {
      setState({ status: "error", message: payload.message ?? "Save failed." });
      return;
    }

    setState({ status: "success", message: payload.message ?? "Saved." });
    onSuccess?.(payload);
  } catch {
    setState({ status: "error", message: "Unable to contact the server." });
  }
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBulkSensorRows(value: string, building: BuildingDetail) {
  return parseLines(value)
    .map((line) => {
      const [sensorNumber, name, floorName, unitNumber, ecobeeIdentifier, externalDeviceId, serialNumber, deviceReference, referenceLabel, installationNotes] =
        splitCsv(line);

      return {
        sensorNumber,
        name,
        floorId: findFloorId(building.floors, floorName),
        unitId: findUnitId(building.units, unitNumber),
        ecobeeIdentifier,
        externalDeviceId,
        serialNumber,
        referenceLabel,
        deviceReference,
        installationNotes,
        setupStatus: "in_progress"
      };
    })
    .filter((row) => row.sensorNumber && row.name);
}

function findFloorId(floors: FloorConfig[], floorName: string | undefined) {
  const normalized = String(floorName ?? "").toLowerCase();
  return floors.find((floor) => floor.name.toLowerCase() === normalized || floor.id === floorName)?.id ?? "";
}

function findUnitId(units: UnitConfig[], unitNumber: string | undefined) {
  const normalized = String(unitNumber ?? "").toLowerCase();

  if (!normalized || normalized === "common" || normalized === "none" || normalized === "n/a") {
    return "";
  }

  return units.find((unit) => unit.label.toLowerCase() === normalized || unit.id === unitNumber)?.id ?? "";
}

function splitCsv(value: string) {
  return value.split(",").map((part) => part.trim());
}
