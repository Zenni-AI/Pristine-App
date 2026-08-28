/**
 * Motherboard role & permission model.
 *
 * This mirrors the Postgres `member_role` enum + RLS policies in
 * supabase/migrations. RLS is the source of truth for security — this module
 * exists so the client apps can render the *correct experience per role*
 * without waiting on failed writes, and so both apps (mobile + web) agree on
 * one definition of "who can do what."
 */

export const MEMBER_ROLES = [
  'primary_admin',
  'second_admin',
  'adult_member',
  'kid',
  'babysitter',
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ADMIN_ROLES: MemberRole[] = ['primary_admin', 'second_admin'];

/** Feature domains gated by role/plan. Chat + location are never gated. */
export type FeatureDomain =
  | 'chat'
  | 'location'
  | 'tasks'
  | 'home'
  | 'finance'
  | 'food'
  | 'vehicles'
  | 'kids_schedule'
  | 'garden'
  | 'health'
  | 'relationships'
  | 'holidays'
  | 'calendar'
  | 'babysitter'
  | 'admin_chat'
  | 'voice';

export interface RoleCapabilities {
  /** Can see everyone's data across the household. */
  fullVisibility: boolean;
  /** Can create/edit/delete household data (vs. read-only). */
  canEdit: boolean;
  /** Can assign chores/tasks/punishments to other members. */
  canAssignTasks: boolean;
  /** Can approve/deny submitted tasks. */
  canApproveTasks: boolean;
  /** Can add/remove/manage other accounts. */
  canManageAccounts: boolean;
  /** Can set restrictions (quiet hours, screen time) on kids. */
  canSetRestrictions: boolean;
  /** Can broadcast to the whole family chat as an announcement. */
  canBroadcast: boolean;
  /** Has access to the private admin-to-admin chat. */
  hasAdminChat: boolean;
  /** Sees only tasks/schedule/menu assigned or shared with them (kid-style scoping). */
  scopedToSelf: boolean;
  /** Uses simplified quick-reply UI instead of free text everywhere. */
  usesQuickReplies: boolean;
  /** Access expires with a session (babysitter). */
  isTemporary: boolean;
  /** Sees finance data at all. */
  canViewFinance: boolean;
}

const CAPABILITIES: Record<MemberRole, RoleCapabilities> = {
  primary_admin: {
    fullVisibility: true,
    canEdit: true,
    canAssignTasks: true,
    canApproveTasks: true,
    canManageAccounts: true,
    canSetRestrictions: true,
    canBroadcast: true,
    hasAdminChat: true,
    scopedToSelf: false,
    usesQuickReplies: false,
    isTemporary: false,
    canViewFinance: true,
  },
  second_admin: {
    fullVisibility: true,
    canEdit: true,
    canAssignTasks: true,
    canApproveTasks: true,
    canManageAccounts: true,
    canSetRestrictions: true,
    canBroadcast: true,
    hasAdminChat: true,
    scopedToSelf: false,
    usesQuickReplies: false,
    isTemporary: false,
    canViewFinance: true,
  },
  adult_member: {
    fullVisibility: true,
    canEdit: false,
    canAssignTasks: false,
    canApproveTasks: false,
    canManageAccounts: false,
    canSetRestrictions: false,
    canBroadcast: false,
    hasAdminChat: false,
    scopedToSelf: false,
    usesQuickReplies: false,
    isTemporary: false,
    canViewFinance: true,
  },
  kid: {
    fullVisibility: false,
    canEdit: false, // can complete/submit their own tasks, but not manage others'
    canAssignTasks: false,
    canApproveTasks: false,
    canManageAccounts: false,
    canSetRestrictions: false,
    canBroadcast: false,
    hasAdminChat: false,
    scopedToSelf: true,
    usesQuickReplies: false, // flips true for young kids based on birthdate, see isYoungKid()
    isTemporary: false,
    canViewFinance: false,
  },
  babysitter: {
    fullVisibility: false, // only what's explicitly unlocked for the active session
    canEdit: false, // can mark care tasks complete via dedicated RPCs, not general edit
    canAssignTasks: false,
    canApproveTasks: false,
    canManageAccounts: false,
    canSetRestrictions: false,
    canBroadcast: false,
    hasAdminChat: false,
    scopedToSelf: true,
    usesQuickReplies: false,
    isTemporary: true,
    canViewFinance: false,
  },
};

export function getCapabilities(role: MemberRole): RoleCapabilities {
  return CAPABILITIES[role];
}

export function isAdmin(role: MemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Young kids (no birthdate on file, or under this age) get quick-reply-first UI. */
export const QUICK_REPLY_AGE_THRESHOLD = 9;

export function isYoungKid(role: MemberRole, birthdate: string | null | undefined): boolean {
  if (role !== 'kid') return false;
  if (!birthdate) return true; // default to the simpler UI when age is unknown
  const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000));
  return age < QUICK_REPLY_AGE_THRESHOLD;
}

/** Babysitter-unlockable item keys — mirrors babysitter_unlocks.item check constraint. */
export const BABYSITTER_UNLOCK_ITEMS = [
  'schedule',
  'activity_details',
  'care_plan',
  'emergency_contacts',
  'dinner_instructions',
  'wifi_and_door_codes',
  'kids_location',
] as const;

export type BabysitterUnlockItem = (typeof BABYSITTER_UNLOCK_ITEMS)[number];

export const BABYSITTER_UNLOCK_LABELS: Record<BabysitterUnlockItem, string> = {
  schedule: "Kids' schedule for this session",
  activity_details: 'Activity/game details (location, time, what to bring)',
  care_plan: 'Care plan (allergies, medications, bedtime routine, house rules)',
  emergency_contacts: 'Emergency contacts',
  dinner_instructions: 'Dinner instructions',
  wifi_and_door_codes: 'WiFi password & door codes',
  kids_location: "Kids' live location during session",
};

/**
 * Domains that are NEVER paywalled or role-gated, per product spec — every
 * account type gets these regardless of tier.
 */
export const ALWAYS_AVAILABLE_DOMAINS: FeatureDomain[] = ['chat', 'location'];

export function isDomainGated(domain: FeatureDomain): boolean {
  return !ALWAYS_AVAILABLE_DOMAINS.includes(domain);
}
