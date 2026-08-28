-- ============================================================================
-- Motherboard — Garden & plants: custom watering schedules, seasonal care reminders.
-- ============================================================================

create table plants (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,                    -- "Fiddle Leaf Fig", "Tomato bed"
  species text,
  location text,                         -- "living room", "backyard"
  is_outdoor boolean not null default false,
  watering_interval_days integer,
  last_watered_on date,
  next_watering_on date,
  seasonal_notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table plant_care_logs (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid not null references plants(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  action text not null default 'watered' check (action in ('watered','fertilized','pruned','repotted','other')),
  logged_by uuid references household_members(id),
  logged_at timestamptz not null default now()
);

alter table plants enable row level security;
alter table plant_care_logs enable row level security;

create policy plants_select on plants for select using (fn_is_household_member(household_id));
create policy plants_write on plants for all
  using (fn_is_household_member(household_id) and fn_member_role(household_id) <> 'adult_member')
  with check (fn_is_household_member(household_id) and fn_member_role(household_id) <> 'adult_member');

create policy plant_care_logs_select on plant_care_logs for select using (fn_is_household_member(household_id));
create policy plant_care_logs_write on plant_care_logs for insert
  with check (fn_is_household_member(household_id) and fn_member_role(household_id) <> 'adult_member');
