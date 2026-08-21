import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

export interface DomoSupabaseConfig {
  url: string;
  anonKey: string;
  /** Platform-specific storage adapter — AsyncStorage on RN, localStorage/cookies on web. */
  auth?: NonNullable<SupabaseClientOptions<'public'>['auth']>;
}

/**
 * Creates the single Supabase client each app uses. Both apps.mobile and
 * apps.web call this with platform-appropriate auth storage rather than
 * each hand-rolling a client, so query behavior (retries, headers) stays
 * identical across platforms.
 */
export function createDomoSupabaseClient(config: DomoSupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...config.auth,
    },
  });
}

export type { SupabaseClient };
