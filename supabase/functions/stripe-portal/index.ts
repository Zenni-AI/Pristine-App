// Creates a Stripe Billing Portal session so admins can manage payment
// method / plan / invoices without Motherboard building its own billing UI.
//   supabase functions deploy stripe-portal
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno&no-check';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, returnUrl } = await req.json();
    const supabase = createSupabaseAdminClient();

    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('household_id', householdId).single();
    if (!sub?.stripe_customer_id) throw new Error('No Stripe customer on file for this household yet');

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl ?? 'motherboard://settings',
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});
