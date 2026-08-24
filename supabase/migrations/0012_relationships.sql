-- ============================================================================
-- Motherboard — Relationships & connection: date nights, recurring couples
-- activities, anniversaries/birthdays, family nights, friends outreach
-- reminders, self-care reminders. Mostly admin-pair private data (visible to
-- both admins, not necessarily to kids) except family night events which are
-- household-wide.
-- ============================================================================

create table special_occasions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,                   -- "Anniversary", "Mom's Birthday"
  occasion_date date not null,
  is_recurring_yearly boolean not null default true,
  related_member_id uuid references household_members(id) on delete set null,
  reminder_days_before integer[] not null default '{7,1}',
  created_at timestamptz not null default now()
);

create table couple_activities (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,                   -- "Date night", "Weekly walk"
  recurrence text not null,              -- rrule-like: 'FREQ=WEEKLY;BYDAY=TH', 'FREQ=DAILY;INTERVAL=2'
  last_done_on date,
  next_due_on date,
  participant_ids uuid[] not null default '{}',  -- household_members.id[] (usually both admins)
  created_at timestamptz not null default now()
);

create table family_togetherness_events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  kind text not null default 'family_dinner' check (kind in ('family_dinner','game_night','movie_night','other')),
  title text,
  scheduled_at timestamptz,
  recurrence text,
  created_at timestamptz not null default now()
);

create table friends (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade, -- whose friend
  name text not null,
  contact_info text,
  last_connected_on date,
  reach_out_reminder_days integer default 30,
  created_at timestamptz not null default now()
);

create table self_care_reminders (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  activity text not null,                -- "Gym", "Meditation", "Hobby time"
  recurrence text not null default 'FREQ=WEEKLY',
  last_done_on date,
  next_due_on date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS: personal items (friends, self-care) are private to the member + admins.
-- Shared relationship/family items are admin-managed, household-visible.
-- ----------------------------------------------------------------------------

alter table special_occasions enable row level security;
alter table couple_activities enable row level security;
alter table family_togetherness_events enable row level security;
alter table friends enable row level security;
alter table self_care_reminders enable row level security;

create policy special_occasions_select on special_occasions for select using (fn_is_household_member(household_id));
create policy special_occasions_admin_write on special_occasions for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy couple_activities_select on couple_activities for select using (fn_can_admin(household_id));
create policy couple_activities_admin_write on couple_activities for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy family_togetherness_select on family_togetherness_events for select using (fn_is_household_member(household_id));
create policy family_togetherness_admin_write on family_togetherness_events for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy friends_select on friends for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
create policy friends_write on friends for all
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id)
  with check (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);

create policy self_care_select on self_care_reminders for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
create policy self_care_write on self_care_reminders for all
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id)
  with check (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
