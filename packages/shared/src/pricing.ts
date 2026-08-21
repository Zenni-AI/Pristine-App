/**
 * Domo pricing model. Prices are in USD cents to avoid float issues.
 * Mirrors the Stripe product/price catalog — see docs/ARCHITECTURE.md for
 * how these map to Stripe Price IDs (kept in env, not hardcoded, since
 * Stripe price IDs differ between test/live mode).
 */
import type { MemberRole } from './roles';

export interface SeatPrice {
  role: MemberRole;
  label: string;
  monthlyCents: number;
  /** Babysitter also supports a per-session price instead of monthly. */
  perSessionCents?: number;
  description: string;
}

export const SEAT_PRICES: Record<MemberRole, SeatPrice> = {
  primary_admin: {
    role: 'primary_admin',
    label: 'Primary Admin',
    monthlyCents: 1499,
    description: 'Full control — edits and manages everything.',
  },
  second_admin: {
    role: 'second_admin',
    label: 'Second Admin',
    monthlyCents: 999,
    description: 'Full control — spouse/partner.',
  },
  adult_member: {
    role: 'adult_member',
    label: 'Adult Member',
    monthlyCents: 599,
    description: 'Read-only — sees everything, cannot edit or manage.',
  },
  kid: {
    role: 'kid',
    label: 'Kid',
    monthlyCents: 299,
    description: 'Personalized view of tasks, schedule, and family chat.',
  },
  babysitter: {
    role: 'babysitter',
    label: 'Babysitter',
    monthlyCents: 499,
    perSessionCents: 299,
    description: 'Temporary guest access that expires when the session ends.',
  },
};

export type BundlePlan = 'solo' | 'couple' | 'family' | 'large_family';

export interface BundlePricing {
  plan: BundlePlan;
  label: string;
  monthlyCents: number;
  includedSeats: number;
  description: string;
}

export const BUNDLE_PRICES: Record<BundlePlan, BundlePricing> = {
  solo: { plan: 'solo', label: 'Solo', monthlyCents: 999, includedSeats: 1, description: 'One admin, full features.' },
  couple: { plan: 'couple', label: 'Couple', monthlyCents: 1999, includedSeats: 2, description: 'Two admins.' },
  family: {
    plan: 'family',
    label: 'Family',
    monthlyCents: 2999,
    includedSeats: 4,
    description: '2 admins + up to 2 kids.',
  },
  large_family: {
    plan: 'large_family',
    label: 'Large Family',
    monthlyCents: 3999,
    includedSeats: 6,
    description: '2 admins + up to 4 kids.',
  },
};

/** Every plan includes exactly one free member seat. */
export const FREE_SEATS_INCLUDED = 1;

/**
 * Given a list of seats (roles) a household wants, compute the cheaper of:
 * (a) a la carte per-seat pricing, or (b) the best-fit bundle — minus one
 * free seat. Used for the pricing/plan-picker screen during onboarding.
 */
export function estimateMonthlyCents(roles: MemberRole[]): {
  aLaCarteCents: number;
  bestBundle: BundlePricing | null;
  recommendedCents: number;
} {
  const sorted = [...roles].sort((a, b) => SEAT_PRICES[b].monthlyCents - SEAT_PRICES[a].monthlyCents);
  // The free seat applies to the cheapest-tier seat the household has, so the
  // household keeps the most value from priciest seats.
  const cheapestIdx = sorted.length
    ? sorted.reduce(
        (minIdx, _role, idx, arr) => (SEAT_PRICES[arr[idx]!].monthlyCents < SEAT_PRICES[arr[minIdx]!].monthlyCents ? idx : minIdx),
        0
      )
    : -1;

  const aLaCarteCents = sorted.reduce(
    (sum, role, idx) => (idx === cheapestIdx ? sum : sum + SEAT_PRICES[role].monthlyCents),
    0
  );

  let bestBundle: BundlePricing | null = null;
  if (roles.length <= 1) bestBundle = BUNDLE_PRICES.solo;
  else if (roles.length === 2 && roles.every((r) => r === 'primary_admin' || r === 'second_admin')) {
    bestBundle = BUNDLE_PRICES.couple;
  } else if (roles.length <= 4) bestBundle = BUNDLE_PRICES.family;
  else bestBundle = BUNDLE_PRICES.large_family;

  const recommendedCents = bestBundle ? Math.min(bestBundle.monthlyCents, aLaCarteCents) : aLaCarteCents;

  return { aLaCarteCents, bestBundle, recommendedCents };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
