import { BuildingImportForm, SetupWizardForm } from "@/components/admin-forms";
import { EcobeeIntegrationPanel } from "@/components/ecobee-integration-panel";
import { getAccessibleBuildingDetails } from "@/lib/data/buildings";
import { getEcobeeIntegrationStatus } from "@/lib/data/ecobee-status";

export default async function SetupPage() {
  const [buildings, ecobeeStatus] = await Promise.all([
    getAccessibleBuildingDetails(),
    getEcobeeIntegrationStatus()
  ]);

  return (
    <>
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">On-site setup</span>
          <h2>Configure a building while you are standing inside it.</h2>
          <p>
            Create the building, floors, units, thermostat, and sensor mappings manually now. Live ecobee sync can attach to those records later.
          </p>
        </div>
      </section>
      <BuildingImportForm />
      <EcobeeIntegrationPanel status={ecobeeStatus} />
      <SetupWizardForm buildings={buildings} />
    </>
  );
}
