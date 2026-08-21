-- ============================================================================
-- Domo — Kids & family schedules: sports seasons, practices, games, school
-- events, activities, homework/project due dates, one-on-one time reminders.
-- ============================================================================

create table activities (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade, -- the kid
  name text not null,                    -- "Soccer", "Piano lessons"
  season text,                           -- "Fall 2026"
  starts_on date,
  ends_on date,
  team_name text,
  coach_contact text,
  created_at timestamptz not null default now()
);

create type schedule_event_kind as enum ('practice', 'game', 'school_event', 'homework', 'project_due', 'other');

create table schedule_events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  kind schedule_event_kind not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_label text,
  location_lat double precision,
  location_lng double precision,
  what_to_bring text[],                  -- ['oranges','water','jersey']
  notes text,
  created_at timestamptz not null default now()
);

create index idx_schedule_events_household on schedule_events(household_id, starts_at);
create index idx_schedule_events_member on schedule_events(member_id, starts_at);

create table school_profiles (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  school_name text,
  grade text,
  teacher_name text,
  teacher_contact text,
  created_at timestamptz not null default now()
);

-- Parent <-> child one-on-one time reminders (recurring).
create table one_on_one_reminders (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  parent_member_id uuid not null references household_members(id) on delete cascade,
  child_member_id uuid not null references household_members(id) on delete cascade,
  recurrence text not null default 'FREQ=WEEKLY',
  last_done_on date,
  next_due_on date,
  created_at timestamptz not null default now()
);

alter table activities enable row level security;
alter table schedule_events enable row level security;
alter table school_profiles enable row level security;
alter table one_on_one_reminders enable row level security;

create policy activities_select on activities for select using (fn_is_household_member(household_id));
create policy activities_admin_write on activities for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy schedule_events_select on schedule_events for select using (fn_is_household_member(household_id));
create policy schedule_events_admin_write on schedule_events for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy school_profiles_select on school_profiles for select using (fn_is_household_member(household_id));
create policy school_profiles_admin_write on school_profiles for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy one_on_one_select on one_on_one_reminders for select using (fn_is_household_member(household_id));
create policy one_on_one_admin_write on one_on_one_reminders for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

-- Auto-post game-day "what to bring" reminder into family chat the morning of.
-- (Actual scheduling is driven by a server-side cron/edge function that calls
-- fn_post_schedule_reminder for events starting soon; see supabase/functions.)
create or replace function fn_post_schedule_reminder(p_event_id uuid)
returns void language plpgsql security definer as $$
declare
  v_event record;
  v_thread_id uuid;
  v_name text;
  v_body text;
begin
  select * into v_event from schedule_events where id = p_event_id;
  select id into v_thread_id from chat_threads where household_id = v_event.household_id and kind = 'family';
  select display_name into v_name from household_members where id = v_event.member_id;

  v_body := v_name || ' has "' || v_event.title || '"';
  if v_event.location_label is not null then
    v_body := v_body || ' at ' || v_event.location_label;
  end if;
  v_body := v_body || ' at ' || to_char(v_event.starts_at, 'HH12:MI AM');
  if v_event.what_to_bring is not null and array_length(v_event.what_to_bring, 1) > 0 then
    v_body := v_body || ' — bring: ' || array_to_string(v_event.what_to_bring, ', ');
  end if;

  if v_thread_id is not null then
    insert into chat_messages (thread_id, sender_member_id, kind, body) values (v_thread_id, null, 'ai_update', v_body);
  end if;
end;
$$;
