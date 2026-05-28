create extension if not exists "pgcrypto";

create type user_role as enum ('super_admin', 'manager', 'read_only');
create type alert_severity as enum ('warning', 'critical', 'escalation', 'recovered');
create type alert_status as enum ('active', 'recovered');
create type setup_status as enum ('draft', 'needs_mapping', 'mapped', 'ready', 'synced', 'archived', 'needs_install', 'needs_wifi', 'needs_sensor_setup', 'needs_thermostat_move', 'in_progress', 'complete');

create table buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  notes text,
  timezone text not null default 'America/Detroit',
  setup_status setup_status not null default 'draft',
  wifi_status setup_status not null default 'needs_wifi',
  thermostat_install_status setup_status not null default 'needs_install',
  sensor_install_status setup_status not null default 'needs_sensor_setup',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null,
  floor_number text,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  floor_id uuid references floors(id) on delete set null,
  unit_number text not null,
  unit_label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table thermostats (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null unique references buildings(id) on delete cascade,
  ecobee_thermostat_id text unique,
  external_device_id text,
  serial_number text,
  reference_label text,
  location_label text,
  device_reference text,
  installation_notes text,
  setup_status setup_status not null default 'needs_mapping',
  connection_status text not null default 'not_connected',
  linked_ecobee_account text,
  name text not null,
  last_reported_at timestamptz,
  last_synced_at timestamptz,
  last_sync_status text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sensors (
  id uuid primary key default gen_random_uuid(),
  thermostat_id uuid not null references thermostats(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  floor_id uuid references floors(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  ecobee_sensor_id text,
  external_device_id text,
  serial_number text,
  reference_label text,
  device_reference text,
  installation_notes text,
  setup_status setup_status not null default 'needs_mapping',
  sensor_number integer not null,
  name text not null,
  last_reported_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thermostat_id, ecobee_sensor_id),
  unique (building_id, sensor_number)
);

create table sensor_readings (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid not null references sensors(id) on delete cascade,
  temperature_f numeric(5,2) not null,
  occupancy text,
  recorded_at timestamptz not null,
  inserted_at timestamptz not null default now()
);

create table thermostat_snapshots (
  id uuid primary key default gen_random_uuid(),
  thermostat_id uuid not null references thermostats(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  heat_setpoint_f numeric(5,2) not null,
  thermostat_temperature_f numeric(5,2) not null,
  outdoor_temperature_f numeric(5,2),
  differential_f numeric(5,2) generated always as (heat_setpoint_f - thermostat_temperature_f) stored,
  equipment_status text,
  connected boolean not null default true,
  recorded_at timestamptz not null,
  inserted_at timestamptz not null default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  thermostat_id uuid references thermostats(id) on delete set null,
  severity alert_severity not null,
  status alert_status not null default 'active',
  alert_key text not null,
  last_differential_f numeric(5,2),
  last_notified_at timestamptz,
  started_at timestamptz not null,
  recovered_at timestamptz,
  last_event_at timestamptz not null default now()
);

create table alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts(id) on delete cascade,
  severity alert_severity not null,
  message text not null,
  channels text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text not null,
  building_id uuid references buildings(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table user_building_access (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  building_id uuid references buildings(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (clerk_user_id, building_id)
);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  building_id uuid references buildings(id) on delete cascade,
  email_enabled boolean not null default true,
  web_push_enabled boolean not null default true,
  warning_enabled boolean not null default true,
  critical_enabled boolean not null default true,
  escalation_enabled boolean not null default true,
  recovery_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (clerk_user_id, building_id)
);

create table building_rules (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null unique references buildings(id) on delete cascade,
  mild_day_enabled boolean not null default false,
  mild_day_outdoor_threshold_f numeric(5,2) not null default 65,
  mild_day_setpoint_reduction_f numeric(5,2) not null default 2,
  minimum_heat_setpoint_f numeric(5,2) not null default 55,
  updated_at timestamptz not null default now()
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'ecobee',
  status text not null,
  buildings_checked integer not null default 0,
  thermostats_synced integer not null default 0,
  sensors_synced integer not null default 0,
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table ecobee_tokens (
  id uuid primary key default gen_random_uuid(),
  account_label text not null default 'primary',
  access_token text,
  refresh_token text not null,
  token_type text not null default 'Bearer',
  scope text,
  expires_at timestamptz,
  authorized_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_label)
);

create table ecobee_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  ecobee_pin text not null,
  authorization_code text not null,
  scope text,
  interval_seconds integer not null default 30,
  expires_at timestamptz not null,
  status text not null default 'pending',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ecobee_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  thermostat_identifier text not null unique,
  thermostat_id uuid references thermostats(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,
  connected boolean,
  thermostat_revision text,
  alerts_revision text,
  runtime_revision text,
  interval_revision text,
  equipment_status text,
  last_summary_at timestamptz,
  last_full_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ecobee_device_discoveries (
  id uuid primary key default gen_random_uuid(),
  thermostat_identifier text not null,
  thermostat_id uuid references thermostats(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,
  device_type text not null,
  external_id text not null,
  display_name text,
  payload jsonb not null default '{}',
  mapped_sensor_id uuid references sensors(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (thermostat_identifier, device_type, external_id)
);

create table web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sensor_readings_sensor_recorded_idx on sensor_readings(sensor_id, recorded_at desc);
create index thermostat_snapshots_building_recorded_idx on thermostat_snapshots(building_id, recorded_at desc);
create index alerts_building_status_idx on alerts(building_id, status);
create unique index alerts_one_active_key_idx on alerts(building_id, alert_key) where status = 'active';
create index audit_logs_building_created_idx on audit_logs(building_id, created_at desc);
create index notification_preferences_user_idx on notification_preferences(clerk_user_id, building_id);
create index buildings_setup_status_idx on buildings(setup_status);
create index buildings_install_status_idx on buildings(wifi_status, thermostat_install_status, sensor_install_status);
create index sensors_mapping_idx on sensors(building_id, floor_id, unit_id);
create index sensors_external_device_idx on sensors(external_device_id);
create index thermostats_ecobee_idx on thermostats(ecobee_thermostat_id);
create index thermostats_external_device_idx on thermostats(external_device_id);
create index thermostats_connection_status_idx on thermostats(connection_status);
create index sync_runs_started_idx on sync_runs(started_at desc);
create index web_push_subscriptions_user_idx on web_push_subscriptions(clerk_user_id);
create index ecobee_auth_sessions_status_idx on ecobee_auth_sessions(status, expires_at);
create index ecobee_sync_cursors_building_idx on ecobee_sync_cursors(building_id);
create index ecobee_device_discoveries_building_idx on ecobee_device_discoveries(building_id, device_type);

create or replace view latest_sensor_readings as
select distinct on (sensor_id)
  sensor_id,
  temperature_f,
  occupancy,
  recorded_at
from sensor_readings
order by sensor_id, recorded_at desc;

create or replace view latest_thermostat_snapshots as
select distinct on (building_id)
  building_id,
  thermostat_id,
  heat_setpoint_f,
  thermostat_temperature_f,
  outdoor_temperature_f,
  differential_f,
  connected,
  equipment_status,
  recorded_at
from thermostat_snapshots
order by building_id, recorded_at desc;

create or replace view floor_latest_averages as
select
  s.building_id,
  s.floor_id,
  avg(lsr.temperature_f) as average_temperature_f,
  max(lsr.recorded_at) as latest_recorded_at
from sensors s
join latest_sensor_readings lsr on lsr.sensor_id = s.id
group by s.building_id, s.floor_id;

create or replace view building_latest_averages as
select
  s.building_id,
  avg(lsr.temperature_f) as average_temperature_f,
  max(lsr.recorded_at) as latest_recorded_at
from sensors s
join latest_sensor_readings lsr on lsr.sensor_id = s.id
group by s.building_id;
