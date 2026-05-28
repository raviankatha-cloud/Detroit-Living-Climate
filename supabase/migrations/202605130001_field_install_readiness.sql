alter table buildings
  add column if not exists wifi_status setup_status not null default 'needs_wifi',
  add column if not exists thermostat_install_status setup_status not null default 'needs_install',
  add column if not exists sensor_install_status setup_status not null default 'needs_sensor_setup';

alter table thermostats
  add column if not exists location_label text,
  add column if not exists connection_status text not null default 'not_connected',
  add column if not exists linked_ecobee_account text;

create index if not exists buildings_install_status_idx on buildings(wifi_status, thermostat_install_status, sensor_install_status);
create index if not exists thermostats_connection_status_idx on thermostats(connection_status);

