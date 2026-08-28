-- ============================================================================
-- Motherboard — Finance: bills, expenses, subscriptions, insurance, tax reminders,
-- shopping budget tracking. Financial detail defaults to admin+adult visible,
-- hidden from kid role at the application layer (kids see only their own
-- allowance/points, never household bills).
-- ============================================================================

create type bill_recurrence as enum ('once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');

create table bills (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,                   -- "Electric bill", "Netflix", "Home insurance"
  category text,                        -- utility, subscription, insurance, loan, other
  amount_cents integer,
  recurrence bill_recurrence not null default 'monthly',
  due_day_of_month integer,
  next_due_on date,
  autopay boolean not null default false,
  vendor_id uuid references vendors(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid not null references household_members(id),
  created_at timestamptz not null default now()
);

create table bill_payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references bills(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  amount_cents integer not null,
  paid_on date not null default current_date,
  logged_by uuid references household_members(id),
  created_at timestamptz not null default now()
);

create table insurance_policies (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  kind text not null,                   -- home, auto, life, health, umbrella
  provider text,
  policy_number text,
  premium_cents integer,
  renews_on date,
  document_id uuid references household_documents(id) on delete set null,
  created_at timestamptz not null default now()
);

create table tax_profile (
  household_id uuid primary key references households(id) on delete cascade,
  is_self_employed boolean not null default false,
  filing_status text,
  quarterly_reminders_enabled boolean not null default false,
  accountant_vendor_id uuid references vendors(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table tax_deadlines (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  label text not null,                  -- "Q2 estimated tax", "File federal return"
  due_on date not null,
  is_quarterly boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table tax_document_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  label text not null,                  -- "W-2", "1099s", "Mortgage interest statement"
  is_collected boolean not null default false,
  document_id uuid references household_documents(id) on delete set null,
  created_at timestamptz not null default now()
);

create table shopping_budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  category text not null,               -- groceries, clothing, home, entertainment
  monthly_limit_cents integer not null,
  period_start date not null default date_trunc('month', current_date),
  created_at timestamptz not null default now()
);

create table shopping_expenses (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  budget_id uuid references shopping_budgets(id) on delete set null,
  amount_cents integer not null,
  description text,
  spent_by uuid references household_members(id),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS — finance is visible to admins + adult_member (read-only per role, not
-- RLS) but not exposed to kid/babysitter roles at all.
-- ----------------------------------------------------------------------------

create or replace function fn_can_view_finance(p_household_id uuid)
returns boolean language sql stable security definer as $$
  select fn_member_role(p_household_id) in ('primary_admin', 'second_admin', 'adult_member');
$$;

alter table bills enable row level security;
alter table bill_payments enable row level security;
alter table insurance_policies enable row level security;
alter table tax_profile enable row level security;
alter table tax_deadlines enable row level security;
alter table tax_document_checklist_items enable row level security;
alter table shopping_budgets enable row level security;
alter table shopping_expenses enable row level security;

create policy bills_select on bills for select using (fn_can_view_finance(household_id));
create policy bills_admin_write on bills for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy bill_payments_select on bill_payments for select using (fn_can_view_finance(household_id));
create policy bill_payments_admin_write on bill_payments for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy insurance_select on insurance_policies for select using (fn_can_view_finance(household_id));
create policy insurance_admin_write on insurance_policies for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy tax_profile_select on tax_profile for select using (fn_can_view_finance(household_id));
create policy tax_profile_admin_write on tax_profile for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy tax_deadlines_select on tax_deadlines for select using (fn_can_view_finance(household_id));
create policy tax_deadlines_admin_write on tax_deadlines for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy tax_checklist_select on tax_document_checklist_items for select using (fn_can_view_finance(household_id));
create policy tax_checklist_admin_write on tax_document_checklist_items for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy shopping_budgets_select on shopping_budgets for select using (fn_can_view_finance(household_id));
create policy shopping_budgets_admin_write on shopping_budgets for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy shopping_expenses_select on shopping_expenses for select using (fn_can_view_finance(household_id));
create policy shopping_expenses_admin_write on shopping_expenses for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));
