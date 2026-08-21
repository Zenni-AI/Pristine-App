-- ============================================================================
-- Domo — Food: weekly meal planning, dinner menu (visible to whole family),
-- grocery/shopping lists, low-item reorder reminders, dinner prep reminders.
-- ============================================================================

create table meal_plan_entries (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  meal_date date not null,
  meal_type text not null default 'dinner' check (meal_type in ('breakfast','lunch','dinner','snack')),
  title text not null,
  recipe_url text,
  notes text,
  prep_reminder_minutes_before integer,   -- e.g. remind 60 min before dinner time
  dinner_time time,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

create index idx_meal_plan_household_date on meal_plan_entries(household_id, meal_date);

create table grocery_lists (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null default 'Grocery List',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table grocery_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references grocery_lists(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  category text,                        -- produce, dairy, pantry...
  is_checked boolean not null default false,
  added_by uuid references household_members(id),
  checked_by uuid references household_members(id),
  created_at timestamptz not null default now()
);

-- Recurring household staples that trigger a "low item" reorder reminder.
create table reorder_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,                   -- "Paper towels", "Dog food"
  typical_interval_days integer,
  last_purchased_on date,
  next_reminder_on date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — meal plan/dinner menu visible to ALL roles including kids (per spec:
-- "dinner menu visible to all family members"). Grocery lists editable by
-- anyone non-read-only (admins + kids can add items; adult_member read-only).
-- ----------------------------------------------------------------------------

create or replace function fn_can_edit_household_lists(p_household_id uuid)
returns boolean language sql stable security definer as $$
  select fn_member_role(p_household_id) in ('primary_admin', 'second_admin', 'kid');
$$;

alter table meal_plan_entries enable row level security;
alter table grocery_lists enable row level security;
alter table grocery_items enable row level security;
alter table reorder_items enable row level security;

create policy meal_plan_select on meal_plan_entries for select using (fn_is_household_member(household_id));
create policy meal_plan_admin_write on meal_plan_entries for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy grocery_lists_select on grocery_lists for select using (fn_is_household_member(household_id));
create policy grocery_lists_write on grocery_lists for all
  using (fn_can_edit_household_lists(household_id)) with check (fn_can_edit_household_lists(household_id));

create policy grocery_items_select on grocery_items for select using (fn_is_household_member(household_id));
create policy grocery_items_write on grocery_items for all
  using (fn_can_edit_household_lists(household_id)) with check (fn_can_edit_household_lists(household_id));

create policy reorder_items_select on reorder_items for select using (fn_is_household_member(household_id));
create policy reorder_items_admin_write on reorder_items for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));
