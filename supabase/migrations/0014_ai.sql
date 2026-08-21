-- ============================================================================
-- Domo — Proactive AI butler: conversation log, learned family patterns,
-- proactive nudge queue, voice sessions, and outbound notification log.
-- This is the substrate the Anthropic-powered "brain" reads/writes so it can
-- anticipate needs instead of waiting to be asked.
-- ============================================================================

create type nudge_status as enum ('pending', 'sent', 'dismissed', 'actioned', 'snoozed');

-- Every proactive idea Domo has ("It's been 3 months, oil change?") is a row
-- here before it's delivered, so we never re-nudge the same thing constantly.
create table proactive_nudges (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  target_member_id uuid references household_members(id) on delete cascade, -- null = whole household
  domain text not null,                  -- 'vehicles','finance','garden','health','relationships',...
  related_record_type text,              -- e.g. 'vehicle', 'plant', 'onboarding_topic'
  related_record_id uuid,
  message text not null,
  status nudge_status not null default 'pending',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);

create index idx_proactive_nudges_household_status on proactive_nudges(household_id, status, scheduled_for);

-- Freeform AI conversation history (onboarding chat + ongoing butler chat).
create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  kind text not null default 'chat' check (kind in ('onboarding','chat','voice')),
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  audio_url text,                       -- ElevenLabs TTS output, if voice
  created_at timestamptz not null default now()
);

create index idx_ai_messages_conversation on ai_messages(conversation_id, created_at);

-- Learned family patterns — Domo gets smarter over time. Simple key/value
-- facts + confidence score, e.g. {"date_night_day":"Thursday","confidence":0.8}
create table family_patterns (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  pattern_key text not null,
  pattern_value jsonb not null,
  confidence numeric(3,2) not null default 0.50,
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (household_id, pattern_key)
);

-- Outbound notification delivery log (push / text / email via Twilio etc.)
create type notification_channel as enum ('push', 'sms', 'email');

create table notification_log (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade,
  channel notification_channel not null,
  subject text,
  body text not null,
  related_nudge_id uuid references proactive_nudges(id) on delete set null,
  provider_message_id text,             -- Twilio SID etc.
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
  created_at timestamptz not null default now()
);

-- Per-member notification preferences (push/text/email + quiet hours).
create table notification_preferences (
  member_id uuid primary key references household_members(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  email_enabled boolean not null default false,
  phone_number text,
  email text,
  push_token text,
  updated_at timestamptz not null default now()
);

create trigger trg_notification_prefs_updated_at before update on notification_preferences
  for each row execute function fn_set_updated_at();

alter table proactive_nudges enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table family_patterns enable row level security;
alter table notification_log enable row level security;
alter table notification_preferences enable row level security;

create policy proactive_nudges_select on proactive_nudges for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = target_member_id or target_member_id is null);
create policy proactive_nudges_service_write on proactive_nudges for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy ai_conversations_self on ai_conversations for all
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id)
  with check (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);

create policy ai_messages_self on ai_messages for all
  using (exists (
    select 1 from ai_conversations c where c.id = conversation_id
    and (fn_can_admin(c.household_id) or fn_self_member_id(c.household_id) = c.member_id)
  ));

create policy family_patterns_admin on family_patterns for all
  using (fn_can_admin(household_id)) with check (fn_can_admin(household_id));

create policy notification_log_select on notification_log for select
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);

create policy notification_prefs_self on notification_preferences for all
  using (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id)
  with check (fn_can_admin(household_id) or fn_self_member_id(household_id) = member_id);
