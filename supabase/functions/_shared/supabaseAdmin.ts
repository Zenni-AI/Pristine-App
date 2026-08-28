import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/** Service-role client — bypasses RLS. Only ever used inside edge functions, never shipped to a client. */
export function createSupabaseAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
