insert into buildings (id, name, address, notes, setup_status, wifi_status, thermostat_install_status, sensor_install_status)
values
  ('00000000-0000-0000-0000-000000000101', 'Woodward Lofts', '1448 Woodward Ave, Detroit, MI', 'Mixed-use loft property with slower upper-floor recovery.', 'complete', 'complete', 'complete', 'complete'),
  ('00000000-0000-0000-0000-000000000102', 'Hubbard House', '1710 Hubbard St, Detroit, MI', 'Starting pilot building for on-site setup and clean manual mapping.', 'in_progress', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000103', 'Mabor Apartments', '811 Mabor Ave, Detroit, MI', 'Needs Wi-Fi confirmation and Thermostat/Sensor identifier verification.', 'needs_wifi', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000104', 'Cass Corridor House', '4620 Cass Ave, Detroit, MI', 'Preload placeholder. Verify address, floors, units, Wi-Fi, and ecobee mapping.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000105', 'Brush Park Flats', '2701 Brush St, Detroit, MI', 'Preload placeholder for field scheduling.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000106', 'Corktown Residence', '1635 Michigan Ave, Detroit, MI', 'Preload placeholder for on-site mapping.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000107', 'Rivertown Commons', '735 Atwater St, Detroit, MI', 'Preload placeholder. Confirm mechanical room access.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000108', 'New Center Court', '3031 W Grand Blvd, Detroit, MI', 'Preload placeholder for future building rollout.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000109', 'Eastern Market House', '1400 Gratiot Ave, Detroit, MI', 'Preload placeholder. Validate floors and sensor count.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000110', 'Midtown North', '71 E Forest Ave, Detroit, MI', 'Preload placeholder for field install tracking.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000111', 'Lafayette Park House', '1300 Lafayette St, Detroit, MI', 'Preload placeholder. Confirm unit labels.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000112', 'Palmer Park Residence', '19600 Woodward Ave, Detroit, MI', 'Preload placeholder. Confirm Wi-Fi readiness.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000113', 'Bagley House', '18900 Livernois Ave, Detroit, MI', 'Preload placeholder for future building onboarding.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000114', 'West Village Flats', '8044 Kercheval Ave, Detroit, MI', 'Preload placeholder. Verify Sensor layout.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000115', 'Boston Edison House', '880 W Boston Blvd, Detroit, MI', 'Preload placeholder. Confirm Thermostat placement.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000116', 'Grand River Residence', '4730 Grand River Ave, Detroit, MI', 'Preload placeholder for installation sequence.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000117', 'Jefferson East House', '14720 E Jefferson Ave, Detroit, MI', 'Preload placeholder. Confirm ecobee account mapping.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000118', 'Marygrove House', '8425 W McNichols Rd, Detroit, MI', 'Preload placeholder for field setup.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000119', 'Russell Industrial Flats', '1600 Clay St, Detroit, MI', 'Preload placeholder. Confirm heating zone assumptions.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup'),
  ('00000000-0000-0000-0000-000000000120', 'Trumbull House', '2121 Trumbull Ave, Detroit, MI', 'Preload placeholder. Confirm floor and unit structure.', 'needs_install', 'needs_wifi', 'needs_install', 'needs_sensor_setup');

insert into floors (id, building_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000101', 'Floor 1', 1),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000101', 'Floor 2', 2),
  ('00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000000101', 'Floor 3', 3),
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000102', 'Floor 1', 1),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000102', 'Floor 2', 2),
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000103', 'Floor 4', 4),
  ('00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000000103', 'Floor 5', 5);

insert into units (id, building_id, floor_id, unit_number, unit_label)
values
  ('00000000-0000-0000-0000-000000004101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001102', '205', 'Unit 205'),
  ('00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001103', '312', 'Unit 312'),
  ('00000000-0000-0000-0000-000000004201', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000001202', '2B', 'Unit 2B'),
  ('00000000-0000-0000-0000-000000004301', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001301', '401', 'Unit 401'),
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001302', '502', 'Unit 502');

insert into thermostats
  (id, building_id, ecobee_thermostat_id, external_device_id, serial_number, reference_label, location_label, device_reference, installation_notes, setup_status, connection_status, linked_ecobee_account, name, last_reported_at)
values
  ('00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000101', 'demo-woodward', 'demo-woodward-ext', 'SN-WDL-88421', 'Main Thermostat', 'Mechanical room east wall', 'Asset WDL-T-01', 'Installed near boiler panel.', 'complete', 'connected', 'primary', 'Woodward Main Thermostat', now()),
  ('00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000102', 'demo-hubbard', 'demo-hubbard-ext', 'SN-HUB-11002', 'Main Thermostat', 'Rear hallway', 'Asset HUB-T-01', 'Manual mapping complete; final ecobee sync verification pending.', 'in_progress', 'ready_to_connect', 'primary', 'Hubbard Main Thermostat', now()),
  ('00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000103', 'demo-mabor', 'demo-mabor-pending', 'SN-MBR-PENDING', 'Main Thermostat', 'To verify on site', 'Asset MBR-T-PENDING', 'Thermostat was not reporting during latest drive-by setup.', 'needs_wifi', 'offline', 'primary', 'Mabor Main Thermostat', now() - interval '31 minutes');

insert into sensors
  (id, thermostat_id, building_id, floor_id, unit_id, ecobee_sensor_id, external_device_id, serial_number, reference_label, device_reference, setup_status, sensor_number, name, last_reported_at)
values
  ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001101', null, 'rs-woodward-lobby', 'rs-woodward-lobby', 'S-WL-001', 'Lobby east column', 'Asset WDL-S-001', 'complete', 1, 'Lobby East Sensor', now()),
  ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000004101', 'rs-woodward-205', 'rs-woodward-205', 'S-WL-205', 'Unit 205 living area', 'Asset WDL-S-205', 'complete', 2, 'Unit 205 Sensor', now()),
  ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000004102', 'rs-woodward-312', 'rs-woodward-312', 'S-WL-312', 'Unit 312 bedroom wall', 'Asset WDL-S-312', 'complete', 3, 'Unit 312 Sensor', now()),
  ('00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000001201', null, 'rs-hubbard-lobby', 'rs-hubbard-lobby', 'S-HUB-001', 'Entry lobby wall', 'Asset HUB-S-001', 'in_progress', 1, 'Hubbard Lobby Sensor', now()),
  ('00000000-0000-0000-0000-000000003202', '00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000004201', 'rs-hubbard-2b', 'rs-hubbard-2b', 'S-HUB-2B', 'Unit 2B living area', 'Asset HUB-S-2B', 'in_progress', 2, 'Hubbard Unit 2B Sensor', now()),
  ('00000000-0000-0000-0000-000000003301', '00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000004301', 'rs-mabor-401', 'rs-mabor-401', 'S-MBR-401', 'Needs verification', 'Asset MBR-S-401', 'needs_wifi', 1, 'Mabor Unit 401 Sensor', now() - interval '31 minutes'),
  ('00000000-0000-0000-0000-000000003302', '00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000004302', 'rs-mabor-502', 'rs-mabor-502', 'S-MBR-502', 'Needs verification', 'Asset MBR-S-502', 'needs_wifi', 2, 'Mabor Unit 502 Sensor', now() - interval '32 minutes');

insert into sensor_readings (sensor_id, temperature_f, occupancy, recorded_at)
values
  ('00000000-0000-0000-0000-000000003101', 69.1, 'occupied', now()),
  ('00000000-0000-0000-0000-000000003102', 69.5, 'unoccupied', now()),
  ('00000000-0000-0000-0000-000000003103', 67.8, 'occupied', now()),
  ('00000000-0000-0000-0000-000000003201', 70.2, 'occupied', now()),
  ('00000000-0000-0000-0000-000000003202', 69.7, 'unoccupied', now()),
  ('00000000-0000-0000-0000-000000003301', 67.2, null, now() - interval '31 minutes'),
  ('00000000-0000-0000-0000-000000003302', 66.1, null, now() - interval '32 minutes');

insert into thermostat_snapshots
  (thermostat_id, building_id, heat_setpoint_f, thermostat_temperature_f, outdoor_temperature_f, connected, recorded_at)
values
  ('00000000-0000-0000-0000-000000002101', '00000000-0000-0000-0000-000000000101', 71, 68.6, 54.2, true, now()),
  ('00000000-0000-0000-0000-000000002102', '00000000-0000-0000-0000-000000000102', 70, 69.4, 55.1, true, now()),
  ('00000000-0000-0000-0000-000000002103', '00000000-0000-0000-0000-000000000103', 72, 66.8, null, false, now() - interval '31 minutes');

insert into building_rules
  (building_id, mild_day_enabled, mild_day_outdoor_threshold_f, mild_day_setpoint_reduction_f, minimum_heat_setpoint_f)
values
  ('00000000-0000-0000-0000-000000000101', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000102', false, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000103', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000104', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000105', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000106', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000107', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000108', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000109', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000110', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000111', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000112', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000113', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000114', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000115', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000116', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000117', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000118', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000119', true, 65, 2, 55),
  ('00000000-0000-0000-0000-000000000120', true, 65, 2, 55);

insert into alerts (id, building_id, thermostat_id, severity, status, alert_key, last_differential_f, started_at, last_event_at)
values
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000002101', 'warning', 'active', 'heat_differential', 2.4, now() - interval '12 minutes', now()),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000002103', 'critical', 'active', 'heat_differential', 5.2, now() - interval '25 minutes', now());

insert into alert_events (alert_id, severity, message, channels)
values
  ('00000000-0000-0000-0000-000000005101', 'warning', 'Woodward Lofts is 2.4F below setpoint for more than 10 minutes.', '{in_app,email}'),
  ('00000000-0000-0000-0000-000000005103', 'critical', 'Mabor Apartments is offline with a widening heat differential.', '{in_app,email,web_push}'),
  ('00000000-0000-0000-0000-000000005103', 'escalation', 'Escalation: Mabor Apartments differential worsened by more than 0.5F.', '{in_app,email,web_push}');

insert into notification_preferences
  (clerk_user_id, building_id, email_enabled, web_push_enabled, warning_enabled, critical_enabled, escalation_enabled, recovery_enabled)
values
  ('seed-admin', null, true, true, true, true, true, true);

insert into audit_logs (actor_user_id, building_id, action, metadata)
values
  ('seed-admin', '00000000-0000-0000-0000-000000000101', 'thermostat.setpoint_hold', '{"from":69,"to":71}'),
  ('system', '00000000-0000-0000-0000-000000000102', 'automation.mild_day_skipped', '{"outdoor":55.1}'),
  ('seed-admin', '00000000-0000-0000-0000-000000000103', 'thermostat.mapping_status_changed', '{"status":"needs_wifi"}');

insert into sync_runs (provider, status, buildings_checked, thermostats_synced, sensors_synced, message, started_at, finished_at)
values
  ('ecobee', 'success', 20, 3, 7, 'Seeded sync run for Detroit Living Climate demo data.', now() - interval '2 minutes', now() - interval '1 minutes');
