# Motherboard — Architecture

Motherboard is a monorepo: one Postgres schema (Supabase), one mobile app (Expo /
React Native, iOS + Android), one web app (Next.js), and a set of Supabase
Edge Functions that do everything requiring a secret key (Anthropic,
ElevenLabs, Stripe, Twilio, OAuth).

```
motherboard/
├── apps/
│   ├── mobile/            Expo Router app — iOS, Android, and Expo web
│   └── web/                Next.js App Router site (marketing + full web app)
├── packages/
│   └── shared/             Types, role/permission matrix, pricing, Supabase client factory
├── supabase/
│   ├── migrations/         Postgres schema + RLS policies (0001–0014, one per domain)
│   ├── functions/          Edge Functions (Deno) — AI, voice, billing, notifications, OAuth
│   └── config.toml         Local Supabase CLI config
└── docs/
```

## Why this stack

| Concern | Choice | Why |
|---|---|---|
| Mobile | Expo (React Native) + Expo Router | One codebase for iOS + Android, OTA updates, file-based routing mirrors the web app's mental model |
| Web | Next.js (App Router) | Same React component model as mobile conceptually; SSR for the marketing site, client components for the live app |
| Database/Auth/Realtime/Storage | Supabase (Postgres) | Row-Level Security gives us real per-household, per-role data isolation without a custom API layer; Realtime powers chat & live location |
| AI reasoning | Anthropic (Claude) | Onboarding conversation, proactive nudges, voice assistant reasoning |
| Voice | ElevenLabs | Speech-to-text (Scribe) + text-to-speech for the Jarvis-style voice screen |
| Billing | Stripe | Per-seat + bundle subscriptions, Checkout, Billing Portal, webhooks |
| Notifications | Twilio (SMS) + SendGrid (email) + Expo Push | The three reminder channels the product spec calls for |
| Maps/Location | Google Maps API (`react-native-maps` on mobile) | Family map, safe zones, drive alerts |

## Data model & multi-tenancy

Every domain table has a `household_id` and is protected by Row-Level
Security. Two helper functions do almost all of the enforcement work (see
`supabase/migrations/0001_core.sql`):

- `fn_is_household_member(household_id)` — is the current auth user an
  active member of this household at all?
- `fn_can_admin(household_id)` — is the current auth user a
  `primary_admin` or `second_admin`?

Everything else composes from those two, plus a few narrower helpers
(`fn_can_view_finance`, `fn_babysitter_unlocked`, `fn_self_member_id`, …).
**RLS is the actual security boundary** — the client-side role/capability
checks in `packages/shared/src/roles.ts` exist purely so the UI renders the
right experience without round-tripping a failed write; never rely on them
alone.

### The five roles

`primary_admin`, `second_admin`, `adult_member`, `kid`, `babysitter` — see
`packages/shared/src/roles.ts` for the full capability matrix. Two rules that
show up everywhere in the schema:

1. **Chat and location are never gated** — every RLS policy for
   `chat_messages` and `member_locations` grants access by household
   membership, not by role or subscription tier.
2. **Babysitters see nothing by default.** A `babysitter_sessions` row
   grants no visibility on its own; each item (`schedule`,
   `care_plan`, `kids_location`, …) needs its own `babysitter_unlocks` row,
   created explicitly by an admin, and RLS checks that unlock directly
   (`fn_babysitter_unlocked`). The sitter's whole household membership goes
   inactive the moment the session is marked `completed`
   (`fn_expire_babysitter_session` in `0002_chat.sql`), which also archives
   their chat thread and strips them from chat membership.

### Chat

One persistent `family` thread per household (kept in sync with
`household_members` by a trigger — babysitters are structurally excluded,
they're never inserted into `chat_thread_members` for it). Each babysitter
session gets its own `babysitter` thread, created and later archived
automatically alongside the session.

### The proactive AI butler

`proactive_nudges`, `family_patterns`, `ai_conversations` / `ai_messages`,
and `notification_log` (all in `0014_ai.sql`) are the substrate for "Motherboard
doesn't wait to be asked." The `nudge-scheduler` Edge Function is the
engine: run it on a schedule (hourly is reasonable) and it scans domain
tables — vehicles, plants, medications, couple activities, home
maintenance, special occasions, skipped onboarding topics, tomorrow's
games/practices — and inserts a nudge only if one doesn't already exist for
that exact record (so nobody gets nagged twice about the same oil change).

## Edge Functions (`supabase/functions/`)

| Function | Purpose | Secrets needed |
|---|---|---|
| `onboarding-ai` | Turns a free-text onboarding answer into a warm Motherboard reply | `ANTHROPIC_API_KEY` |
| `voice-assistant` | Full voice loop: ElevenLabs STT → Anthropic reasoning (with household context) → ElevenLabs TTS → Storage upload | `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` |
| `provision-babysitter` | Service-role creation of a babysitter's temporary auth user + membership | `SUPABASE_SERVICE_ROLE_KEY` |
| `stripe-checkout` | Creates a Checkout Session for a seat/bundle purchase | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` |
| `stripe-portal` | Creates a Billing Portal session | `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Syncs `subscriptions`/status from Stripe events | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `send-notification` | Fan-out to push (Expo)/SMS (Twilio)/email (SendGrid) per member preference | `TWILIO_*`, `SENDGRID_API_KEY` |
| `nudge-scheduler` | The proactive butler's scan-and-notify loop; invoke on a cron schedule | (uses the above) |
| `calendar-oauth-start` / `calendar-oauth-callback` | Google/Outlook two-way calendar OAuth | `GOOGLE_OAUTH_*`, `MICROSOFT_OAUTH_*` |

Deploy all of them with `supabase functions deploy <name>`
(`stripe-webhook` and `calendar-oauth-callback` need `--no-verify-jwt` since
they're called by Stripe/the OAuth provider, not an authenticated app user).

### Scheduling `nudge-scheduler`

Use [Supabase Scheduled Functions](https://supabase.com/docs/guides/functions/schedule-functions)
(built on `pg_cron` + `pg_net`), e.g.:

```sql
select cron.schedule(
  'motherboard-nudge-scheduler-hourly',
  '0 * * * *',
  $$ select net.http_post(
    url := 'https://<project>.functions.supabase.co/nudge-scheduler',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  ) $$
);
```

## Auth

- **Primary/second admin & adult member**: passwordless email OTP
  (`supabase.auth.signInWithOtp` / `verifyOtp`).
- **Kid**: also joins via `fn_join_household(invite_code, role, display_name)`
  after email OTP today; a PIN-based lightweight login for kids without their
  own email is a near-term follow-up (see `docs/ROADMAP.md`).
- **Babysitter**: never self-serves. An admin calls `provision-babysitter`
  from Babysitter Mode, which creates the auth user (invited by email, or a
  placeholder account for in-person PIN/magic-link handoff) and inserts
  their `household_members` row directly with `role = 'babysitter'`.

## Environment variables

Each app has its own `.env.example`:

- `apps/mobile/.env.example` — `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `apps/web/.env.example` — the `NEXT_PUBLIC_` equivalents

Edge Function secrets are set with `supabase secrets set KEY=value` (never
committed) — see the table above for which functions need which keys.

## Deployment

- **Mobile**: [EAS Build](https://docs.expo.dev/build/introduction/) for
  iOS/Android binaries, EAS Submit to TestFlight/Play Console, EAS Update
  for OTA JS updates between store releases.
- **Web**: Vercel (zero-config for Next.js App Router).
- **Database/Auth/Functions**: a Supabase project — run
  `supabase link` then `supabase db push` to apply `supabase/migrations/`,
  and `supabase functions deploy` per function above.

## What's scaffolded vs. what's a stub

This repo is the **mobile-first core**: auth, onboarding, role-based
navigation, family chat (with quick replies, pinning, babysitter thread
lifecycle), chores/tasks with approval + points, real-time family location
with SOS, the voice screen UI, babysitter mode end-to-end (unlock toggles,
clock in/out, scoped babysitter view), and billing/settings — all backed by
a complete database schema for every domain in the product spec (home,
finance, food, vehicles, kids' schedules, garden, health, relationships,
holidays, calendar sync).

Domains with full schema + RLS but only a stubbed or partial UI today —
**next to build, not missing from the design**: home maintenance, finance,
meal planning/groceries, vehicles, kids' schedules/games, garden, health,
relationships, holidays, and calendar sync screens. `docs/ROADMAP.md` has
the concrete next steps.
