// Premium Badge Purchase Edge Function
// Revenue Booster #3: Creates Stripe Checkout Session for badge purchase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { badge_slug, success_url, cancel_url } = await req.json();
    if (!badge_slug) {
      return new Response(JSON.stringify({ error: 'Missing badge_slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validSlugs = ['premium-silver', 'premium-gold', 'premium-platinum'];
    if (!validSlugs.includes(badge_slug)) {
      return new Response(JSON.stringify({ error: 'Invalid badge slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: pkg, error: pkgError } = await adminClient
      .from('worker_ad_packages')
      .select('*')
      .eq('slug', badge_slug)
      .eq('is_active', true)
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: 'Badge package not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Payment not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-03-31' });
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://web-eta-ochre-99.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: success_url || `${baseUrl}/worker/badges?purchase=success`,
      cancel_url: cancel_url || `${baseUrl}/worker/badges?purchase=canceled`,
      line_items: [{
        price_data: {
          currency: 'vnd',
          product_data: {
            name: pkg.name,
            description: `30 ngày ${pkg.benefits?.badge_label || 'premium'} badge - Huy hiệu thợ Vifixa`,
          },
          unit_amount: Math.round(pkg.price),
        },
        quantity: 1,
      }],
      metadata: {
        type: 'premium_badge',
        worker_id: user.id,
        package_id: pkg.id,
        package_slug: pkg.slug,
        duration_days: String(pkg.duration_days || 30),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      url: session.url,
      session_id: session.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in purchase-premium-badge:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
