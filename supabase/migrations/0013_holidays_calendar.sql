-- ============================================================================
-- Domo — Holidays & events catalog + external calendar integrations
-- (Google Calendar, Outlook, Apple Calendar) with two-way sync.
-- ============================================================================

create type holiday_category as enum ('federal', 'religious', 'cultural', 'personal', 'international');

-- Global reference catalog of selectable holidays (seeded; admin picks which
-- ones they want reminders for during onboarding).
create table holiday_catalog (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category holiday_category not null,
  month integer,                        -- for fixed-date holidays
  day integer,
  rule text,                            -- for floating holidays, e.g. "4th Thursday of November"
  created_at timestamptz not null default now()
);

insert into holiday_catalog (name, category, month, day, rule) values
  ('New Year''s Day', 'federal', 1, 1, null),
  ('Martin Luther King Jr. Day', 'federal', 1, null, '3rd Monday of January'),
  ('Presidents'' Day', 'federal', 2, null, '3rd Monday of February'),
  ('Memorial Day', 'federal', 5, null, 'Last Monday of May'),
  ('Independence Day', 'federal', 7, 4, null),
  ('Labor Day', 'federal', 9, null, '1st Monday of September'),
  ('Thanksgiving', 'federal', 11, null, '4th Thursday of November'),
  ('Christmas Day', 'federal', 12, 25, null),
  ('Easter', 'religious', null, null, 'Computed (Western)'),
  ('Passover', 'religious', null, null, 'Computed (Hebrew calendar)'),
  ('Ramadan Start', 'religious', null, null, 'Computed (Islamic calendar)'),
  ('Eid al-Fitr', 'religious', null, null, 'Computed (Islamic calendar)'),
  ('Diwali', 'religious', null, null, 'Computed (Hindu calendar)'),
  ('Hanukkah', 'religious', null, null, 'Computed (Hebrew calendar)'),
  ('Lunar New Year', 'cultural', null, null, 'Computed (Lunar calendar)'),
  ('Cinco de Mayo', 'cultural', 5, 5, null),
  ('Juneteenth', 'cultural', 6, 19, null),
  ('Mother''s Day', 'personal', null, null, '2nd Sunday of May'),
  ('Father''s Day', 'personal', null, null, '3rd Sunday of June'),
  ('Valentine''s Day', 'personal', 2, 14, null),
  ('Halloween', 'cultural', 10, 31, null);

-- Which holidays this household wants reminders for.
create table household_holidays (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  holiday_catalog_id uuid references holiday_catalog(id) on delete cascade,
  custom_name text,                     -- used when holiday_catalog_id is null (custom holiday)
  custom_date date,
  reminder_days_before integer[] not null default '{7,1}',
  created_at timestamptz not null default now(),
  constraint chk_holiday_source check (holiday_catalog_id is not null or custom_name is not null)
);

create table custom_events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  event_date date not null,
  is_recurring_yearly boolean not null default false,
  notes text,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Calendar integrations (Google / Outlook / Apple) — two-way sync.
-- ----------------------------------------------------------------------------

create type calendar_provider as enum ('google', 'outlook', 'apple');

create table calendar_connections (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  provider calendar_provider not null,
  external_calendar_id text,
  access_token_encrypted text,          -- stored encrypted via Supabase Vault in production
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Local mirror of synced external events, plus mapping so pushes/pulls don't
-- duplicate. Two-way sync: Domo-created schedule_events push out via
-- external_event_id null->set; externally-created events pull in here.
create table synced_calendar_events (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references calendar_connections(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  schedule_event_id uuid references schedule_events(id) on delete cascade,
  external_event_id text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  direction text not null default 'both' check (direction in ('to_external','from_external','both')),
  last_synced_at timestamptz not null default now()
);

alter table household_holidays enable row level security;
alter table custom_events enable row level security;
alter table calendar_connections enable row level security;
alter table synced_calendar_events enable row level security;
alter table holiday_catalog enable row level security;

create policy holiday_catalog_read_all on holiday_catalog for select using (true);

create policy household_holidays_select on household_holidays for select using (fn_is_household_member(household_id));
create policy household_holidays_admin_write on household_holidays for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy custom_events_select on custom_events for select using (fn_is_household_member(household_id));
create policy custom_events_admin_write on custom_events for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy calendar_connections_select on calendar_connections for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
create policy calendar_connections_write on calendar_connections for all
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id)
  with check (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);

create policy synced_events_select on synced_calendar_events for select using (fn_is_household_member(household_id));
create policy synced_events_write on synced_calendar_events for all using (fn_is_household_member(household_id));
