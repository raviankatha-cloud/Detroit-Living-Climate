import { BuildingImportForm, SetupWizardForm } from "@/components/admin-forms";
import { EcobeeIntegrationPanel } from "@/components/ecobee-integration-panel";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/auth/permissions";
import { getAccessibleBuildingDetails } from "@/lib/data/buildings";
import { getEcobeeIntegrationStatus } from "@/lib/data/ecobee-status";

export default async function SetupPage() {
  const { userId } = await auth();
  const role = userId ? await getUserRole(userId) : "read_only";
  const [buildings, ecobeeStatus] = await Promise.all([
    getAccessibleBuildingDetails(),
    getEcobeeIntegrationStatus()
  ]);

  if (role !== "super_admin") {
    return (
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">Restricted</span>
          <h2>Setup is available to super_admin users.</h2>
          <p>Managers can edit buildings they are assigned to from the building detail page.</p>
        </div>
      </section>
    );
  }

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
