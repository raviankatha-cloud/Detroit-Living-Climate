# Detroit Living Climate

Private internal Next.js App Router command center for Detroit Living Climate at `climate.detroitliving.com`.

## Stack

- Next.js App Router
- Clerk authentication and route protection
- Supabase database
- Server-only ecobee integration
- Responsive desktop and phone browser UI
- In-app admin setup workflow for buildings, floors, units, thermostats, and sensors
- Manual device mapping before live ecobee sync is finished
- CSV/JSON starter building preload for field-install rollout

## Getting Started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add Clerk, Supabase, and ecobee credentials.
3. Run the migrations in `supabase/migrations`, then `supabase/seed.sql`.
4. Start the app with `npm run dev`.

Until Clerk, Supabase, and ecobee are configured, the UI uses demo portfolio data so the pilot dashboard looks complete.

After creating your first Clerk user, insert a global super-admin access row:

```sql
insert into user_building_access (clerk_user_id, building_id, role)
values ('YOUR_CLERK_USER_ID', null, 'super_admin');
```

## Main Routes

- `/sign-in`: Clerk sign-in.
- `/dashboard`: main portfolio overview.
- `/buildings/[buildingId]`: building detail, controls, sensor mapping, and admin editing.
- `/setup`: mobile-friendly on-site setup wizard.
- `/devices`: thermostat and sensor management.
- `/alerts`: alert inbox.
- `/audit`: audit history.
- `/settings`: roles, rules, and integration settings.

## Building Preload

Starter import files live in `data/starter-buildings.json` and `data/building-import-template.csv`.
The setup page includes a bulk import panel that accepts either format with:

- `name`
- `address`
- `notes`
- `setupStatus`
- `wifiStatus`
- `thermostatInstallStatus`
- `sensorInstallStatus`

## Phase Status

See `docs/phase-build-status.md` for the current phase-by-phase implementation status and remaining manual setup.

## ecobee Setup

See `docs/ecobee-integration.md` for the server-only ecobee auth flow, required environment variables, sync endpoint, and device mapping workflow.

## Operations

See `docs/operations-alerting.md` for differential alert logic, notification delivery, mild-day automation, and scheduling notes.

## Production Readiness

See `docs/production-readiness.md` for Clerk, Supabase, ecobee, notification, deployment, and rollout steps.
