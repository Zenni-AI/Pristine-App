-- ============================================================================
-- Motherboard — Home management: maintenance/repairs, warranties, appliances,
-- vendors, inventory, and document storage.
-- ============================================================================

create table home_assets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,                    -- "HVAC System", "Water Heater", "Refrigerator"
  category text,                         -- appliance, structural, system
  brand text,
  model text,
  purchase_date date,
  warranty_expires_on date,
  install_location text,
  notes text,
  created_at timestamptz not null default now()
);

create type maintenance_recurrence_unit as enum ('days', 'weeks', 'months', 'years');

create table maintenance_schedules (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  asset_id uuid references home_assets(id) on delete cascade,
  title text not null,                   -- "Change HVAC filter"
  recurrence_interval integer,
  recurrence_unit maintenance_recurrence_unit,
  last_completed_on date,
  next_due_on date,
  assigned_to uuid references household_members(id),
  created_at timestamptz not null default now()
);

create table maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid references maintenance_schedules(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  completed_on date not null default current_date,
  cost_cents integer,
  vendor_id uuid,
  notes text,
  logged_by uuid references household_members(id),
  created_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,                    -- "Joe's Plumbing"
  category text,                         -- plumber, electrician, HVAC, landscaper...
  phone text,
  email text,
  website text,
  notes text,
  is_favorite boolean not null default false,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

alter table maintenance_records
  add constraint fk_maintenance_records_vendor foreign key (vendor_id) references vendors(id) on delete set null;

create table home_inventory_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text,
  purchase_date date,
  value_cents integer,
  serial_number text,
  photo_url text,
  location_in_home text,
  created_at timestamptz not null default now()
);

create table household_documents (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  category text,                          -- deed, lease, insurance policy, manual, receipt
  file_url text not null,
  related_asset_id uuid references home_assets(id) on delete set null,
  uploaded_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS: standard household pattern — all members can read (adult_member is
-- read-only per product spec, kid sees per app-level UI gating not RLS since
-- home data isn't privacy-sensitive per-child); only admins write.
-- ----------------------------------------------------------------------------

alter table home_assets enable row level security;
alter table maintenance_schedules enable row level security;
alter table maintenance_records enable row level security;
alter table vendors enable row level security;
alter table home_inventory_items enable row level security;
alter table household_documents enable row level security;

create policy home_assets_select on home_assets for select using (fn_is_household_member(household_id));
create policy home_assets_admin_write on home_assets for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy maintenance_schedules_select on maintenance_schedules for select using (fn_is_household_member(household_id));
create policy maintenance_schedules_admin_write on maintenance_schedules for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy maintenance_records_select on maintenance_records for select using (fn_is_household_member(household_id));
create policy maintenance_records_admin_write on maintenance_records for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy vendors_select on vendors for select using (fn_is_household_member(household_id));
create policy vendors_admin_write on vendors for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy home_inventory_select on home_inventory_items for select using (fn_is_household_member(household_id));
create policy home_inventory_admin_write on home_inventory_items for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy household_documents_select on household_documents for select using (fn_is_household_member(household_id));
create policy household_documents_admin_write on household_documents for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));
