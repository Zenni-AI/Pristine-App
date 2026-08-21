// Sends one notification across whichever channels the member has enabled
// (push via Expo, SMS via Twilio, email via Twilio SendGrid), and logs it to
// notification_log. Called by nudge-scheduler and directly for real-time
// events (e.g. SOS). Deploy with: supabase functions deploy send-notification
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')!;
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const NOTIFY_FROM_EMAIL = Deno.env.get('NOTIFY_FROM_EMAIL') ?? 'domo@example.com';

interface NotifyRequest {
  householdId: string;
  memberId: string;
  subject?: string;
  body: string;
  nudgeId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, memberId, subject, body, nudgeId } = (await req.json()) as NotifyRequest;
    const supabase = createSupabaseAdminClient();

    const { data: prefs } = await supabase.from('notification_preferences').select('*').eq('member_id', memberId).maybeSingle();
    const results: Record<string, unknown> = {};

    if (!prefs || prefs.push_enabled) {
      results.push = await sendExpoPush(prefs?.push_token, subject ?? 'Domo', body);
      await logNotification(supabase, { householdId, memberId, channel: 'push', subject, body, nudgeId, status: results.push ? 'sent' : 'failed' });
    }

    if (prefs?.sms_enabled && prefs.phone_number) {
      const sid = await sendSms(prefs.phone_number, body);
      await logNotification(supabase, { householdId, memberId, channel: 'sms', body, nudgeId, providerMessageId: sid, status: sid ? 'sent' : 'failed' });
    }

    if (prefs?.email_enabled && prefs.email && SENDGRID_API_KEY) {
      const ok = await sendEmail(prefs.email, subject ?? 'Domo', body);
      await logNotification(supabase, { householdId, memberId, channel: 'email', subject, body, nudgeId, status: ok ? 'sent' : 'failed' });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});

async function sendExpoPush(pushToken: string | null | undefined, title: string, body: string): Promise<boolean> {
  if (!pushToken) return false;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, sound: 'default' }),
  });
  return res.ok;
}

async function sendSms(to: string, body: string): Promise<string | null> {
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sid ?? null;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: NOTIFY_FROM_EMAIL, name: 'Domo' },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
  return res.ok;
}

async function logNotification(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  entry: { householdId: string; memberId: string; channel: string; subject?: string; body: string; nudgeId?: string; providerMessageId?: string | null; status: string }
) {
  await supabase.from('notification_log').insert({
    household_id: entry.householdId,
    member_id: entry.memberId,
    channel: entry.channel,
    subject: entry.subject,
    body: entry.body,
    related_nudge_id: entry.nudgeId,
    provider_message_id: entry.providerMessageId,
    status: entry.status,
  });
}
