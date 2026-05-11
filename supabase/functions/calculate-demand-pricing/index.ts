import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const DemandCategorySchema = z.enum([
  'electrical',
  'plumbing',
  'air_conditioning',
  'appliance_repair',
  'carpentry',
  'painting',
  'cleaning',
  'moving',
  'handyman',
  'landscaping',
  'HVAC',
  'security_systems',
  'water_heater',
  'general'
]);

export const DemandPricingInputSchema = z.object({
  category: DemandCategorySchema,
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  timestamp: z.string().datetime().optional(),
});

type DemandPricingInput = z.infer<typeof DemandPricingInputSchema>;

// Known service categories for cache key generation
const _KNOWN_CATEGORIES = [
  'electrical', 'plumbing', 'air_conditioning', 'appliance_repair',
  'carpentry', 'painting', 'cleaning', 'moving', 'handyman',
  'landscaping', 'HVAC', 'security_systems', 'water_heater', 'general',
];

// Rush hour time ranges (Vietnam timezone assumed)
const RUSH_HOURS = [
  { start: 7, end: 9 },   // Morning rush
  { start: 17, end: 20 }, // Evening rush
];

// Weekend days (Saturday=6, Sunday=0 in JavaScript Date)
const WEEKEND_DAYS = [0, 6];

/**
 * Calculate time-of-day factor
 * Returns factor between 0.8 and 1.3
 */
function calculateTimeFactor(timestamp: Date): number {
  const hour = timestamp.getHours();
  
  if (RUSH_HOURS.some(rush => hour >= rush.start && hour < rush.end)) {
    return 1.25; // 25% increase during rush hours
  }
  
  // Light evening traffic: 10pm-6am
  if ((hour >= 22 || hour < 6) && hour !== 0) {
    return 0.9; // 10% discount during late night/early morning
  }
  
  // Lunch hour slightly elevated
  if (hour >= 11 && hour <= 13) {
    return 1.1;
  }
  
  return 1.0; // Normal time
}

/**
 * Calculate day-of-week factor
 * Returns factor between 0.9 and 1.2
 */
function calculateDayFactor(timestamp: Date): number {
  const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (WEEKEND_DAYS.includes(dayOfWeek)) {
    return 1.15; // Weekend peak
  }
  
  // Friday evening boost starts at 4pm
  if (dayOfWeek === 5 && timestamp.getHours() >= 16) {
    return 1.1;
  }
  
  return 1.0;
}

/**
 * Calculate weather factor based on available data
 * Returns factor between 0.9 and 1.2
 * Since OpenWeatherMap API isn't directly available in Supabase Edge Functions,
 * we use heuristic based on typical patterns
 */
function calculateWeatherFactor(_location: { lat: number; lng: number }): number {
  // Try to get weather from a public API or use simple heuristic
  try {
    // This is a placeholder - production should use OpenWeatherMap or similar
    // For now, return neutral factor
    return 1.0;
  } catch (error) {
    console.warn('Weather API not available:', error);
    return 1.0; // Default to neutral
  }
}

/**
 * Calculate traffic/condition factor based on location/time
 * Returns factor between 1.0 and 1.15
 */
function calculateTrafficFactor(): number {
  // Simple heuristic: higher on weekdays during work commute hours
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // High traffic weekdays 7-9am, 4-6pm
  if (dayOfWeek >= 1 && dayOfWeek <= 4 && 
      ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 18))) {
    return 1.1;
  }
  
  return 1.0;
}

/**
 * Calculate recent order volume score for a category
 * Returns count of orders in last hour
 */
async function fetchRecentOrders(
  supabase: ReturnType<typeof createClient>,
  category: string,
  hoursAgo: number = 1
): Promise<number> {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  const { data: _data, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('category', category)
    .gte('created_at', cutoffTime.toISOString())
    .in('status', ['pending', 'assigned']);
  
  if (error) {
    console.warn(`Failed to fetch recent orders for ${category}:`, error);
    return 0;
  }
  
  // @ts-ignore - count is in error.message for exact counts
  const _counts = (supabase as any).from('orders').count('*');
  
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: false })
    .eq('category', category)
    .gte('created_at', cutoffTime.toISOString())
    .in('status', ['pending', 'assigned']);
  
  return count || 0;
}

/**
 * Fetch worker availability ratio
 * Returns { available: number, total: number }
 */
async function fetchWorkerAvailability(
  supabase: ReturnType<typeof createClient>,
  _limit?: number
): Promise<{ available: number; total: number }> {
  const { data: _availableWorkers, error: _availError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'worker')
    .eq('is_available', true);
  
  const { count: availableCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'worker')
    .eq('is_available', true);
  
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'worker');
  
  return {
    available: availableCount || 0,
    total: totalCount || 0,
  };
}

/**
 * Check if cached demand score exists and is valid
 */
async function getCachedDemandScore(
  supabase: ReturnType<typeof createClient>,
  category: string
): Promise<{ score: number; expiresAt: string } | null> {
  // Use hour-level granularity for caching
  const hourKey = new Date();
  hourKey.setMinutes(0, 0, 0); // Floor to hour
  const threshold = new Date(hourKey.getTime() - 5 * 60 * 1000); // 5 minutes ago
  
  const { data, error } = await supabase
    .from('demand_cache')
    .select('demand_score, expires_at')
    .eq('category', category)
    .gt('expires_at', threshold.toISOString())
    .order('updated_at', { ascending: true })
    .maybeSingle();
  
  if (error) {
    console.warn('Cache lookup failed:', error);
    return null;
  }
  
  return data ? { score: Number(data.demand_score), expiresAt: data.expires_at } : null;
}

/**
 * Store calculated demand score in cache
 */
async function setCachedDemandScore(
  supabase: ReturnType<typeof createClient>,
  category: string,
  score: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute TTL
  
  // Upsert cache entry (hourly bucketed by category)
  const _upsertKey = `${category}_${new Date().toUTCString().slice(0, 13)}`; // Hour granularity
  
  const { error } = await supabase.rpc('upsert_demand_cache', {
    p_category: category,
    p_demand_score: score,
    p_expires_at: expiresAt.toISOString(),
  });
  
  if (error) {
    console.warn('Cache write failed:', error);
  }
}

/**
 * Main demand scoring algorithm
 */
async function calculateDemandScore(
  supabase: ReturnType<typeof createClient>,
  input: DemandPricingInput
): Promise<{
  score: number;
  factors: {
    recent_orders: number;
    worker_availability: number;
    time_of_day_factor: number;
    day_factor: number;
    weather_factor: number;
    traffic_factor: number;
  };
}> {
  const { category, location, timestamp } = input;
  const calcTimestamp = timestamp ? new Date(timestamp) : new Date();
  
  let recentOrders = 0;
  let workerAvailabilityRatio = 0;
  let timeFactor = 1.0;
  let dayFactor = 1.0;
  let weatherFactor = 1.0;
  let trafficFactor = 1.0;
  
  // Factor 1: Recent order volume (last hour)
  recentOrders = await fetchRecentOrders(supabase, category, 1);
  
  // Normalize order volume: 0-20 orders
  // Score contribution: 0.0 to 0.25
  const orderVolumeScore = Math.min(1.0, recentOrders / 20) * 0.25;
  
  // Factor 2: Worker availability ratio
  const { available, total } = await fetchWorkerAvailability(supabase);
  // If no data, assume neutral
  workerAvailabilityRatio = total > 0 ? available / total : 0.5;
  
  // Inverse ratio matters: fewer workers = higher demand
  // Score contribution: 0.0 to 0.25
  const workerScarcityScore = (1 - workerAvailabilityRatio) * 0.25;
  
  // Factor 3: Time of day
  timeFactor = calculateTimeFactor(calcTimestamp);
  // Impact on base score: 0.0 to 0.15
  const timeScore = ((timeFactor - 0.9) / (1.3 - 0.9)) * 0.15;
  
  // Factor 4: Day of week
  dayFactor = calculateDayFactor(calcTimestamp);
  // Impact on base score: 0.0 to 0.1
  const dayScore = ((dayFactor - 1.0) / (1.2 - 1.0)) * 0.1;
  
  // Factor 5: Weather
  weatherFactor = await calculateWeatherFactor(location);
  // Impact on base score: 0.0 to 0.15
  const weatherScore = ((weatherFactor - 0.9) / (1.2 - 0.9)) * 0.15;
  
  // Factor 6: Traffic conditions
  trafficFactor = calculateTrafficFactor();
  // Impact on base score: 0.0 to 0.1
  const trafficScore = ((trafficFactor - 1.0) / (1.15 - 1.0)) * 0.1;
  
  // Weighted combination
  const combinedScore =
    orderVolumeScore * 0.40 +    // Recent orders most important
    workerScarcityScore * 0.25 +  // Worker availability second most
    timeScore * 0.15 +            // Time of day
    dayScore * 0.07 +             // Day of week
    weatherScore * 0.08 +         // Weather
    trafficScore * 0.05;          // Traffic least weighted
  
  // Clamp to 0-1 range
  const finalScore = Math.max(0.0, Math.min(1.0, combinedScore));
  
  return {
    score: finalScore,
    factors: {
      recent_orders: recentOrders,
      worker_availability: workerAvailabilityRatio,
      time_of_day_factor: timeFactor,
      day_factor: dayFactor,
      weather_factor: weatherFactor,
      traffic_factor: trafficFactor,
    },
  };
}

/**
 * Calculate price multiplier based on demand score
 * Returns multiplier and detailed breakdown
 */
function calculateMultiplier(score: number): {
  multiplier: number;
  tier: string;
} {
  if (score >= 0.8) {
    return { multiplier: 1.50, tier: 'extreme_surge' };
  } else if (score >= 0.6) {
    return { multiplier: 1.30, tier: 'high_surge' };
  } else if (score >= 0.3) {
    return { multiplier: 1.15, tier: 'moderate_surge' };
  } else {
    return { multiplier: 1.0, tier: 'normal' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input = await req.json();
    
    // Validate input using Zod
    const validationResult = DemandPricingInputSchema.safeParse(input);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cachedData = await getCachedDemandScore(supabase, validationResult.data.category);
    
    if (cachedData) {
      const multiplier = calculateMultiplier(cachedData.score);
      
      const basePrice = input.base_price ?? 0;
      
      return new Response(
        JSON.stringify({
          success: true,
          demand_score: cachedData.score,
          multiplier: multiplier.multiplier,
          surge_multiplier_tier: multiplier.tier,
          base_price: parseFloat(basePrice.toFixed(2)),
          surge_price: parseFloat((basePrice * multiplier.multiplier).toFixed(2)),
          surge_amount: parseFloat(((basePrice * multiplier.multiplier) - basePrice).toFixed(2)),
          factors: {
            recent_orders: 0,
            worker_availability: 0,
            time_of_day_factor: 0,
            day_factor: 0,
          },
          cache_hit: true,
          message: 'Using cached demand score',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate fresh demand score
    const result = await calculateDemandScore(supabase, validationResult.data);

    // Cache the result
    await setCachedDemandScore(supabase, validationResult.data.category, result.score);

    // Get base price from request or use default
    const basePrice = input.base_price ?? 0;
    const multiplierInfo = calculateMultiplier(result.score);

    return new Response(
      JSON.stringify({
        success: true,
        demand_score: parseFloat(result.score.toFixed(4)),
        multiplier: multiplierInfo.multiplier,
        surge_multiplier_tier: multiplierInfo.tier,
        base_price: parseFloat(basePrice.toFixed(2)),
        surge_price: parseFloat((basePrice * multiplierInfo.multiplier).toFixed(2)),
        surge_amount: parseFloat(((basePrice * multiplierInfo.multiplier) - basePrice).toFixed(2)),
        factors: {
          recent_orders: result.factors.recent_orders,
          worker_availability: parseFloat(result.factors.worker_availability.toFixed(4)),
          time_of_day_factor: parseFloat(result.factors.time_of_day_factor.toFixed(2)),
          day_factor: parseFloat(result.factors.day_factor.toFixed(2)),
          contributing_factors: {
            order_volume_contribution: parseFloat(result.factors.weather_factor <= 1 ? '0.25' : 'N/A'),
            worker_scarcity: parseFloat(result.factors.weather_factor <= 1 ? '0.25' : 'N/A'),
            time_contribution: parseFloat(result.factors.weather_factor <= 1 ? `0-${parseFloat((result.factors.time_of_day_factor - 0.9) / (1.3 - 0.9) * 0.15).toFixed(4)}` : 'N/A'),
            day_contribution: parseFloat(result.factors.weather_factor <= 1 ? `0-${parseFloat((result.factors.day_factor - 1.0) / (1.2 - 1.0) * 0.1).toFixed(4)}` : 'N/A'),
          },
        },
        metadata: {
          calculation_time: Date.now(),
          timestamp: validationResult.data.timestamp || new Date().toISOString(),
        },
        cache_hit: false,
        cache_ttl_seconds: 300,
        message: result.score >= 0.8 
          ? 'Extreme surge detected: Prices increased significantly due to high demand'
          : result.score >= 0.6
          ? 'High surge: Prices increased moderately due to strong demand'
          : result.score >= 0.3
          ? 'Moderate surge: Slight price increase due to elevated demand'
          : 'Normal pricing: No surge detected',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in calculate-demand-pricing:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate demand pricing',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
