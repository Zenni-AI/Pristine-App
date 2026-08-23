-- ============================================================================
-- Domo — Baseline role grants for PostgREST access.
--
-- RLS policies (defined throughout 0001–0014) only ever RESTRICT access on
-- top of a baseline table-level privilege; they don't grant one. Tables
-- created via the SQL Editor don't automatically pick up the anon/
-- authenticated grants that Supabase's Table Editor UI sets up for you, so
-- without this, every request gets rejected outright with 403 before RLS
-- even runs (Postgres error 42501 "insufficient_privilege", which PostgREST
-- surfaces as HTTP 403) — not the empty-result 200 you'd see if only RLS
-- were filtering rows.
--
-- Safe to apply: this does not bypass anything security-relevant. Every
-- table here still has RLS enabled, so `anon`/`authenticated` can only ever
-- see/touch the rows their policies allow — this just lets Postgres get far
-- enough to evaluate those policies in the first place.
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- Ensure this also applies automatically to anything created by future
-- migrations, without needing to remember to grant again each time.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
