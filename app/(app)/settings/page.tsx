import { ShieldCheck } from "lucide-react";
import { AccessManagementForm } from "@/components/admin-forms";
import { EcobeeSetupPanel } from "@/components/ecobee-setup-panel";
import { MildDayRulesPanel } from "@/components/mild-day-rules-panel";
import { NotificationSettingsPanel } from "@/components/notification-settings-panel";
import { getCurrentUserNotificationPreference } from "@/lib/data/notification-preferences";
import { getBuildingRuleSummaries } from "@/lib/data/rules";

export default async function SettingsPage() {
  const [notificationPreference, rules] = await Promise.all([
    getCurrentUserNotificationPreference(),
    getBuildingRuleSummaries()
  ]);

  return (
    <>
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">Settings and admin</span>
          <h2>Security, roles, automation, and integrations.</h2>
          <p>
            Clerk controls login, Supabase stores internal data, and ecobee credentials stay server-side only.
          </p>
        </div>
      </section>

      <section className="settings-grid">
        <article className="section form-section">
          <div className="section-head">
            <div>
              <h2>Roles</h2>
              <p className="section-copy">super_admin, manager, and read_only access.</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <AccessManagementForm />
        </article>

        <article className="section form-section">
          <div className="section-head">
            <div>
              <h2>Mild-day automation</h2>
              <p className="section-copy">Per-building heating setpoint reduction with safety floors.</p>
            </div>
          </div>
          <MildDayRulesPanel rules={rules} />
        </article>

        <article className="section form-section">
          <div className="section-head">
            <div>
              <h2>Notifications</h2>
              <p className="section-copy">Email, web push, warning, critical, escalation, and recovery preferences.</p>
            </div>
          </div>
          <NotificationSettingsPanel
            preference={notificationPreference}
            vapidPublicKey={process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY}
          />
        </article>

        <article className="section form-section">
          <div className="section-head">
            <div>
              <h2>ecobee integration</h2>
              <p className="section-copy">OAuth is server-side; browser clients never receive ecobee secrets.</p>
            </div>
          </div>
          <div className="detail-list">
            <div>
              <dt>Authorize</dt>
              <dd>
                <EcobeeSetupPanel />
              </dd>
            </div>
            <div>
              <dt>Sync endpoint</dt>
              <dd>POST /api/sync/ecobee with x-sync-secret for scheduled jobs.</dd>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
