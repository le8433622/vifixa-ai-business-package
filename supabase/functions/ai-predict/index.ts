// AI Predict Maintenance Edge Function
// Per user request: AI personalization for better experience

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const {
        device_id,
        device_type,
        brand,
        model,
        purchase_date,
        last_maintenance,
        usage_frequency,
        issues_reported,
      }: PredictRequest = await req.json();

      if (!device_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: device_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call AI predictMaintenance
      const ai = createAIProvider();
      const prediction = await ai.predictMaintenance({
        device_type,
        brand,
        model,
        purchase_date,
        last_maintenance,
        usage_frequency,
        issues_reported,
      });

      // If device_id provided, update device with prediction
      if (device_id) {
        await supabase
          .from('maintenance_schedules')
          .upsert({
            device_id,
            maintenance_type: prediction.maintenance_type,
            next_due: prediction.next_maintenance_date,
            urgency: prediction.urgency,
            estimated_cost: prediction.estimated_cost,
            recommendations: prediction.recommendations,
          }, { onConflict: 'device_id,maintenance_type' });
      }

      return new Response(
        JSON.stringify(prediction),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Predict maintenance error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
