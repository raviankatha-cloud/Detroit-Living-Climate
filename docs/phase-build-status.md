# Detroit Living Climate Phase Build Status

## Phase 1: App Structure, UI Shell, Auth

Completed:
- Next.js App Router structure.
- Premium dark Detroit Living Climate shell.
- Top branding: Detroit Living Climate / Created by Ravi Ankatha.
- Clerk sign-in and middleware route protection.
- Role-aware navigation for `super_admin`, `manager`, and `read_only`.

Manual work:
- Configure Clerk keys and sign-in URLs.
- Insert the first `super_admin` row after the first Clerk login.

## Phase 2: Database and Admin CRUD

Completed:
- Supabase migration and seed data.
- Tables for buildings, floors, units, thermostats, sensors, readings, snapshots, alerts, alert events, audit logs, access, rules, sync runs, and push subscriptions.
- Latest snapshot/readings/average views for scalable UI reads.
- Protected admin API routes for building, floor, unit, thermostat, sensor, rules, and access editing.

Manual work:
- Run `supabase/migrations/202605120001_initial_schema.sql`.
- Run `supabase/seed.sql`.

## Phase 3: Main Pages and Field Workflows

Completed:
- Overview, building detail, alerts, audit, settings, setup, and device pages.
- Field setup wizard for manual mapping.
- Inline floor/unit/sensor editing.
- Save/cancel style form actions with success and error states.

Manual work:
- Use `/setup` to create real buildings and map real ecobee identifiers.

## Phase 4: ecobee Sync Architecture

Completed:
- Server-only ecobee PIN and browser OAuth authorization routes.
- Server-only token storage and token refresh through Supabase.
- Server-only thermostat summary polling, detail fetch, set hold, and resume schedule functions.
- Summary-first sync using ecobee cursor revisions, with sequential detail fetch batches sized for 20-40+ buildings.
- Sync run logging, device discovery storage, mapped sensor ingestion, and unmapped device retention.
- Device management page now surfaces ecobee-discovered mapped and unmapped external IDs.
- Latest readings, historical snapshots/readings, building averages, floor averages, and freshness logic.

Manual work:
- Create ecobee app credentials.
- Connect ecobee from `/settings`, or add a refresh token to server env.
- Map real ecobee thermostat and sensor identifiers to Detroit Living Climate records.
- Schedule `POST /api/sync/ecobee`.

## Phase 5: Controls and Audit

Completed:
- Permission-checked thermostat setpoint and resume routes.
- Explicit `CONFIRM` challenge before thermostat commands.
- Audit logging for controls and admin changes.

Manual work:
- Decide whether to add Clerk re-auth for high-risk thermostat changes after pilot feedback.

## Phase 6: Alerts and Notifications

Completed:
- Warning, critical, escalation, duplicate suppression, hourly reminders, material-worsening reminders, and recovery logic.
- Continuous threshold evaluation for 2.0F/10-minute warning and 3.0F/20-minute critical conditions.
- Alert events, in-app alert center, building-specific alert history, and audit logs for alert creation/escalation/recovery.
- Email webhook support with eligible user recipients and user/building-level notification preferences.
- Web push subscription storage, browser opt-in UI for all roles, service worker, and webhook sender handoff.

Manual work:
- Configure `EMAIL_ALERT_WEBHOOK_URL`.
- Configure `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_WEBHOOK_URL` or add a direct VAPID sender.

## Phase 7: Mild-Day Automation

Completed:
- Per-building rule editing in settings and on building detail pages.
- Outdoor threshold, setpoint reduction, and minimum heat setpoint support.
- Heating-mode guard, stale snapshot guard, disconnected snapshot guard, six-hour repeat guard, and minimum setpoint safety floor.
- Audit logging for every automatic setpoint change and automation failure.

Manual work:
- Enable/disable building rules in the app after real buildings are configured.

## Phase 8: Polish and Deployment Readiness

Completed:
- Loading, error, not found, and empty states.
- Responsive mobile-friendly admin forms.

Remaining:
- Run dependency install/build locally.
- Add production deployment target and environment variables.
- Add automated tests once npm is available.
