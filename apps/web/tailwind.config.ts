import type { Config } from 'tailwindcss';

/**
 * Motherboard design tokens (web).
 *
 * Warm, calm, premium — not corporate SaaS, not a kids' app. A warm
 * off-white base instead of harsh pure white, one primary brand color
 * (terracotta), and a restrained set of category/status colors that
 * exist to help organize information, not decorate it.
 *
 * Mirrors apps/mobile/src/theme/* — keep the two in sync when either
 * changes. See docs/DESIGN_SYSTEM.md for the full rationale and usage
 * guidance.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm neutral surfaces
        background: '#FAF6F1', // warm off-white — never harsh pure white
        surface: '#FFFFFF',
        surfaceRaised: '#FFFFFF', // same color, differentiated by shadow (see boxShadow.raised)
        surfaceSunken: '#F3EDE4', // for wells/inputs-at-rest, subtly recessed
        border: '#E9E1D6',
        borderStrong: '#DCD2C2',

        // Warm charcoal text, never pure black
        textPrimary: '#2B2520',
        textSecondary: '#8A7F71',
        textTertiary: '#B3A996',
        textOnAccent: '#FFF9F3',

        // One primary Motherboard brand color — warm, grounded terracotta
        accent: '#B85C38',
        accentHover: '#9E4C2D',
        accentSoft: '#F3DFD1', // tint for selected/active backgrounds
        accentGlow: '#B85C38', // kept as an alias — old screens reference accentGlow

        // Status — restrained, desaturated, never alarming
        success: '#5B7A5B',
        successSoft: '#E3EAE0',
        warning: '#B8842E',
        warningSoft: '#F3E7D2',
        danger: '#B0483C',
        dangerSoft: '#F2DEDA',
        sos: '#B0483C',

        // Category indicators — subtle, distinguishable, not loud.
        // Used for small dots/pills/left-borders, never as a full fill.
        categoryFamily: '#5E7A93',
        categoryFood: '#B8842E',
        categoryMoney: '#5B7A5B',
        categoryHome: '#8A6A50',
        categoryCalendar: '#8C6E86',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Hierarchy: page title / section title / body / secondary — nothing tiny.
        'page-title': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }], // 30px
        'section-title': ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600' }], // 17px
        body: ['0.9375rem', { lineHeight: '1.4rem', fontWeight: '400' }], // 15px
        secondary: ['0.8125rem', { lineHeight: '1.2rem', fontWeight: '400' }], // 13px — smallest allowed size
      },
      borderRadius: {
        lg: '18px', // major cards
        md: '13px', // buttons, inputs, small components
        sm: '10px', // chips/badges
      },
      boxShadow: {
        // Extremely subtle — presence over drama.
        card: '0 1px 2px rgba(43, 37, 32, 0.04), 0 1px 1px rgba(43, 37, 32, 0.03)',
        raised: '0 8px 24px rgba(43, 37, 32, 0.08), 0 2px 6px rgba(43, 37, 32, 0.04)',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
