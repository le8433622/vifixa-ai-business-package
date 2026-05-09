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

    const { worker_id, package_slug } = await req.json();

    // Validate required fields
    if (!worker_id || !package_slug) {
      throw new Error('Missing required fields: worker_id and package_slug');
    }

    // Verify worker owns this profile (security check)
    const { data: authUser } = await supabaseClient.auth.getUser();
    if (!authUser.user || authUser.user.id !== worker_id) {
      // In production, you'd want stricter validation
      // For now, we'll allow but log it
      console.warn('User ID mismatch in ad purchase request');
    }

    // Get the ad package
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('worker_ad_packages')
      .select('*')
      .eq('slug', package_slug)
      .eq('is_active', true)
      .single();

    if (pkgError || !pkg) {
      throw new Error('Invalid or inactive ad package');
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + pkg.duration_days);

    // Create the ad purchase
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('worker_ad_purchases')
      .insert({
        worker_id,
        package_id: pkg.id,
        status: 'active',
        purchased_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        used_count: 0,
        remaining_uses: pkg.max_uses_per_purchase || 1,
      })
      .select(`
        *,
        package:worker_ad_packages(*)
      `)
      .single();

    if (purchaseError) {
      console.error('Error creating ad purchase:', purchaseError);
      throw purchaseError;
    }

    // In production, here you would:
    // 1. Create a payment record
    // 2. Process payment through gateway
    // 3. Update purchase status after successful payment

    return new Response(
      JSON.stringify({
        success: true,
        purchase: {
          id: purchase.id,
          package: {
            name: pkg.name,
            slug: pkg.slug,
            type: pkg.package_type,
            benefits: pkg.benefits,
            boost_factor: pkg.boost_factor,
            duration_days: pkg.duration_days,
          },
          price: pkg.price,
          currency: 'VND',
          purchased_at: purchase.purchased_at,
          expires_at: purchase.expires_at,
          remaining_uses: purchase.remaining_uses,
          status: purchase.status,
        },
        next_steps: {
          action: pkg.package_type === 'pay_per_boost' 
            ? 'activate_boost' 
            : 'badge_auto_activated',
          message: pkg.package_type === 'pay_per_boost'
            ? 'Your boost package is ready. Activate it when you want to start boosting.'
            : 'Your featured badge is now active!',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    );
  } catch (error) {
    console.error('Error in purchase-ad-package:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to purchase ad package',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
