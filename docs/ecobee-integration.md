# Detroit Living Climate ecobee Integration

Detroit Living Climate keeps every ecobee secret, token, fetch, sync, and control action on the server. Browser code can start an admin-authorized setup flow, but it never receives ecobee tokens.

## Official API References

- PIN authorization: https://www.ecobee.com/home/developer/api/documentation/v1/auth/pin-api-authorization.shtml
- Authorization code flow: https://www.ecobee.com/home/developer/api/documentation/v1/auth/authz-code-authorization.shtml
- Token refresh: https://developer.ecobee.com/home/developer/api/documentation/v1/auth/token-refresh.shtml
- Thermostat summary polling: https://developer.ecobee.com/home/developer/api/documentation/v1/operations/get-thermostat-summary.shtml
- Thermostat detail fetch: https://www.ecobee.com/home/developer/api/documentation/v1/operations/get-thermostats.shtml
- Remote sensors: https://developer.ecobee.com/home/developer/api/documentation/v1/objects/RemoteSensor.shtml

## Required Environment Variables

```bash
ECOBEE_APP_KEY=
ECOBEE_SCOPE=smartWrite
ECOBEE_REDIRECT_URI=https://climate.detroitliving.com/api/ecobee/callback
ECOBEE_API_BASE_URL=https://api.ecobee.com
ECOBEE_SYNC_SECRET=
ECOBEE_REFRESH_TOKEN=
NEXT_PUBLIC_APP_URL=https://climate.detroitliving.com
```

`ECOBEE_APP_KEY` is the ecobee developer application key. `ECOBEE_REFRESH_TOKEN` is optional if you connect ecobee from `/settings`; the app stores the refresh token in Supabase after authorization.

For local development, prefer the PIN flow. ecobee's browser authorization redirect URI rules are stricter than normal localhost testing and should be configured with the real deployed app URL.

## Database Tables Added For Live Sync

- `ecobee_tokens`: stores the server-side access and refresh token for the primary ecobee account.
- `ecobee_auth_sessions`: stores short-lived PIN authorization sessions started by a super_admin.
- `ecobee_sync_cursors`: stores thermostat summary revisions so detail fetches only happen when needed.
- `ecobee_device_discoveries`: stores discovered thermostats and remote sensors, including unmapped devices.
- `sync_runs`: stores scheduled sync run status, counts, and failure messages.

Existing operational tables are still the source of truth for the app:

- `thermostats.ecobee_thermostat_id` maps a building thermostat to the ecobee thermostat identifier.
- `sensors.ecobee_sensor_id` maps a manual sensor record to the ecobee remote sensor id.
- `thermostat_snapshots` stores historical thermostat state.
- `sensor_readings` stores historical remote sensor readings.

## Authorization Workflow

1. Log in as a `super_admin`.
2. Open `/settings`.
3. In the ecobee integration panel, use either:
   - `Start PIN flow`, then enter the displayed PIN in the ecobee portal and click `Exchange PIN after approval`.
   - `Browser OAuth`, if the configured redirect URI is available to the ecobee developer app.
4. The server exchanges the authorization code for tokens and stores them in `ecobee_tokens`.

## Sync Workflow

Scheduled sync calls:

```bash
curl -X POST http://localhost:3000/api/sync/ecobee \
  -H "x-sync-secret: YOUR_ECOBEE_SYNC_SECRET"
```

Force a full mapped thermostat detail refresh:

```bash
curl -X POST "http://localhost:3000/api/sync/ecobee?force=true" \
  -H "x-sync-secret: YOUR_ECOBEE_SYNC_SECRET"
```

The sync service:

1. Calls `/thermostatSummary` for registered thermostats.
2. Stores cursor revisions and device discoveries.
3. Fetches full thermostat details only when revisions changed, data is old, or `force=true`.
4. Updates thermostat freshness and connection status.
5. Inserts a `thermostat_snapshots` row.
6. Inserts `sensor_readings` for mapped remote sensors.
7. Stores unmapped remote sensors in `ecobee_device_discoveries`.
8. Runs differential alert evaluation and mild-day rule evaluation.

ecobee recommends using `/thermostatSummary` for polling, not polling `/thermostat` directly, and not polling faster than every 3 minutes. Detroit Living Climate is structured around that summary-first pattern and uses low sequential detail fetch batches for 20-40+ buildings.

## Mapping Real Devices

Manual setup can happen before ecobee is live:

1. Create the building, floors, and units from `/setup` or the building detail page.
2. Create one thermostat record for the building.
3. Enter the ecobee thermostat identifier in `External ecobee id`.
4. Add sensors and enter each ecobee remote sensor id in `External ecobee id`.
5. Keep serial/reference labels and install notes filled in for field traceability.

After sync runs, mapped devices receive latest live readings. Unmapped devices are retained in `ecobee_device_discoveries` and surfaced on `/devices` for later reconciliation.

## Live-Ready Now

- PIN and redirect OAuth token exchange.
- Server-side token refresh.
- Summary-first polling architecture.
- Thermostat detail fetch with runtime, settings, sensors, weather, and equipment status.
- Thermostat snapshot history.
- Sensor reading history.
- Online/offline freshness fields.
- Building/floor average computation from latest readings.
- Server-only set hold and resume schedule control calls.
- Audit logging around control attempts.

## Still Placeholder Or Manual

- You must create the ecobee developer application and connect it.
- You must map real ecobee thermostat and remote sensor identifiers to buildings/sensors.
- You must schedule `POST /api/sync/ecobee` in your host or scheduler.
- Direct email/web push delivery depends on your configured webhook providers.
- Production deployment still needs environment variables, Clerk domain settings, and Supabase project secrets.
