// Stripe Webhook Edge Function
// Handles Stripe subscription lifecycle events

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Stripe not configured: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
      return jsonResponse({ error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-03-31' });
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId || !planId || !subscriptionId) {
          console.error('Missing metadata in checkout session', session.id);
          return jsonResponse({ received: true });
        }

        const now = new Date().toISOString();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const { error: upsertError } = await supabase
          .from('customer_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: session.metadata?.stripe_price_id || null,
            start_date: now,
            end_date: endDate.toISOString(),
            updated_at: now,
          }, { onConflict: 'stripe_subscription_id', ignoreDuplicates: false });

        if (upsertError) {
          console.error('Failed to upsert subscription:', upsertError);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const periodEnd = new Date((invoice.lines?.data?.[0]?.period?.end || 0) * 1000);
        const { error } = await supabase
          .from('customer_subscriptions')
          .update({
            status: 'active',
            end_date: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId);

        if (error) console.error('Failed to update subscription after payment:', error);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;
        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'active',
          canceled: 'canceled',
          unpaid: 'expired',
          incomplete: 'trialing',
          trialing: 'trialing',
          paused: 'active',
        };

        const localStatus = statusMap[subscription.status] || 'expired';
        const currentPeriodEnd = new Date((subscription.current_period_end || 0) * 1000);

        const { error } = await supabase
          .from('customer_subscriptions')
          .update({
            status: localStatus,
            end_date: currentPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId);

        if (error) console.error('Failed to sync subscription:', error);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from('customer_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', deletedSub.id);

        if (error) console.error('Failed to mark subscription canceled:', error);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return jsonResponse({ received: true });
  } catch (error: any) {
    console.error('stripe-webhook error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
