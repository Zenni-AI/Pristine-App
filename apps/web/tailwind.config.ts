import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};

export default config;
