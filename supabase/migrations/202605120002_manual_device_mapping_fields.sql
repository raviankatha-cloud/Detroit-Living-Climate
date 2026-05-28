alter table thermostats
  add column if not exists external_device_id text,
  add column if not exists device_reference text;

alter table sensors
  add column if not exists external_device_id text,
  add column if not exists device_reference text;

create index if not exists thermostats_external_device_idx on thermostats(external_device_id);
create index if not exists sensors_external_device_idx on sensors(external_device_id);

