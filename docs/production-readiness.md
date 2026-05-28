# Detroit Living Climate Production Readiness

Production domain: `https://climate.detroitliving.com`

## App Summary

Detroit Living Climate is a private internal climate operations command center for 20-40+ buildings. It supports Clerk sign-in, Supabase-backed building/device setup, server-only ecobee sync/control, differential alerting, email/web push notification handoff, audit logging, and mild-day automation.

## Local Commands

```bash
npm install
cp .env.example .env.local
npm run dev
npm run typecheck
npm run build
```

Open local development at `http://localhost:3000`.

## Clerk Setup

1. Create a Clerk application.
2. Enable email/password or your preferred enterprise sign-in method.
3. Set allowed redirect URLs:
   - `https://climate.detroitliving.com/dashboard`
   - `https://climate.detroitliving.com/sign-in`
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/sign-in`
4. Add environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`
5. Sign in once, copy your Clerk user id, and seed the first admin:

```sql
insert into user_building_access (clerk_user_id, building_id, role)
values ('YOUR_CLERK_USER_ID', null, 'super_admin');
```

## Supabase Setup

1. Create a Supabase project.
2. Copy project URL to `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy service role key to `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `supabase/migrations/202605120001_initial_schema.sql`.
5. Run `supabase/seed.sql` for realistic pilot demo data.
6. Confirm the main tables exist:
   - `buildings`
   - `floors`
   - `units`
   - `thermostats`
   - `sensors`
   - `sensor_readings`
   - `thermostat_snapshots`
   - `alerts`
   - `alert_events`
   - `audit_logs`
   - `user_building_access`
   - `building_rules`
   - `notification_preferences`
   - `ecobee_tokens`
   - `ecobee_sync_cursors`
   - `ecobee_device_discoveries`

## ecobee Setup

1. Create an ecobee developer app.
2. Set redirect URI to `https://climate.detroitliving.com/api/ecobee/callback`.
3. Add environment variables:
   - `ECOBEE_APP_KEY`
   - `ECOBEE_SCOPE=smartWrite`
   - `ECOBEE_REDIRECT_URI=https://climate.detroitliving.com/api/ecobee/callback`
   - `ECOBEE_API_BASE_URL=https://api.ecobee.com`
   - `ECOBEE_SYNC_SECRET`
   - optional fallback `ECOBEE_REFRESH_TOKEN`
4. In the app, sign in as `super_admin` and open `/settings`.
5. Use the PIN flow for easiest setup, or Browser OAuth after the production redirect is configured.
6. Map each building thermostat `ecobee_thermostat_id`.
7. Map each sensor `ecobee_sensor_id`.
8. Schedule sync no faster than every 3 minutes:

```bash
curl -X POST https://climate.detroitliving.com/api/sync/ecobee \
  -H "x-sync-secret: YOUR_ECOBEE_SYNC_SECRET"
```

## Notifications Setup

Email:

1. Create an email webhook endpoint with your provider or internal notification service.
2. Set `EMAIL_ALERT_WEBHOOK_URL`.
3. Set optional `EMAIL_ALERT_FROM`.
4. The app sends alert id, building id, severity, message, differential, and eligible recipient Clerk user ids.

Web push:

1. Generate VAPID keys.
2. Set `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`.
3. Set `WEB_PUSH_VAPID_PUBLIC_KEY`.
4. Set `WEB_PUSH_VAPID_PRIVATE_KEY`.
5. Set `WEB_PUSH_WEBHOOK_URL` to a sender service that signs and sends pushes.
6. Users open `/settings` and click `Enable browser push`.

## Deployment Steps

1. Push this Next.js app to the deployment host.
2. Set production domain `climate.detroitliving.com`.
3. Configure DNS CNAME/A records per host instructions.
4. Add all environment variables in the host dashboard.
5. Run the Supabase migration and seed if this is the first pilot environment.
6. Deploy.
7. Sign in, seed the first `super_admin`, and verify `/dashboard`.
8. Connect ecobee from `/settings`.
9. Create or verify real building/device mappings.
10. Configure scheduled sync.
11. Configure email and push notification webhook services.
12. Run `npm run typecheck` and `npm run build` before promoting.

## MVP-Ready

- Premium dark authenticated UI.
- Clerk route protection.
- Role model: `super_admin`, `manager`, `read_only`.
- Supabase schema and seed data.
- Building, floor, unit, thermostat, sensor, rule, and access editing.
- Overview command center, building detail, alerts, audit, setup, devices, settings.
- Server-only ecobee auth, token refresh, sync, mapping, discovery, and controls.
- Differential alert engine with warning, critical, escalation, recovery, and duplicate suppression.
- Email/web push notification architecture and in-app alert center.
- Mild-day automation with safety checks and audit logs.

## Remaining Rollout Risks

- Full typecheck/build must run after dependencies are installed.
- Email delivery is a webhook handoff, not a built-in SMTP/provider integration.
- Web push delivery is a webhook handoff, not an in-process VAPID sender.
- Clerk re-auth for dangerous thermostat changes is not yet implemented.
- Automated tests are not yet added.
- Supabase service role is used server-side; confirm deployment platform never exposes it to browser bundles.
- ecobee rate limits should be monitored during the pilot.
- RLS policies are not yet the primary enforcement layer; app/server routes enforce permissions.
- Real building mappings must be verified on site before trusting alert routing.
