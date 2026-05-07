// AI Worker Matching Edge Function
// Per 11_AI_OPERATING_MODEL.md - Matching Agent

import { createAIProvider } from '../_shared/ai-provider.ts';

interface MatchingRequest {
  order_id: string;
  skills_required: string[];
  location: { lat: number; lng: number };
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

interface MatchingResponse {
  matched_worker_id: string;
  worker_name: string;
  eta_minutes: number;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, skills_required, location, urgency }: MatchingRequest = await req.json();

    if (!order_id || !skills_required || !location) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, skills_required, location' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    // Get available workers from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const workersResponse = await fetch(
      `${supabaseUrl}/rest/v1/workers?is_verified=eq.true&select=*,profiles(*)`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const workers = await workersResponse.json();

    // Use AI to match best worker
    const matchingResult = await aiProvider.matchWorker({
      order_id,
      skills_required,
      location,
      urgency,
    });

    // Log to ai_logs
    await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        order_id,
        agent_type: 'matching',
        input: { order_id, skills_required, location, urgency },
        output: matchingResult,
      }),
    });

    return new Response(
      JSON.stringify(matchingResult),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Matching error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
