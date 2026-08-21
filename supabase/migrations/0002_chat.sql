-- ============================================================================
-- Domo — Chat: Family Group Chat + Babysitter Group Chat
-- ============================================================================

create type chat_kind as enum ('family', 'babysitter');
create type message_kind as enum ('text', 'photo', 'quick_reply', 'ai_update', 'location_share', 'sos');

-- A household has exactly one persistent 'family' chat thread, and zero-or-more
-- 'babysitter' threads (one per babysitter session, auto-archived on expiry).
create table chat_threads (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  kind chat_kind not null,
  babysitter_session_id uuid references babysitter_sessions(id) on delete cascade,
  title text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_babysitter_thread_has_session
    check (kind = 'family' or babysitter_session_id is not null)
);

create unique index uq_one_family_thread_per_household
  on chat_threads(household_id) where kind = 'family';

-- Explicit membership so babysitter threads (and future custom threads) can
-- have a precise participant list. Family thread members are kept in sync
-- via trigger with household_members (admins/adults/kids — never babysitters).
create table chat_thread_members (
  thread_id uuid not null references chat_threads(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  muted_until timestamptz,          -- admin-set quiet hours mute for kids
  last_read_at timestamptz,
  primary key (thread_id, member_id)
);

create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_member_id uuid references household_members(id), -- null = Domo AI system message
  kind message_kind not null default 'text',
  body text,
  photo_url text,
  quick_reply_key text,             -- 'im_okay' | 'need_help' | 'im_home' | 'im_hungry'
  location_lat double precision,
  location_lng double precision,
  is_pinned boolean not null default false,
  pinned_by uuid references household_members(id),
  pinned_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_thread on chat_messages(thread_id, created_at desc);

create table chat_message_reads (
  message_id uuid not null references chat_messages(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, member_id)
);

-- Preset quick-reply buttons available to young kids who can't type yet.
-- Seeded with the 4 defaults; admins can add custom ones per household.
create table quick_reply_options (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade, -- null = global default
  key text not null,
  label text not null,
  emoji text,
  sort_order integer not null default 0
);

insert into quick_reply_options (household_id, key, label, emoji, sort_order) values
  (null, 'im_okay', 'I''m okay', '🙂', 1),
  (null, 'need_help', 'I need help', '🆘', 2),
  (null, 'im_home', 'I''m home', '🏠', 3),
  (null, 'im_hungry', 'I''m hungry', '🍎', 4);

-- ----------------------------------------------------------------------------
-- Keep family thread + its membership in sync with household_members.
-- Babysitters are NEVER added to the family thread, ever.
-- ----------------------------------------------------------------------------

create or replace function fn_ensure_family_thread(p_household_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_thread_id uuid;
begin
  select id into v_thread_id from chat_threads where household_id = p_household_id and kind = 'family';
  if v_thread_id is null then
    insert into chat_threads (household_id, kind, title) values (p_household_id, 'family', 'Family Chat')
    returning id into v_thread_id;
  end if;
  return v_thread_id;
end;
$$;

create or replace function fn_sync_family_thread_membership()
returns trigger language plpgsql security definer as $$
declare
  v_thread_id uuid;
begin
  if new.role = 'babysitter' then
    return new;
  end if;
  v_thread_id := fn_ensure_family_thread(new.household_id);
  insert into chat_thread_members (thread_id, member_id)
  values (v_thread_id, new.id)
  on conflict (thread_id, member_id) do nothing;
  return new;
end;
$$;

create trigger trg_sync_family_thread after insert on household_members
  for each row execute function fn_sync_family_thread_membership();

-- Create a babysitter chat thread whenever a babysitter session starts.
create or replace function fn_create_babysitter_thread()
returns trigger language plpgsql security definer as $$
declare
  v_thread_id uuid;
  v_kid uuid;
  v_admin record;
begin
  insert into chat_threads (household_id, kind, babysitter_session_id, title)
  values (new.household_id, 'babysitter', new.id, 'Babysitter Chat')
  returning id into v_thread_id;

  insert into chat_thread_members (thread_id, member_id) values (v_thread_id, new.member_id);

  for v_admin in
    select id from household_members
    where household_id = new.household_id and role in ('primary_admin','second_admin')
  loop
    insert into chat_thread_members (thread_id, member_id) values (v_thread_id, v_admin.id)
    on conflict do nothing;
  end loop;

  foreach v_kid in array new.care_kids loop
    insert into chat_thread_members (thread_id, member_id) values (v_thread_id, v_kid)
    on conflict do nothing;
  end loop;

  return new;
end;
$$;

create trigger trg_create_babysitter_thread after insert on babysitter_sessions
  for each row execute function fn_create_babysitter_thread();

-- Archive babysitter thread + remove babysitter from all chats when session ends.
create or replace function fn_expire_babysitter_session()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    update chat_threads set is_archived = true, archived_at = now()
      where babysitter_session_id = new.id;
    delete from chat_thread_members where member_id = new.member_id;
    update household_members set is_active = false where id = new.member_id;
  end if;
  return new;
end;
$$;

create trigger trg_expire_babysitter_session after update on babysitter_sessions
  for each row execute function fn_expire_babysitter_session();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table chat_threads enable row level security;
alter table chat_thread_members enable row level security;
alter table chat_messages enable row level security;
alter table chat_message_reads enable row level security;
alter table quick_reply_options enable row level security;

create policy chat_threads_select on chat_threads for select
  using (exists (
    select 1 from chat_thread_members ctm join household_members hm on hm.id = ctm.member_id
    where ctm.thread_id = id and hm.user_id = auth.uid()
  ));

create policy chat_thread_members_select on chat_thread_members for select
  using (exists (
    select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()
  ) or exists (
    select 1 from chat_threads t join household_members hm on hm.household_id = t.household_id
    where t.id = thread_id and hm.user_id = auth.uid() and fn_can_admin(t.household_id)
  ));

create policy chat_threads_admin_manage on chat_threads for update
  using (fn_can_admin(household_id));

-- Messages: readable/writable by anyone who is a member of that thread.
-- Family thread excludes babysitters structurally (never added as members).
create policy chat_messages_select on chat_messages for select
  using (exists (
    select 1 from chat_thread_members ctm join household_members hm on hm.id = ctm.member_id
    where ctm.thread_id = thread_id and hm.user_id = auth.uid()
  ));

create policy chat_messages_insert on chat_messages for insert
  with check (
    exists (
      select 1 from chat_thread_members ctm join household_members hm on hm.id = ctm.member_id
      where ctm.thread_id = thread_id and hm.user_id = auth.uid() and hm.id = sender_member_id
    )
  );

create policy chat_messages_pin_update on chat_messages for update
  using (exists (
    select 1 from chat_threads t where t.id = thread_id and fn_can_admin(t.household_id)
  ));

create policy chat_message_reads_self on chat_message_reads for all
  using (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()))
  with check (exists (select 1 from household_members hm where hm.id = member_id and hm.user_id = auth.uid()));

create policy quick_reply_options_select on quick_reply_options for select
  using (household_id is null or fn_is_household_member(household_id));
create policy quick_reply_options_admin_write on quick_reply_options for all
  using (household_id is not null and fn_can_admin(household_id));
