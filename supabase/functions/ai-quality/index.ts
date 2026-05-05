// AI Quality Check Edge Function
// Per 11_AI_OPERATING_MODEL.md - Quality Agent

import { createAIProvider } from '../_shared/ai-provider.ts';

interface QualityRequest {
  order_id: string;
  worker_id: string;
  before_media: string[];
  after_media: string[];
  checklist?: Record<string, boolean>;
}

interface QualityResponse {
  quality_score: number; // 0-100
  passed: boolean;
  issues: string[];
  recommendations: string[];
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

    const { order_id, worker_id, before_media, after_media, checklist }: QualityRequest = await req.json();

    if (!order_id || !worker_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, worker_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    // Analyze quality
    const qualityResult = await aiProvider.checkQuality({
      order_id,
      worker_id,
      before_media,
      after_media,
      checklist,
    });

    // Log to ai_logs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        order_id,
        agent_type: 'quality',
        input: { order_id, worker_id, before_media, after_media, checklist },
        output: qualityResult,
      }),
    });

    return new Response(
      JSON.stringify(qualityResult),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Quality check error:', error);
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
