# Domo

Domo is a full-stack AI life & home management app for the whole family.
Every family member downloads the same app — iOS, Android, or web — and
sees a different experience based on their role: **Primary Admin, Second
Admin, Adult Member, Kid, or Babysitter.**

Domo doesn't wait to be asked. It proactively manages chores, schedules,
meals, home maintenance, finances, vehicles, health, relationships,
holidays, and family location — and gets smarter about your family's
patterns the longer you use it.

👉 See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for how everything
fits together, and **[docs/ROADMAP.md](docs/ROADMAP.md)** for what's built
vs. what's next.

## Monorepo layout

```
apps/mobile/     Expo (React Native) — iOS, Android, Expo web
apps/web/         Next.js — marketing site + full web app
packages/shared/  Types, role/permission matrix, pricing, Supabase client
supabase/         Postgres schema + RLS (migrations/), Edge Functions (functions/)
docs/             Architecture & roadmap
```

## Getting started

### 1. Supabase (database, auth, storage, edge functions)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # applies supabase/migrations/*.sql
pnpm supabase:gen-types          # optional: regenerate typed DB bindings
```

Set Edge Function secrets (see `docs/ARCHITECTURE.md` for the full list per
function):

```bash
supabase secrets set ANTHROPIC_API_KEY=... ELEVENLABS_API_KEY=... \
  STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... \
  SENDGRID_API_KEY=... GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \
  MICROSOFT_OAUTH_CLIENT_ID=... MICROSOFT_OAUTH_CLIENT_SECRET=...

supabase functions deploy onboarding-ai
supabase functions deploy voice-assistant
supabase functions deploy provision-babysitter
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy send-notification
supabase functions deploy nudge-scheduler
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback --no-verify-jwt
```

### 2. Install & configure the apps

```bash
pnpm install

cp apps/mobile/.env.example apps/mobile/.env   # fill in Supabase + Google Maps keys
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase keys
```

### 3. Run mobile (this is the mobile-first core — start here)

```bash
pnpm dev:mobile     # opens Expo dev tools; press i / a / w for iOS/Android/web
```

### 4. Run web

```bash
pnpm dev:web        # http://localhost:3000
```

## Tech stack

- **Mobile**: React Native (Expo + Expo Router)
- **Web**: Next.js (App Router)
- **Database / Auth / Realtime / Storage**: Supabase (Postgres + Row-Level Security)
- **AI brain**: Anthropic (Claude) — onboarding conversation, proactive nudges, voice reasoning
- **Voice**: ElevenLabs — speech-to-text + text-to-speech
- **Billing**: Stripe — per-seat & bundle subscriptions
- **Notifications**: Twilio (SMS), SendGrid (email), Expo Push
- **Location**: Google Maps API
