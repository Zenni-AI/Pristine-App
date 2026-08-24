# Motherboard Design System

Motherboard is the operating system for running a household. It should feel
like **Apple simplicity + a premium personal organizer + a calm family
command center** — not corporate SaaS, not accounting software, not a kids'
app, not a generic AI-generated dashboard.

This document is the source of truth for tokens and components. Screens
should never hard-code a slightly different color, radius, or spacing value
— use the tokens and shared components below, and extend this doc when you
add a new one.

## Rollout status

- **Web (`apps/web`)**: tokens + core primitives + all existing screens
  (landing, sign-in, join, verify, dashboard nav, home, tasks, chat,
  settings) are migrated.
- **Mobile (`apps/mobile`)**: tokens exist (`src/theme/{colors,typography,spacing}.ts`)
  with a new `light` palette, but screens are still on the old dark
  "Jarvis" theme (`colors.dark`) and haven't been individually migrated
  yet. That's the next phase of this rollout.
- **Voice/Domo screen**: intentionally kept on the dark theme (`colors.dark`
  on mobile) — this was the original "Jarvis-style" brief for the
  full-screen voice interaction and is treated as a deliberate, scoped
  exception, not an inconsistency.

## Brand color

One primary brand color: a warm, grounded **terracotta** (`#B85C38`).
Color organizes information — it is not decoration. Category colors below
exist to help someone recognize "this is a Money thing" or "this is a Food
thing" at a glance, at low saturation, never as a full-bleed fill.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `background` | `#FAF6F1` | Page background — warm off-white, never pure white |
| `surface` | `#FFFFFF` | Cards, inputs-at-focus |
| `surfaceSunken` | `#F3EDE4` | Inputs-at-rest, wells |
| `border` | `#E9E1D6` | Hairline borders |
| `borderStrong` | `#DCD2C2` | Hover/emphasis borders |
| `textPrimary` | `#2B2520` | Body/headline text — warm charcoal, never pure black |
| `textSecondary` | `#8A7F71` | Secondary/muted text |
| `textTertiary` | `#B3A996` | Placeholder text, faint labels |
| `accent` | `#B85C38` | The one brand color — primary buttons, links, selected states |
| `accentHover` | `#9E4C2D` | Accent hover/press |
| `accentSoft` | `#F3DFD1` | Accent tint — selected nav item, positive badges |
| `success` / `successSoft` | `#5B7A5B` / `#E3EAE0` | Done, on-track, positive money |
| `warning` / `warningSoft` | `#B8842E` / `#F3E7D2` | Due soon, needs attention |
| `danger` / `dangerSoft` | `#B0483C` / `#F2DEDA` | Overdue, SOS, destructive |
| `categoryFamily` | `#5E7A93` | Family module indicator |
| `categoryFood` | `#B8842E` | Food module indicator |
| `categoryMoney` | `#5B7A5B` | Money module indicator |
| `categoryHome` | `#8A6A50` | Home module indicator |
| `categoryCalendar` | `#8C6E86` | Calendar module indicator |

Defined in `apps/web/tailwind.config.ts` (web) and `apps/mobile/src/theme/colors.ts`
(mobile) — keep both in sync when either changes.

## Typography

Inter (web, via `next/font/google`) / system font (mobile, approximates SF
Pro on iOS). Four-step hierarchy, nothing tiny:

| Token | Size | Weight | Use |
|---|---|---|---|
| `page-title` | 30px / 28px (mobile) | 700 | Screen titles |
| `section-title` | 17px / 16px | 600 | Card headers |
| `body` | 15px | 400 | Primary content |
| `secondary` | 13px | 400 | Muted metadata — the smallest size allowed anywhere |

## Spacing, radii, shadows

- Spacing: Tailwind's default 4px-increment scale on web; `spacing.ts` on
  mobile (`xs` 4 → `xxxl` 32). Generous whitespace over density — this
  product prioritizes what needs attention today, not fitting everything
  on screen.
- Radii: `lg` 18px (major cards), `md` 13px (buttons/inputs), `sm` 10px
  (chips/badges), `full` (avatars/circular only).
- Shadows: extremely subtle. `shadow-card` for resting cards, `shadow-raised`
  for anything that should read as elevated (modals, popovers). Never a
  heavy drop shadow.

## Core components (web: `apps/web/src/components/ui/`)

- **Button** — `primary` / `secondary` / `ghost` / `danger`, `md` / `sm`.
  One component for every button on every screen.
- **Card** — the one card shape (18px radius, hairline border, `shadow-card`).
  Never nest a Card inside a Card.
- **Input** — labeled text input with optional hint text.
- **Avatar** — initial-in-a-circle, deterministic color per person.
- **Badge** / **CategoryDot** — status pills and small category indicators.
- **PageHeader** — title + optional subtitle + optional action, top of
  every screen.
- **EmptyState** / **LoadingState** — an intentional-looking empty state
  ("Nothing planned for dinner yet. Add a meal or let Motherboard suggest
  one.") instead of "No data available"; a calm loading placeholder.

Mobile has `SectionCard` (card shape) and `SosButton` today; the rest of
the primitive set above still needs a mobile equivalent as part of the
mobile re-skin.

## Not yet built (build alongside the screen that needs it, not speculatively)

MealCard, FinancialSummary, FamilyMemberCard, and a Calendar view don't
have a home yet — the screens that would use them (Food, Money, Family,
Calendar modules) haven't been built. Build the composite component and
its screen together so the component is proven against real content,
rather than guessing its shape in advance.

## Rules

- No excessive gradients, pill buttons, or shadows. No cards inside cards.
  No huge colorful icons, unnecessary charts, or dashboard-widget sprawl.
  No tiny text (13px is the floor). No childish illustrations.
- Every screen should answer one question first: *what does this person
  need to know or do right now?* Everything else is lower visual priority
  or lives one level deeper.
- Group related information into one card (e.g. "Money — $3,240 left this
  month, 3 upcoming bills") rather than a card per data point.
