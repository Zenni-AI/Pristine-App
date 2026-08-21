-- ============================================================================
-- Domo — Location: real-time map, saved places, safe zones, SOS, drive alerts.
-- Never paywalled — every account type (including kid and babysitter) can
-- read/write their own location and read the household map, gated only by
-- babysitter session unlocks for the 'kids_location' item.
-- ============================================================================

create type saved_location_kind as enum ('home', 'school', 'work', 'family', 'activity', 'custom');
create type geofence_event as enum ('arrive', 'leave');

create table saved_locations (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  label text not null,                  -- "Home", "School", "Grandma's House", "Soccer Field"
  kind saved_location_kind not null default 'custom',
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 150,
  is_safe_zone boolean not null default false,
  notify_on_arrive boolean not null default true,
  notify_on_leave boolean not null default true,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

-- Latest known position per member (upserted frequently by the client).
create table member_locations (
  member_id uuid primary key references household_members(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_meters double precision,
  heading double precision,
  speed_mps double precision,
  battery_pct integer,
  is_sharing boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Historical breadcrumb trail (downsampled by the client before insert).
create table location_history (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references household_members(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index idx_location_history_member on location_history(member_id, recorded_at desc);

-- Geofence entry/exit events, used both for family-chat "Emma arrived at
-- school" auto-posts and for safe-zone notifications.
create table geofence_events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  saved_location_id uuid not null references saved_locations(id) on delete cascade,
  event geofence_event not null,
  occurred_at timestamptz not null default now()
);

-- SOS emergency alerts — instantly visible to both admins with exact location.
create table sos_alerts (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  triggered_at timestamptz not null default now(),
  acknowledged_by uuid references household_members(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- Drive alerts: "Dad is 10 minutes away" — computed client/server-side and
-- logged here so we don't spam duplicate notifications.
create table drive_alerts (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  destination_id uuid references saved_locations(id),
  eta_minutes integer not null,
  notified_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — location sharing is universal across all roles, per product spec.
-- Babysitters only see kids_location once explicitly unlocked for their
-- active session; they can always share their OWN location in that session.
-- ----------------------------------------------------------------------------

alter table saved_locations enable row level security;
alter table member_locations enable row level security;
alter table location_history enable row level security;
alter table geofence_events enable row level security;
alter table sos_alerts enable row level security;
alter table drive_alerts enable row level security;

create policy saved_locations_select on saved_locations for select using (fn_is_household_member(household_id));
create policy saved_locations_admin_write on saved_locations for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy member_locations_select on member_locations for select
  using (
    fn_member_role(household_id) <> 'babysitter'
    or fn_babysitter_unlocked(household_id, 'kids_location')
    or fn_self_member_id(household_id) = member_id
  );
create policy member_locations_self_write on member_locations for all
  using (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()))
  with check (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()));

create policy location_history_select on location_history for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
create policy location_history_self_insert on location_history for insert
  with check (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()));

create policy geofence_events_select on geofence_events for select using (fn_is_household_member(household_id));
create policy geofence_events_insert on geofence_events for insert with check (fn_is_household_member(household_id));

create policy sos_alerts_select on sos_alerts for select using (fn_is_household_member(household_id));
create policy sos_alerts_self_insert on sos_alerts for insert
  with check (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()));
create policy sos_alerts_admin_ack on sos_alerts for update using (fn_can_admin(household_id));

create policy drive_alerts_select on drive_alerts for select using (fn_is_household_member(household_id));

-- Auto-post a system chat message ("Emma arrived at school") on geofence arrival.
create or replace function fn_geofence_to_chat()
returns trigger language plpgsql security definer as $$
declare
  v_thread_id uuid;
  v_name text;
  v_label text;
begin
  select id into v_thread_id from chat_threads where household_id = new.household_id and kind = 'family';
  select display_name into v_name from household_members where id = new.member_id;
  select label into v_label from saved_locations where id = new.saved_location_id;
  if v_thread_id is not null then
    insert into chat_messages (thread_id, sender_member_id, kind, body)
    values (
      v_thread_id, null, 'ai_update',
      v_name || ' ' || (case when new.event = 'arrive' then 'arrived at ' else 'left ' end) || v_label
    );
  end if;
  return new;
end;
$$;

create trigger trg_geofence_to_chat after insert on geofence_events
  for each row execute function fn_geofence_to_chat();

-- SOS alert also drops an urgent flagged message in family chat.
create or replace function fn_sos_to_chat()
returns trigger language plpgsql security definer as $$
declare
  v_thread_id uuid;
  v_name text;
begin
  select id into v_thread_id from chat_threads where household_id = new.household_id and kind = 'family';
  select display_name into v_name from household_members where id = new.member_id;
  if v_thread_id is not null then
    insert into chat_messages (thread_id, sender_member_id, kind, body, location_lat, location_lng, is_pinned)
    values (v_thread_id, new.member_id, 'sos', v_name || ' triggered SOS 🆘', new.lat, new.lng, true);
  end if;
  return new;
end;
$$;

create trigger trg_sos_to_chat after insert on sos_alerts
  for each row execute function fn_sos_to_chat();
