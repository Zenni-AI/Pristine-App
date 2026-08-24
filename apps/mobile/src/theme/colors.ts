/**
 * Motherboard design tokens. The "Jarvis" dark theme is used for the voice screen
 * and as the app's default look; a light theme is available for web/tablet
 * contexts where a bright kitchen-counter display reads better.
 */
export const colors = {
  dark: {
    background: '#0B0E14',
    surface: '#141925',
    surfaceRaised: '#1C2333',
    border: '#262E42',
    textPrimary: '#F4F6FB',
    textSecondary: '#9AA5BD',
    accent: '#6C5CE7', // Motherboard violet
    accentGlow: '#8B7CFF',
    success: '#3DD9A7',
    warning: '#F5B942',
    danger: '#FF5C6C',
    sos: '#FF3B4E',
  },
  light: {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#E4E7F0',
    textPrimary: '#141925',
    textSecondary: '#5B6478',
    accent: '#6C5CE7',
    accentGlow: '#8B7CFF',
    success: '#1FAE83',
    warning: '#B87500',
    danger: '#D93A4B',
    sos: '#D93A4B',
  },
};

export const roleAccentColors: Record<string, string> = {
  primary_admin: '#6C5CE7',
  second_admin: '#3B9EFF',
  adult_member: '#5B6478',
  kid: '#FF9F43',
  babysitter: '#3DD9A7',
};

export type ThemeName = keyof typeof colors;
