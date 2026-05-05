// AI Price Estimation Edge Function
// Per 11_AI_OPERATING_MODEL.md - Pricing Agent

import { createAIProvider } from '../_shared/ai-provider.ts';

interface PriceRequest {
  category: string;
  diagnosis: string;
  location: { lat: number; lng: number };
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

interface PriceResponse {
  estimated_price: number;
  price_breakdown: { item: string; cost: number }[];
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

    const { category, diagnosis, location, urgency }: PriceRequest = await req.json();

    if (!category || !diagnosis) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: category, diagnosis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    const priceEstimate = await aiProvider.estimatePrice({
      category,
      diagnosis,
      location,
      urgency,
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
        agent_type: 'pricing',
        input: { category, diagnosis, location, urgency },
        output: priceEstimate,
      }),
    });

    return new Response(
      JSON.stringify(priceEstimate),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Price estimation error:', error);
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
