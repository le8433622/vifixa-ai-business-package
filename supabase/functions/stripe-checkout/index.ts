// Stripe Checkout Edge Function
// Creates a Stripe Checkout Session for subscription purchase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return jsonResponse({ error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-03-31' });

    const { plan_id, success_url, cancel_url } = await req.json();
    if (!plan_id) {
      return jsonResponse({ error: 'Missing plan_id' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return jsonResponse({ error: 'Plan not found' }, 404);
    }

    if (!plan.active) {
      return jsonResponse({ error: 'Plan is no longer available' }, 400);
    }

    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://web-eta-ochre-99.vercel.app';
    const successRedirect = success_url || `${baseUrl}/customer/care?checkout=success`;
    const cancelRedirect = cancel_url || `${baseUrl}/customer/care?checkout=canceled`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: successRedirect,
      cancel_url: cancelRedirect,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
      },
    };

    if (plan.stripe_price_id) {
      sessionParams.line_items = [{ price: plan.stripe_price_id, quantity: 1 }];
    } else {
      sessionParams.line_items = [{
        price_data: {
          currency: 'vnd',
          product_data: { name: plan.name, description: plan.description || '' },
          recurring: { interval: plan.interval === 'year' ? 'year' as const : 'month' as const },
          unit_amount: Math.round(plan.price),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url, session_id: session.id });
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    console.error('stripe-checkout error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
