// Handles the OAuth redirect from Google/Outlook, exchanges the code for
// tokens, and stores a calendar_connections row. Registered as the
// redirect_uri in calendar-oauth-start and in each provider's OAuth app
// config. Deploy with: supabase functions deploy calendar-oauth-callback --no-verify-jwt
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_OAUTH_CLIENT_ID')!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_OAUTH_CLIENT_SECRET')!;
const REDIRECT_BASE = Deno.env.get('SUPABASE_URL')! + '/functions/v1/calendar-oauth-callback';
const APP_DEEP_LINK = 'motherboard://settings/calendars';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  if (!code || !stateRaw) return redirectWithStatus('missing_params');

  const { householdId, memberId, provider } = JSON.parse(atob(stateRaw));
  const supabase = createSupabaseAdminClient();

  try {
    const tokens =
      provider === 'google' ? await exchangeGoogleCode(code) : provider === 'outlook' ? await exchangeMicrosoftCode(code) : null;
    if (!tokens) throw new Error(`Unsupported provider: ${provider}`);

    await supabase.from('calendar_connections').insert({
      household_id: householdId,
      member_id: memberId,
      provider,
      access_token_encrypted: tokens.access_token, // TODO: encrypt via Supabase Vault before production
      refresh_token_encrypted: tokens.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    });

    return redirectWithStatus('connected');
  } catch (err) {
    console.error(err);
    return redirectWithStatus('error');
  }
});

function redirectWithStatus(status: string): Response {
  return new Response(null, { status: 302, headers: { Location: `${APP_DEEP_LINK}?status=${status}` } });
}

async function exchangeGoogleCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_BASE,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

async function exchangeMicrosoftCode(code: string) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      redirect_uri: REDIRECT_BASE,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${await res.text()}`);
  return res.json();
}
