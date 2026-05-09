// Stripe Connect Onboarding Edge Function
// Per 09_REVENUE_MODEL.md - Stripe Connect for worker payouts
// Per 15_CODEX_BUSINESS_CONTEXT.md - Payments & Payouts

import { corsHeaders } from '../_shared/cors.ts';

interface StripeConnectRequest {
  worker_id: string;
  email: string;
  country?: string;
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

    // Verify user is a worker
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

    const { worker_id, email, country = 'US' }: StripeConnectRequest = await req.json();

    if (!worker_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: worker_id, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if worker already has a Stripe account
    const workerResponse = await fetch(
      `${supabaseUrl}/rest/v1/workers?id=eq.${worker_id}&select=stripe_account_id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const worker = await workerResponse.json();
    if (!workerResponse.ok || !worker[0]) {
      return new Response(
        JSON.stringify({ error: 'Worker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let stripeAccountId = worker[0].stripe_account_id;

    // Create Stripe Connect account if not exists
    if (!stripeAccountId) {
      const stripeResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          country,
          email,
          'capabilities[transfers][requested]': 'true',
          'capabilities[card_payments][requested]': 'true',
        }),
      });

      if (!stripeResponse.ok) {
        const stripeError = await stripeResponse.json();
        return new Response(
          JSON.stringify({ error: 'Failed to create Stripe account', details: stripeError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stripeAccount = await stripeResponse.json();
      stripeAccountId = stripeAccount.id;

      // Save Stripe account ID to worker
      await fetch(`${supabaseUrl}/rest/v1/workers?id=eq.${worker_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ stripe_account_id: stripeAccountId }),
      });
    }

    // Create account link for onboarding
    const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: stripeAccountId,
        refresh_url: `${req.headers.get('origin')}/worker/onboarding?refresh=true`,
        return_url: `${req.headers.get('origin')}/worker/onboarding?success=true`,
        type: 'account_onboarding',
      }),
    });

    if (!accountLinkResponse.ok) {
      const linkError = await accountLinkResponse.json();
      return new Response(
        JSON.stringify({ error: 'Failed to create onboarding link', details: linkError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountLink = await accountLinkResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        stripe_account_id: stripeAccountId,
        onboarding_url: accountLink.url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
