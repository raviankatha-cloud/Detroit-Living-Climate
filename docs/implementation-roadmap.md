# Detroit Living Climate Implementation Roadmap

## Phase 1: Scaffold and Demo Pilot

- Next.js App Router application shell.
- Clerk sign-in page and middleware route protection.
- Premium black internal operations console with building cards, detail views, and admin forms.
- On-site setup workflow for manual building, floor, unit, thermostat, and sensor mapping.
- Demo portfolio data so the UI is useful before ecobee setup.
- Supabase schema and seed data.
- Server-only ecobee, alerting, automation, and audit modules.

## Phase 2: Live Data

- Store ecobee OAuth refresh tokens securely on the server in `ecobee_tokens`.
- Exchange PIN/browser authorization codes and refresh access tokens in `lib/ecobee/auth.ts`.
- Fetch thermostat summaries, thermostats, and remote sensors in `lib/ecobee/client.ts`.
- Sync mapped thermostats, mapped sensors, readings, snapshots, cursor revisions, and discovered devices in `lib/ecobee/sync.ts`.
- Supabase reads in `lib/data/buildings.ts` are scoped by `user_building_access`.
- Admin forms and setup wizard save through protected Supabase mutation routes.
- Add Clerk re-auth for thermostat changes and archive/delete actions.

## Phase 3: Operations

- Complete alert persistence and duplicate suppression.
- Add email provider and web push subscription management.
- Add a scheduled caller for `POST /api/sync/ecobee`.
- Add building rule editing for mild-day automation.
- Add tests for permissions, alert thresholds, and control endpoints.
