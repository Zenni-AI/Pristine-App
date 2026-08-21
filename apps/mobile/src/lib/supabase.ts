import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createDomoSupabaseClient } from '@domo/shared';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw at import time (breaks Metro bundling in dev before .env is
  // set up) — surface it loudly instead so onboarding can't silently no-op.
  console.warn(
    '[Domo] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createDomoSupabaseClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
