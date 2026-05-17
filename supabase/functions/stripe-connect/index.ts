import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const ConnectSchema = z.object({
  worker_id: z.string().uuid(),
  email: z.string().email().optional(),
  country: z.string().length(2).default('VN'),
});

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const body = await req.json();
    const parsed = ConnectSchema.parse(body);

    if (user.id !== parsed.worker_id) {
      return jsonResponse({ error: 'worker_id must match authenticated user' }, 403);
    }

    const workerResponse = await fetch(
      `${supabaseUrl}/rest/v1/workers?id=eq.${parsed.worker_id}&select=stripe_account_id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const worker = await workerResponse.json();
    if (!workerResponse.ok || !worker[0]) {
      return jsonResponse({ error: 'Worker not found' }, 404);
    }

    let stripeAccountId = worker[0].stripe_account_id;

    if (!stripeAccountId) {
      if (!parsed.email) {
        return jsonResponse({ error: 'Email is required to create a new Stripe account' }, 400);
      }

      const stripeResponse = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          country: parsed.country,
          email: parsed.email,
          'capabilities[transfers][requested]': 'true',
          'capabilities[card_payments][requested]': 'true',
        }),
      });

      if (!stripeResponse.ok) {
        const stripeError = await stripeResponse.json();
        return jsonResponse({ error: 'Failed to create Stripe account', details: stripeError }, 500);
      }

      const stripeAccount = await stripeResponse.json();
      stripeAccountId = stripeAccount.id;

      await fetch(`${supabaseUrl}/rest/v1/workers?id=eq.${parsed.worker_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ stripe_account_id: stripeAccountId }),
      });
    }

    const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: stripeAccountId,
        refresh_url: `${req.headers.get('origin') || 'https://vifixa.com'}/worker/earnings?refresh=true`,
        return_url: `${req.headers.get('origin') || 'https://vifixa.com'}/worker/earnings?success=true`,
        type: 'account_onboarding',
      }),
    });

    if (!accountLinkResponse.ok) {
      const linkError = await accountLinkResponse.json();
      return jsonResponse({ error: 'Failed to create onboarding link', details: linkError }, 500);
    }

    const accountLink = await accountLinkResponse.json();

    return jsonResponse({
      success: true,
      stripe_account_id: stripeAccountId,
      onboarding_url: accountLink.url,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: 'Validation failed', details: error.errors }, 400);
    }
    if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
      return jsonResponse({ error: error.message }, 401);
    }
    console.error('Stripe Connect error:', error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
