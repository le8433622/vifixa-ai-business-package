import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { user_id, plan_slug, billing_cycle = 'monthly' } = await req.json();

    // Validate required fields
    if (!user_id || !plan_slug) {
      throw new Error('Missing required fields: user_id and plan_slug');
    }

    // Get the membership plan
    const { data: plan, error: planError } = await supabaseClient
      .from('membership_plans')
      .select('*')
      .eq('slug', plan_slug)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error('Invalid or inactive membership plan');
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabaseClient
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      throw new Error('User already has an active subscription. Please cancel it first.');
    }

    // Calculate pricing based on billing cycle
    const price = billing_cycle === 'yearly' && plan.price_yearly > 0 
      ? plan.price_yearly 
      : plan.price_monthly;

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date();
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(now.getFullYear() + 1);
    } else {
      periodEnd.setMonth(now.getMonth() + 1);
    }

    // Create the subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('customer_subscriptions')
      .insert({
        user_id,
        plan_id: plan.id,
        status: 'trialing', // Start with trial, update to 'active' after payment
        billing_cycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        last_payment_amount: 0, // Will be updated after payment
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      throw subError;
    }

    // In production, here you would:
    // 1. Create a payment intent with your payment gateway
    // 2. Return the client secret for frontend to complete payment
    // 3. Use webhooks to update subscription status after successful payment

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          plan: {
            name: plan.name,
            slug: plan.slug,
            features: plan.features,
            discount_percent: plan.discount_percent,
            priority_level: plan.priority_level,
          },
          billing_cycle,
          price,
          currency: plan.currency,
          period: {
            start: subscription.current_period_start,
            end: subscription.current_period_end,
          },
          status: subscription.status,
        },
        next_steps: {
          action: 'complete_payment',
          message: 'Please complete payment to activate your subscription',
          // payment_intent_client_secret: '...', // Would be populated in production
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    );
  } catch (error) {
    console.error('Error in create-subscription:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
