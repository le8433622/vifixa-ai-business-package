// AI Diagnosis Edge Function
// Per 11_AI_OPERATING_MODEL.md - Diagnosis Agent
// Per 15_CODEX_BUSINESS_CONTEXT.md - AI Role

import { createAIProvider } from '../_shared/ai-provider.ts';

interface DiagnosisRequest {
  category: string;
  description: string;
  media_urls?: string[];
  location?: { lat: number; lng: number };
}

interface DiagnosisResponse {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'emergency';
  recommended_skills: string[];
  estimated_price_range?: { min: number; max: number };
  confidence: number;
}

Deno.serve(async (req) => {
  // CORS headers
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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { category, description, media_urls, location }: DiagnosisRequest = await req.json();

    if (!category || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: category, description' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize AI provider
    const aiProvider = createAIProvider();

    // Call AI Diagnosis
    const diagnosis = await aiProvider.diagnose({
      category,
      description,
      media_urls,
      location,
    });

    // Log to ai_logs table
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
        agent_type: 'diagnosis',
        input: { category, description, media_urls, location },
        output: diagnosis,
      }),
    });

    return new Response(
      JSON.stringify(diagnosis),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Diagnosis error:', error);
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
