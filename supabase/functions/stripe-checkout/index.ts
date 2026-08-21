// Creates a Stripe Checkout Session for a household's subscription — either
// an a-la-carte set of per-role seats or a bundle plan. Called from the
// billing screen. Deploy with: supabase functions deploy stripe-checkout
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno&no-check';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

// Stripe Price IDs — created once in the Stripe Dashboard/CLI and stored as
// env vars so test/live mode can differ without a code change.
const SEAT_PRICE_IDS: Record<string, string | undefined> = {
  primary_admin: Deno.env.get('STRIPE_PRICE_PRIMARY_ADMIN'),
  second_admin: Deno.env.get('STRIPE_PRICE_SECOND_ADMIN'),
  adult_member: Deno.env.get('STRIPE_PRICE_ADULT_MEMBER'),
  kid: Deno.env.get('STRIPE_PRICE_KID'),
  babysitter: Deno.env.get('STRIPE_PRICE_BABYSITTER'),
};

const BUNDLE_PRICE_IDS: Record<string, string | undefined> = {
  solo: Deno.env.get('STRIPE_PRICE_BUNDLE_SOLO'),
  couple: Deno.env.get('STRIPE_PRICE_BUNDLE_COUPLE'),
  family: Deno.env.get('STRIPE_PRICE_BUNDLE_FAMILY'),
  large_family: Deno.env.get('STRIPE_PRICE_BUNDLE_LARGE_FAMILY'),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, bundlePlan, seatRoles, successUrl, cancelUrl } = await req.json();
    const supabase = createSupabaseAdminClient();

    const { data: sub } = await supabase.from('subscriptions').select('*').eq('household_id', householdId).maybeSingle();
    const { data: household } = await supabase.from('households').select('name').eq('id', householdId).single();

    let customerId = sub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: household?.name ?? 'Domo household', metadata: { household_id: householdId } });
      customerId = customer.id;
      await supabase.from('subscriptions').upsert({ household_id: householdId, stripe_customer_id: customerId });
    }

    const lineItems = bundlePlan
      ? [{ price: BUNDLE_PRICE_IDS[bundlePlan], quantity: 1 }]
      : (seatRoles as string[]).map((role) => ({ price: SEAT_PRICE_IDS[role], quantity: 1 }));

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: successUrl ?? 'domo://billing-success',
      cancel_url: cancelUrl ?? 'domo://billing-cancel',
      metadata: { household_id: householdId, bundle_plan: bundlePlan ?? '', seat_roles: (seatRoles ?? []).join(',') },
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});
