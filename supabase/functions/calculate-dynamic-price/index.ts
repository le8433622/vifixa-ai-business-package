import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function calculateDemandScoreForCategory(
  supabaseServiceKey: string,
  category: string,
  basePrice?: number
) {
  const serviceUrl = `${SUPABASE_URL}/functions/v1/calculate-demand-pricing`;
  
  const response = await fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      category: category,
      location: { lat: 0, lng: 0 }, // Default for background calculation
      base_price: basePrice,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Demand pricing API error: ${response.status}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Get current demand metrics for the location and category
    let demandInfo = null;
    if (location_id && service_category) {
      try {
        const demandResult = await calculateDemandScoreForCategory(
          SUPABASE_SERVICE_ROLE_KEY,
          service_category,
          base_price
        );
        
        demandInfo = {
          ...demandResult,
          cache_hit: demandResult.cache_hit || false,
          message: demandResult.message || null,
        };
      } catch (error) {
        console.warn('Failed to fetch demand score:', error);
      }
      
      // Fallback to traditional demand_metrics if available
      const { data: demandData } = await supabaseClient
        .from('demand_metrics')
        .select('demand_score, orders_count, available_workers_count, pending_orders_count')
        .eq('location_id', location_id)
        .order('time_window', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      demandInfo = demandInfo || demandData;
    } else if (service_category) {
      // Just get demand by category without location
      try {
        const demandResult = await calculateDemandScoreForCategory(
          SUPABASE_SERVICE_ROLE_KEY,
          service_category,
          base_price
        );
        
        demandInfo = demandResult;
      } catch (error) {
        console.warn('Failed to fetch category demand score:', error);
      }
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
        demand_surging: demandInfo ? {
          score: demandInfo.demand_score || demandInfo.score,
          multiplier: demandInfo.multiplier || demandInfo.surge_multiplier_tier,
          tier: (demandInfo as any).surge_multiplier_tier || 'normal',
          cache_hit: (demandInfo as any).cache_hit || false,
          recent_orders: (demandInfo as any).factors?.recent_orders || null,
          worker_availability: (demandInfo as any).factors?.worker_availability || null,
          details: demandInfo.message || null,
        } : null,
        demand: demandInfo && !(demandInfo as any).multiplier ? {
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
        message: is_emergency 
          ? 'Emergency surcharge applied (50%)' 
          : `Price calculated${demandInfo && !!(demandInfo as any).multiplier ? ' with real-time demand analysis' : ''}`,
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
        error: error instanceof Error ? error.message : 'Failed to calculate dynamic price',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
