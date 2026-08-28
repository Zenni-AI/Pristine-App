// Builds the OAuth authorization URL for Google Calendar or Outlook/Microsoft
// Graph. The client opens the returned `authUrl`; the provider redirects to
// calendar-oauth-callback when the user approves. Apple Calendar doesn't use
// OAuth — the mobile app talks to on-device EventKit directly instead.
//   supabase functions deploy calendar-oauth-start
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_OAUTH_CLIENT_ID')!;
const REDIRECT_BASE = Deno.env.get('SUPABASE_URL')! + '/functions/v1/calendar-oauth-callback';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, memberId, provider } = await req.json();
    // State carries context through the redirect round-trip — verified again
    // in calendar-oauth-callback before any tokens are stored.
    const state = btoa(JSON.stringify({ householdId, memberId, provider }));

    let authUrl: string;
    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_BASE,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        state,
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === 'outlook') {
      const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        redirect_uri: REDIRECT_BASE,
        response_type: 'code',
        response_mode: 'query',
        scope: 'offline_access Calendars.ReadWrite',
        state,
      });
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    } else {
      throw new Error(`Unsupported provider for OAuth: ${provider}`);
    }

    return new Response(JSON.stringify({ authUrl }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});
