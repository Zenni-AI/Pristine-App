-- ============================================================================
-- Domo — Core schema: households, members, roles, invites, subscriptions
-- All application data is scoped per household. RLS enforces that a user can
-- only read/write rows belonging to a household they are a member of, with
-- write access further restricted by role (see helper functions below).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type member_role as enum (
  'primary_admin',   -- $14.99/mo — full control
  'second_admin',    -- $9.99/mo — full control (spouse/partner)
  'adult_member',    -- $5.99/mo — read-only, sees everything, edits nothing
  'kid',              -- $2.99/mo — sees only what's assigned/shared with them
  'babysitter'        -- $4.99/mo or $2.99/session — temporary, scoped by unlocks
);

create type subscription_plan as enum (
  'solo',            -- $9.99/mo
  'couple',          -- $19.99/mo
  'family',          -- $29.99/mo
  'large_family',    -- $39.99/mo
  'a_la_carte'       -- per-member pricing, no bundle
);

create type billing_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create type onboarding_topic as enum (
  'household_basics', 'kids', 'vehicles', 'home', 'garden', 'health',
  'holidays', 'calendar_connections', 'reminder_preferences', 'finance', 'food'
);

-- ----------------------------------------------------------------------------
-- Households — the top-level tenant. Every domain table has household_id.
-- ----------------------------------------------------------------------------

create table households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Household',
  home_type text,                       -- house, apartment, condo, etc. (onboarding)
  timezone text not null default 'America/New_York',
  invite_code text unique not null default substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8),
  created_by uuid,                      -- auth.users.id of the creator, set after first admin exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Household members — one row per person's membership+role in a household.
-- Linked 1:1 to auth.users, except babysitters may be invited before they
-- have completed signup (user_id nullable until they accept the invite).
-- ----------------------------------------------------------------------------

create table household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role member_role not null,
  display_name text not null,
  avatar_url text,
  birthdate date,                       -- used to distinguish kid sub-experiences (quick-reply mode etc.)
  points integer not null default 0,    -- reward points balance (chores)
  is_active boolean not null default true,
  quiet_hours_start time,               -- kid restriction: chat muted outside these hours
  quiet_hours_end time,
  screen_time_limit_minutes integer,
  invited_email text,
  invited_phone text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index idx_household_members_household on household_members(household_id);
create index idx_household_members_user on household_members(user_id);

-- ----------------------------------------------------------------------------
-- Babysitter sessions — temporary, expiring membership extension.
-- A babysitter is still a household_members row (role='babysitter'), but its
-- access is only "live" while an associated session is active/unexpired.
-- ----------------------------------------------------------------------------

create table babysitter_sessions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  created_by uuid not null references household_members(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                          -- null = open-ended until clock-out
  clocked_in_at timestamptz,
  clocked_out_at timestamptz,
  hourly_rate_cents integer,
  flat_session_rate_cents integer,              -- for $2.99/session pricing model
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','canceled')),
  care_kids member_ids := null,                 -- placeholder, replaced below
  created_at timestamptz not null default now()
);

-- (member_ids isn't a real type — fix the babysitter_sessions table properly)
alter table babysitter_sessions drop column care_kids;
alter table babysitter_sessions add column care_kids uuid[] not null default '{}'; -- household_members.id[] of kids being watched

-- What a babysitter is allowed to see for this session — nothing by default,
-- each item must be explicitly unlocked by an admin.
create table babysitter_unlocks (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references babysitter_sessions(id) on delete cascade,
  item text not null check (item in (
    'schedule', 'activity_details', 'care_plan', 'emergency_contacts',
    'dinner_instructions', 'wifi_and_door_codes', 'kids_location'
  )),
  unlocked_by uuid not null references household_members(id),
  unlocked_at timestamptz not null default now(),
  unique (session_id, item)
);

-- Trusted sitter list + private admin notes per sitter (visible to admins only)
create table trusted_sitters (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  default_hourly_rate_cents integer,
  private_notes text,                   -- admin-only
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

create table babysitter_payments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references babysitter_sessions(id) on delete cascade,
  hours numeric(5,2),
  rate_cents integer,
  total_cents integer,
  paid boolean not null default false,
  paid_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Subscriptions & billing (Stripe). One subscription per household; each
-- member has a billing line item reflecting their per-seat tier. One free
-- member seat is included automatically (see fn_free_seat_id below, applied
-- at the application layer when computing invoices).
-- ----------------------------------------------------------------------------

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null unique references households(id) on delete cascade,
  plan subscription_plan not null default 'a_la_carte',
  status billing_status not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscription_seats (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  stripe_subscription_item_id text,
  price_cents integer not null,          -- resolved seat price at time of purchase
  is_free_seat boolean not null default false,
  billed_per_session boolean not null default false, -- babysitter $2.99/session mode
  created_at timestamptz not null default now(),
  unique (subscription_id, member_id)
);

-- ----------------------------------------------------------------------------
-- Onboarding — conversational setup progress + gentle-nudge follow-ups.
-- ----------------------------------------------------------------------------

create table onboarding_progress (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  topic onboarding_topic not null,
  status text not null default 'not_started' check (status in ('not_started','skipped','in_progress','complete')),
  last_nudged_at timestamptz,
  nudge_count integer not null default 0,
  data jsonb not null default '{}',      -- freeform captured answers for this topic
  updated_at timestamptz not null default now(),
  unique (household_id, topic)
);

-- Generic proactive AI nudge log (butler behavior) — see 0016_ai.sql for the
-- fuller AI schema; this base table is referenced by RLS helper policies.

-- ----------------------------------------------------------------------------
-- updated_at trigger helper (reused by every domain table)
-- ----------------------------------------------------------------------------

create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_households_updated_at before update on households
  for each row execute function fn_set_updated_at();
create trigger trg_household_members_updated_at before update on household_members
  for each row execute function fn_set_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS helper functions
-- ----------------------------------------------------------------------------

-- Is the current auth user an active member of this household?
create or replace function fn_is_household_member(p_household_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from household_members m
    where m.household_id = p_household_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

-- Current auth user's role in a household (null if not a member)
create or replace function fn_member_role(p_household_id uuid)
returns member_role language sql stable security definer as $$
  select m.role from household_members m
  where m.household_id = p_household_id and m.user_id = auth.uid() and m.is_active
  limit 1;
$$;

-- Can the current auth user WRITE domain data in this household?
-- Primary/second admin: yes always. Adult member: read-only (no). Kid: only
-- their own scoped rows (checked per-table). Babysitter: only unlocked items
-- for their active session (checked per-table).
create or replace function fn_can_admin(p_household_id uuid)
returns boolean language sql stable security definer as $$
  select fn_member_role(p_household_id) in ('primary_admin', 'second_admin');
$$;

-- Current auth user's household_members.id (their "self" row) in a household
create or replace function fn_self_member_id(p_household_id uuid)
returns uuid language sql stable security definer as $$
  select m.id from household_members m
  where m.household_id = p_household_id and m.user_id = auth.uid() and m.is_active
  limit 1;
$$;

-- Does the current auth user have an active (non-expired) babysitter session
-- in this household, and if so, has `p_item` been unlocked for it?
create or replace function fn_babysitter_unlocked(p_household_id uuid, p_item text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from babysitter_sessions s
    join household_members m on m.id = s.member_id
    join babysitter_unlocks u on u.session_id = s.id
    where m.household_id = p_household_id
      and m.user_id = auth.uid()
      and s.status = 'active'
      and (s.ends_at is null or s.ends_at > now())
      and u.item = p_item
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS policies — core tables
-- ----------------------------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table babysitter_sessions enable row level security;
alter table babysitter_unlocks enable row level security;
alter table trusted_sitters enable row level security;
alter table babysitter_payments enable row level security;
alter table subscriptions enable row level security;
alter table subscription_seats enable row level security;
alter table onboarding_progress enable row level security;

create policy households_select on households for select
  using (fn_is_household_member(id));
create policy households_update on households for update
  using (fn_can_admin(id));
-- Insert happens via a security-definer RPC (fn_create_household) so a brand
-- new user can create their first household before any membership row exists.

create policy household_members_select on household_members for select
  using (fn_is_household_member(household_id));
create policy household_members_write on household_members for all
  using (fn_can_admin(household_id))
  with check (fn_can_admin(household_id));
-- Members may always update a narrow set of their own fields (handled via
-- fn_update_my_profile RPC) even though the blanket write policy is admin-only.

create policy babysitter_sessions_select on babysitter_sessions for select
  using (fn_is_household_member(household_id));
create policy babysitter_sessions_admin_write on babysitter_sessions for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy babysitter_unlocks_select on babysitter_unlocks for select
  using (exists (
    select 1 from babysitter_sessions s
    where s.id = session_id and fn_is_household_member(s.household_id)
  ));
create policy babysitter_unlocks_admin_write on babysitter_unlocks for all
  using (exists (
    select 1 from babysitter_sessions s
    where s.id = session_id and fn_can_admin(s.household_id)
  ));

create policy trusted_sitters_admin_only on trusted_sitters for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy babysitter_payments_select on babysitter_payments for select
  using (exists (
    select 1 from babysitter_sessions s
    where s.id = session_id and (fn_can_admin(s.household_id) or fn_self_member_id(s.household_id) = s.member_id)
  ));
create policy babysitter_payments_admin_write on babysitter_payments for all
  using (exists (
    select 1 from babysitter_sessions s where s.id = session_id and fn_can_admin(s.household_id)
  ));

create policy subscriptions_select on subscriptions for select
  using (fn_is_household_member(household_id));
create policy subscriptions_admin_write on subscriptions for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy subscription_seats_select on subscription_seats for select
  using (exists (select 1 from subscriptions s where s.id = subscription_id and fn_is_household_member(s.household_id)));
create policy subscription_seats_admin_write on subscription_seats for all
  using (exists (select 1 from subscriptions s where s.id = subscription_id and fn_can_admin(s.household_id)));

create policy onboarding_select on onboarding_progress for select
  using (fn_is_household_member(household_id));
create policy onboarding_admin_write on onboarding_progress for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

-- ----------------------------------------------------------------------------
-- RPC: create a household + its first primary_admin membership atomically.
-- ----------------------------------------------------------------------------

create or replace function fn_create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer as $$
declare
  v_household_id uuid;
begin
  insert into households (name, created_by) values (coalesce(p_name, 'My Household'), auth.uid())
  returning id into v_household_id;

  insert into household_members (household_id, user_id, role, display_name, joined_at)
  values (v_household_id, auth.uid(), 'primary_admin', coalesce(p_display_name, 'Admin'), now());

  insert into subscriptions (household_id) values (v_household_id);

  return v_household_id;
end;
$$;

-- RPC: join a household via invite code (used for second_admin/adult/kid signup)
create or replace function fn_join_household(p_invite_code text, p_role member_role, p_display_name text)
returns uuid language plpgsql security definer as $$
declare
  v_household_id uuid;
begin
  select id into v_household_id from households where invite_code = p_invite_code;
  if v_household_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into household_members (household_id, user_id, role, display_name, joined_at)
  values (v_household_id, auth.uid(), p_role, coalesce(p_display_name, 'Member'), now())
  on conflict (household_id, user_id) do update set is_active = true, joined_at = now();

  return v_household_id;
end;
$$;
