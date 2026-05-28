# Detroit Living Climate Alerting, Notifications, and Automation

## Differential Alert Logic

Detroit Living Climate evaluates the latest thermostat snapshot after each ecobee sync.

- Differential is `heat_setpoint_f - thermostat_temperature_f`.
- Only below-setpoint conditions matter.
- Warning is created when differential is at least `2.0F` for `10` continuous minutes.
- Critical is created when differential is at least `3.0F` for `20` continuous minutes.
- Active critical alerts do not downgrade to warning; they stay critical until recovery.
- Recovery occurs when differential drops below `1.0F`.

Duplicate suppression:

- A new active alert is created only if no active alert exists for that building and alert key.
- Another notification is sent only when severity changes, the differential worsens by at least `0.5F`, or 60 minutes have passed since the last notification.
- Material worsening creates an `escalation` alert event.
- Recovery creates a `recovered` alert event and marks the active alert recovered.

## Notification Delivery

Alert events are always stored in-app in `alert_events`.

Email delivery uses `EMAIL_ALERT_WEBHOOK_URL`. The app posts alert context and eligible Clerk user recipients to that webhook.

Web push delivery uses saved browser subscriptions from `web_push_subscriptions`. The app hands subscriptions to `WEB_PUSH_WEBHOOK_URL`, so a production sender can sign and deliver VAPID pushes outside the Next.js request if desired.

Notification preferences are stored in `notification_preferences`.

- Global user preferences use `building_id = null`.
- Building-level preferences are supported by the schema and dispatch logic.
- Settings expose global user preferences to every authenticated role.
- The schema and dispatcher also support building-specific preferences for future per-building UI.

## Mild-Day Automation

Mild-day automation is configured per building in `building_rules`.

Default behavior:

- If outdoor temperature is above `65F`, reduce the heating setpoint by `2F`.
- Never reduce below the configured minimum heat setpoint, default `55F`.
- Skip stale snapshots older than 45 minutes.
- Skip disconnected thermostat snapshots.
- Skip obvious non-heating modes such as `off` and `cool`.
- Apply at most once per building every 6 hours.
- Log successful automatic changes in `audit_logs`.
- Log automation failures in `audit_logs`.

## Scheduling

The alert engine and mild-day automation run from `syncEcobeePortfolio()` after live readings are stored.

Schedule:

```bash
curl -X POST https://climate.detroitliving.com/api/sync/ecobee \
  -H "x-sync-secret: YOUR_ECOBEE_SYNC_SECRET"
```

Do not schedule ecobee sync faster than every 3 minutes.
