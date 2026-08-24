/**
 * Motherboard design tokens (mobile). Mirrors apps/web/tailwind.config.ts —
 * keep the two in sync. See docs/DESIGN_SYSTEM.md for full rationale.
 *
 * `light` is the app's default look going forward: warm, calm, premium —
 * not a dark "AI dashboard." `dark` is kept as a distinct, deliberately
 * scoped theme for the full-screen voice/Domo experience only (the
 * original "Jarvis-style" brief), not the app's general appearance.
 *
 * Screens are being migrated to `light` progressively — see the mobile
 * re-skin follow-up in the design system rollout notes. Until a screen is
 * migrated it may still reference `colors.dark` directly.
 */
export const colors = {
  light: {
    background: '#FAF6F1', // warm off-white — never harsh pure white
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#F3EDE4',
    border: '#E9E1D6',
    borderStrong: '#DCD2C2',
    textPrimary: '#2B2520', // warm charcoal, never pure black
    textSecondary: '#8A7F71',
    textTertiary: '#B3A996',
    textOnAccent: '#FFF9F3',
    accent: '#B85C38', // Motherboard terracotta — the one primary brand color
    accentHover: '#9E4C2D',
    accentSoft: '#F3DFD1',
    accentGlow: '#B85C38', // alias kept for screens still referencing the old name
    success: '#5B7A5B',
    successSoft: '#E3EAE0',
    warning: '#B8842E',
    warningSoft: '#F3E7D2',
    danger: '#B0483C',
    dangerSoft: '#F2DEDA',
    sos: '#B0483C',
  },
  // Voice/Domo screen only — full-screen, deliberately dark.
  dark: {
    background: '#0B0E14',
    surface: '#141925',
    surfaceRaised: '#1C2333',
    border: '#262E42',
    textPrimary: '#F4F6FB',
    textSecondary: '#9AA5BD',
    accent: '#6C5CE7',
    accentGlow: '#8B7CFF',
    success: '#3DD9A7',
    warning: '#F5B942',
    danger: '#FF5C6C',
    sos: '#FF3B4E',
  },
};

// Category indicators — subtle, distinguishable, not loud. Used for small
// dots/pills/left-borders, never as a full fill. Matches web's category* tokens.
export const categoryColors = {
  family: '#5E7A93',
  food: '#B8842E',
  money: '#5B7A5B',
  home: '#8A6A50',
  calendar: '#8C6E86',
};

// NOTE: still tuned against the dark voice-theme background, since the tab
// bar (apps/mobile/app/(tabs)/_layout.tsx) hasn't been migrated to `light`
// yet. Update these alongside that migration, not before — the current
// terracotta accent reads correctly on `light` surfaces but is untested
// against `dark` ones.
export const roleAccentColors: Record<string, string> = {
  primary_admin: '#6C5CE7',
  second_admin: '#3B9EFF',
  adult_member: '#5B6478',
  kid: '#FF9F43',
  babysitter: '#3DD9A7',
};

export type ThemeName = keyof typeof colors;
