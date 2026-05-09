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

    const { base_price, location_id, service_category, worker_id, is_emergency } = await req.json();

    // Validate required fields
    if (!base_price || !worker_id) {
      throw new Error('Missing required fields: base_price and worker_id');
    }

    // Call the database function to calculate dynamic price
    const { data, error } = await supabaseClient.rpc('calculate_dynamic_price', {
      p_base_price: base_price,
      p_location_id: location_id || null,
      p_service_category: service_category || null,
      p_worker_id: worker_id,
      p_is_emergency: is_emergency || false,
    });

    if (error) {
      console.error('Error calculating dynamic price:', error);
      throw error;
    }

    const result = data[0];

    // Get current demand metrics for the location
    let demandInfo = null;
    if (location_id) {
      const { data: demandData } = await supabaseClient
        .from('demand_metrics')
        .select('demand_score, orders_count, available_workers_count, pending_orders_count')
        .eq('location_id', location_id)
        .order('time_window', { ascending: false })
        .limit(1)
        .single();
      
      demandInfo = demandData;
    }

    // Get worker info
    const { data: workerData } = await supabaseClient
      .from('profiles')
      .select('skill_level, is_featured, current_boost_factor')
      .eq('id', worker_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        pricing: {
          base_price: parseFloat(base_price),
          final_price: parseFloat(result.final_price),
          multiplier: parseFloat(result.multiplier),
          surge_charge: parseFloat((result.final_price - base_price).toFixed(2)),
          applied_rules: result.applied_rules,
          breakdown: result.breakdown,
        },
        demand: demandInfo ? {
          score: demandInfo.demand_score,
          orders_count: demandInfo.orders_count,
          available_workers: demandInfo.available_workers_count,
          pending_orders: demandInfo.pending_orders_count,
        } : null,
        worker: workerData ? {
          skill_level: workerData.skill_level,
          is_featured: workerData.is_featured,
          boost_factor: workerData.current_boost_factor,
        } : null,
        message: is_emergency ? 'Emergency surcharge applied (50%)' : 'Price calculated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in calculate-dynamic-price:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to calculate dynamic price',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
