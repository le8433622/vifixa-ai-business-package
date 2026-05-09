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

    const { worker_id, ad_purchase_id, duration_hours = 24 } = await req.json();

    // Validate required fields
    if (!worker_id || !ad_purchase_id) {
      throw new Error('Missing required fields: worker_id and ad_purchase_id');
    }

    // Get the ad purchase and verify it belongs to this worker
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('worker_ad_purchases')
      .select(`
        *,
        package:worker_ad_packages(*)
      `)
      .eq('id', ad_purchase_id)
      .eq('worker_id', worker_id)
      .single();

    if (purchaseError || !purchase) {
      throw new Error('Invalid ad purchase or not owned by this worker');
    }

    // Check if purchase is active and has remaining uses
    if (purchase.status !== 'active') {
      throw new Error('This ad purchase is not active');
    }

    if (purchase.remaining_uses <= 0) {
      throw new Error('No remaining uses for this ad package');
    }

    // Check if there's already an active boost session
    const { data: existingSession } = await supabaseClient
      .from('worker_boost_sessions')
      .select('*')
      .eq('worker_id', worker_id)
      .eq('is_active', true)
      .single();

    if (existingSession) {
      throw new Error('You already have an active boost session');
    }

    // Calculate session end time
    const now = new Date();
    const endsAt = new Date();
    endsAt.setHours(now.getHours() + duration_hours);

    // Ensure we don't exceed the purchase expiration
    const purchaseExpiresAt = new Date(purchase.expires_at);
    if (endsAt > purchaseExpiresAt) {
      endsAt.setTime(purchaseExpiresAt.getTime());
    }

    // Get boost factor from package
    const boostFactor = purchase.package?.boost_factor || 1.5;
    const priorityBonus = purchase.package?.priority_score_bonus || 10;

    // Create the boost session
    const { data: session, error: sessionError } = await supabaseClient
      .from('worker_boost_sessions')
      .insert({
        worker_id,
        ad_purchase_id,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
        current_boost_factor: boostFactor,
        current_priority_bonus: priorityBonus,
        profile_views: 0,
        job_suggestions_received: 0,
        jobs_won: 0,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating boost session:', sessionError);
      throw sessionError;
    }

    // Decrement remaining uses
    const { error: updateError } = await supabaseClient
      .from('worker_ad_purchases')
      .update({
        used_count: purchase.used_count + 1,
        remaining_uses: purchase.remaining_uses - 1,
      })
      .eq('id', ad_purchase_id);

    if (updateError) {
      console.error('Error updating ad purchase:', updateError);
      // Don't throw here as the session was created successfully
    }

    // Update worker profile with boost status
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        current_boost_factor: boostFactor,
        is_featured: true,
        featured_until: endsAt.toISOString(),
      })
      .eq('id', worker_id);

    if (profileError) {
      console.error('Error updating worker profile:', profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.id,
          started_at: session.started_at,
          ends_at: session.ends_at,
          duration_hours: Math.round((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
          boost_factor: session.current_boost_factor,
          priority_bonus: session.current_priority_bonus,
        },
        message: `Boost activated successfully! Your profile will be boosted ${boostFactor}x for the next ${duration_hours} hours.`,
        tips: [
          'Stay online to maximize visibility',
          'Respond quickly to job suggestions',
          'Complete your profile for better results',
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    );
  } catch (error) {
    console.error('Error in activate-boost:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to activate boost',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
