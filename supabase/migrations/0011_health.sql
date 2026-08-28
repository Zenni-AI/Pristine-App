-- ============================================================================
-- Motherboard — Health: medications, doctor/dentist appointments, prescription
-- refills. Sensitive by nature: visible to admins + the member themself;
-- kids do NOT see other kids' health data; adult_member sees all (read-only)
-- consistent with their household-wide visibility.
-- ============================================================================

create table medications (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,                        -- "twice daily", "every 8 hours"
  time_of_day time[],
  prescribing_doctor text,
  pharmacy text,
  refill_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table medication_logs (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid not null references medications(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  taken_at timestamptz not null default now(),
  logged_by uuid references household_members(id)
);

create table medical_providers (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade, -- null = family-wide (e.g. family doctor)
  name text not null,
  specialty text,                        -- "Pediatrician", "Dentist"
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table medical_appointments (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  provider_id uuid references medical_providers(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — admins see/manage everyone's health data. adult_member: read-only,
-- all members (spec says visibility without control). Kid: only their own.
-- ----------------------------------------------------------------------------

create or replace function fn_can_view_member_health(p_household_id uuid, p_member_id uuid)
returns boolean language sql stable security definer as $$
  select
    fn_can_admin(p_household_id)
    or fn_member_role(p_household_id) = 'adult_member'
    or fn_self_member_id(p_household_id) = p_member_id;
$$;

alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table medical_providers enable row level security;
alter table medical_appointments enable row level security;

create policy medications_select on medications for select using (fn_can_view_member_health(household_id, member_id));
create policy medications_admin_write on medications for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy medication_logs_select on medication_logs for select
  using (exists (select 1 from medications m where m.id = medication_id and fn_can_view_member_health(m.household_id, m.member_id)));
create policy medication_logs_insert on medication_logs for insert
  with check (exists (
    select 1 from medications m where m.id = medication_id
    and (fn_can_admin(m.household_id) or fn_self_member_id(m.household_id) = m.member_id)
  ));

create policy medical_providers_select on medical_providers for select using (fn_is_household_member(household_id));
create policy medical_providers_admin_write on medical_providers for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy medical_appointments_select on medical_appointments for select
  using (fn_can_view_member_health(household_id, member_id));
create policy medical_appointments_admin_write on medical_appointments for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));
