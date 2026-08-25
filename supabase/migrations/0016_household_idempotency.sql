-- ============================================================================
-- Motherboard — make fn_create_household idempotent per user.
--
-- Bug: fn_create_household had no guard against a user who already has an
-- active household membership. Every call — including a retried one, after
-- the client only *looked* like it failed — created a brand new household +
-- membership row. The frontend's "find my household" query expects at most
-- one active household_members row per user; once a user had two or more,
-- that query broke (Postgres/PostgREST error on "multiple rows returned"),
-- which the frontend silently treated as "no household" — bouncing the user
-- back to the join/create screen forever, even though a household (or
-- several) already existed for them.
--
-- Fix: if the calling user already has an active household membership,
-- return that household's id instead of creating another one. Safe to
-- re-run (create or replace).
-- ============================================================================

create or replace function fn_create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer as $$
declare
  v_household_id uuid;
  v_existing_id uuid;
begin
  select household_id into v_existing_id
  from household_members
  where user_id = auth.uid() and is_active
  order by joined_at asc
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into households (name, created_by) values (coalesce(p_name, 'My Household'), auth.uid())
  returning id into v_household_id;

  insert into household_members (household_id, user_id, role, display_name, joined_at)
  values (v_household_id, auth.uid(), 'primary_admin', coalesce(p_display_name, 'Admin'), now());

  insert into subscriptions (household_id) values (v_household_id);

  return v_household_id;
end;
$$;
