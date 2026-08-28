-- ============================================================================
-- Motherboard — Tasks: chores, punishments, reading, general responsibilities,
-- points/reward system, and per-member personal reminders.
-- ============================================================================

create type task_category as enum ('chore', 'punishment', 'reading', 'responsibility', 'reminder');
create type task_status as enum ('assigned', 'submitted', 'approved', 'rejected', 'overdue');

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  assigned_to uuid not null references household_members(id) on delete cascade,
  assigned_by uuid not null references household_members(id),
  category task_category not null default 'chore',
  title text not null,
  description text,
  points integer not null default 0,
  due_at timestamptz,
  recurrence text,                     -- rrule-like string, e.g. 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
  status task_status not null default 'assigned',
  submitted_at timestamptz,
  submitted_note text,
  submitted_photo_url text,
  reviewed_by uuid references household_members(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_household on tasks(household_id);
create index idx_tasks_assigned_to on tasks(assigned_to, status);

create trigger trg_tasks_updated_at before update on tasks
  for each row execute function fn_set_updated_at();

-- Reward point ledger — one row per point-affecting event (audit trail).
create table point_ledger (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  delta integer not null,
  reason text,
  created_by uuid references household_members(id),
  created_at timestamptz not null default now()
);

-- Rewards catalog — things kids can redeem points for.
create table rewards (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  description text,
  point_cost integer not null,
  is_active boolean not null default true,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

create table reward_redemptions (
  id uuid primary key default uuid_generate_v4(),
  reward_id uuid not null references rewards(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','denied','fulfilled')),
  requested_at timestamptz not null default now(),
  decided_by uuid references household_members(id),
  decided_at timestamptz
);

-- On task approval: award points automatically.
create or replace function fn_on_task_reviewed()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into point_ledger (household_id, member_id, task_id, delta, reason, created_by)
    values (new.household_id, new.assigned_to, new.id, new.points, 'Task approved: ' || new.title, new.reviewed_by);
    update household_members set points = points + new.points where id = new.assigned_to;
  end if;
  return new;
end;
$$;

create trigger trg_task_reviewed after update on tasks
  for each row execute function fn_on_task_reviewed();

create or replace function fn_on_reward_redeemed()
returns trigger language plpgsql security definer as $$
declare
  v_cost integer;
  v_household uuid;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select point_cost, household_id into v_cost, v_household from rewards where id = new.reward_id;
    insert into point_ledger (household_id, member_id, delta, reason, created_by)
    values (v_household, new.member_id, -v_cost, 'Reward redeemed', new.decided_by);
    update household_members set points = points - v_cost where id = new.member_id;
  end if;
  return new;
end;
$$;

create trigger trg_reward_redeemed after update on reward_redemptions
  for each row execute function fn_on_reward_redeemed();

-- ----------------------------------------------------------------------------
-- RLS: admins manage everything; a member can always see/submit their own
-- assigned tasks; adult_member is read-only everywhere (enforced by omitting
-- write policies for that role — only admins and the assignee get write access,
-- and the assignee's write is restricted to the submit-completion columns via
-- the fn_submit_task RPC rather than a blanket update policy).
-- ----------------------------------------------------------------------------

alter table tasks enable row level security;
alter table point_ledger enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;

create policy tasks_select on tasks for select using (fn_is_household_member(household_id));
create policy tasks_admin_write on tasks for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy point_ledger_select on point_ledger for select using (fn_is_household_member(household_id));
create policy rewards_select on rewards for select using (fn_is_household_member(household_id));
create policy rewards_admin_write on rewards for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy reward_redemptions_select on reward_redemptions for select
  using (exists (select 1 from rewards r where r.id = reward_id and fn_is_household_member(r.household_id)));
create policy reward_redemptions_self_insert on reward_redemptions for insert
  with check (exists (
    select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()
  ));
create policy reward_redemptions_admin_update on reward_redemptions for update
  using (exists (select 1 from rewards r where r.id = reward_id and fn_can_admin(r.household_id)));

-- RPC: a kid/member marks their own task complete (submitted, awaiting approval)
create or replace function fn_submit_task(p_task_id uuid, p_note text default null, p_photo_url text default null)
returns void language plpgsql security definer as $$
declare
  v_task record;
  v_self uuid;
begin
  select * into v_task from tasks where id = p_task_id;
  v_self := fn_self_member_id(v_task.household_id);
  if v_self is null or v_self <> v_task.assigned_to then
    raise exception 'Only the assignee can submit this task';
  end if;
  update tasks set status = 'submitted', submitted_at = now(), submitted_note = p_note, submitted_photo_url = p_photo_url
    where id = p_task_id;
end;
$$;
