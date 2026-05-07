// Stripe Payment Intent Edge Function
// Per 09_REVENUE_MODEL.md - Fixed+variable pricing model
// Per 15_CODEX_BUSINESS_CONTEXT.md - Payments & Payouts

import { corsHeaders } from '../_shared/cors.ts';

interface PaymentIntentRequest {
  order_id: string;
  amount: number; // in cents
  customer_email: string;
  payment_type: 'fixed' | 'variable' | 'subscription';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    // Verify user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();

    const { order_id, amount, customer_email, payment_type }: PaymentIntentRequest = await req.json();

    if (!order_id || !amount || !customer_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, amount, customer_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'usd',
        customer_email,
        'metadata[order_id]': order_id,
        'metadata[payment_type]': payment_type,
        'automatic_payment_methods[enabled]': 'true',
      }),
    });

    if (!paymentIntentResponse.ok) {
      const stripeError = await paymentIntentResponse.json();
      return new Response(
        JSON.stringify({ error: 'Failed to create payment intent', details: stripeError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentIntent = await paymentIntentResponse.json();

    // Update order with payment intent ID
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment Intent error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
