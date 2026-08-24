-- ============================================================================
-- Motherboard — Vehicles: service history, registration, insurance, reminders.
-- Onboarding may capture a vehicle with unknown last-service-date; that's
-- tracked via onboarding_progress + fn_needs_followup below instead of a
-- hard requirement, so Motherboard can nudge later ("do you know your last oil
-- change?") without blocking setup.
-- ============================================================================

create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  nickname text,
  make text,
  model text,
  year integer,
  vin text,
  primary_driver_id uuid references household_members(id),
  last_oil_change_on date,
  last_oil_change_unknown boolean not null default false,   -- flips true -> Motherboard follows up later
  oil_change_interval_miles integer default 5000,
  registration_expires_on date,
  registration_sticker_location text,    -- "glovebox", "rear bumper", etc.
  insurance_provider text,
  insurance_policy_number text,
  insurance_renews_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_vehicles_updated_at before update on vehicles
  for each row execute function fn_set_updated_at();

create type vehicle_service_kind as enum (
  'oil_change', 'tire_rotation', 'inspection', 'repair', 'registration_renewal', 'other'
);

create table vehicle_service_records (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  kind vehicle_service_kind not null,
  service_date date not null default current_date,
  odometer_miles integer,
  cost_cents integer,
  vendor_id uuid references vendors(id) on delete set null,
  notes text,
  logged_by uuid references household_members(id),
  created_at timestamptz not null default now()
);

alter table vehicles enable row level security;
alter table vehicle_service_records enable row level security;

create policy vehicles_select on vehicles for select using (fn_is_household_member(household_id));
create policy vehicles_admin_write on vehicles for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy vehicle_service_select on vehicle_service_records for select using (fn_is_household_member(household_id));
create policy vehicle_service_admin_write on vehicle_service_records for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));
