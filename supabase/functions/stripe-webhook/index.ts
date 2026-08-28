// Stripe webhook — keeps subscriptions/subscription_seats in sync with what
// was actually purchased. Register this endpoint in the Stripe Dashboard
// pointing at https://<project>.functions.supabase.co/stripe-webhook and set
// STRIPE_WEBHOOK_SECRET to the signing secret shown there.
//   supabase functions deploy stripe-webhook --no-verify-jwt
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno&no-check';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const householdId = session.metadata?.household_id;
      if (householdId) {
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan: session.metadata?.bundle_plan || 'a_la_carte',
          })
          .eq('household_id', householdId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const status = mapStripeStatus(subscription.status);
      await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase.from('subscriptions').update({ status: 'past_due' }).eq('stripe_customer_id', invoice.customer as string);
      break;
    }
    default:
      break; // no-op for events we don't act on yet
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
});

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'incomplete';
  }
}
