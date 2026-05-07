// AI Predict Maintenance Edge Function
// Per user request: AI personalization for better experience

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface PredictRequest {
  device_id?: string;
  device_type: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  last_maintenance?: string;
  usage_frequency?: 'low' | 'medium' | 'high';
  issues_reported?: string[];
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 10 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const {
      device_id, device_type, brand, model,
      purchase_date, last_maintenance, usage_frequency, issues_reported,
    }: PredictRequest = await req.json();

    if (!device_type) {
      return jsonResponse({ error: 'Missing required field: device_type' }, 400);
    }

    const requestId = crypto.randomUUID();
    const prediction = await createAIProvider(requestId).predictMaintenance({
      device_type, brand, model, purchase_date, last_maintenance, usage_frequency, issues_reported,
    });

    if (device_id) {
      await supabase
        .from('maintenance_schedules')
        .upsert({
          user_id: user.id,
          device_id,
          maintenance_type: prediction.maintenance_type,
          next_due: prediction.next_maintenance_date,
          urgency: prediction.urgency,
          estimated_cost: prediction.estimated_cost,
          recommendations: prediction.recommendations,
        }, { onConflict: 'device_id,maintenance_type' });
    }

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      agent_type: 'predict',
      input: { device_type, brand, model, purchase_date, last_maintenance, usage_frequency, issues_reported },
      output: prediction,
    });

    return jsonResponse(prediction);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Predict maintenance error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
