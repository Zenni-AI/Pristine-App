# Domo — Roadmap

This tracks what's built vs. what's next. The database schema
(`supabase/migrations/`) already covers every domain in the product spec —
the roadmap below is about UI and integration depth, not missing data
modeling.

## ✅ Built (this pass)

- Monorepo scaffold (pnpm workspaces + Turborepo), shared types/RBAC package
- Full Postgres schema + RLS for every domain: core/billing, chat, tasks,
  location, home, finance, food, vehicles, kids' schedules, garden, health,
  relationships, holidays/calendar, AI/proactive nudges
- Mobile (Expo): auth (email OTP + invite-code join), conversational
  onboarding, role-based tab navigation, dashboard, family chat (quick
  replies, pinning, realtime), tasks/chores (assign → submit → approve →
  points), family location map with SOS, Jarvis-style voice screen,
  babysitter mode (unlock toggles, session lifecycle) and the babysitter's
  own scoped view + chat, settings (members, restrictions, billing,
  notifications, calendar connect stubs)
- Web (Next.js): marketing/pricing landing page, same auth flow, dashboard
  shell with Home / Family Chat / Tasks / Settings
- Edge Functions: onboarding AI reply, full voice loop (STT → Claude →
  TTS), babysitter provisioning, Stripe checkout/portal/webhook, multi-
  channel notifications, the proactive nudge-scheduler engine, calendar
  OAuth start/callback

## 🔜 Next up

### Depth on existing screens
- [ ] Replace 1×1 placeholder app icons/splash with real Domo branding
- [ ] Kid PIN-based login (no email required) for younger kids
- [ ] Photo upload/sharing in chat (currently schema-ready, no picker UI)
- [ ] Push token registration (`expo-notifications` → `notification_preferences.push_token`)
- [ ] Reward redemption UI (schema exists: `rewards`, `reward_redemptions`)

### New domain screens (schema already exists)
- [ ] Home: maintenance schedules, vendor directory, inventory, document vault
- [ ] Finance: bills/subscriptions dashboard, insurance, tax checklist, shopping budgets
- [ ] Food: weekly meal planner, grocery list, low-item reorder reminders
- [ ] Vehicles: service history, registration/insurance renewal tracking
- [ ] Kids' schedules: activities/seasons, game-day details, school profiles, 1:1 time tracker
- [ ] Garden: plant list + watering log
- [ ] Health: medications, appointments, refill tracking
- [ ] Relationships: date night scheduler, special occasions, friends outreach, self-care
- [ ] Holidays: holiday catalog picker (seeded in `0013_holidays_calendar.sql`), custom events
- [ ] Calendar: finish two-way sync (currently OAuth connect only; event push/pull sync job not yet written)

### Web parity
- [ ] Map/location view (Google Maps JS API)
- [ ] Voice screen (WebAudio + MediaRecorder wired to the same `voice-assistant` function)
- [ ] Babysitter Mode admin panel + babysitter's own web view
- [ ] All settings sub-pages the mobile app has (members, restrictions, billing, notifications, calendars)

### Platform hardening
- [ ] `database.types.ts` generated from a live Supabase project (`pnpm supabase:gen-types`) to replace the hand-maintained types in `packages/shared/src/types.ts`
- [ ] Encrypt calendar OAuth tokens at rest (Supabase Vault) instead of plaintext columns
- [ ] Rate limiting / abuse protection on Edge Functions
- [ ] E2E tests (Detox for mobile, Playwright for web) covering the role-based visibility rules — these are the highest-value tests given how much of the product is "who can see what"
- [ ] CI: typecheck + lint on PR, EAS preview builds, Vercel preview deploys
