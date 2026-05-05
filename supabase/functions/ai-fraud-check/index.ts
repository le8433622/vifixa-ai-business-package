// AI Fraud Risk Detection Edge Function
// Per 11_AI_OPERATING_MODEL.md - Fraud Risk Agent
// Per 13_RISKS_LEGAL_COMPLIANCE.md - AI Risk mitigation

import { createAIProvider } from '../_shared/ai-provider.ts';

interface FraudCheckRequest {
  order_id?: string;
  user_id: string;
  action_type: 'booking' | 'review' | 'cancellation' | 'price_dispute';
  metadata?: Record<string, any>;
}

interface FraudCheckResponse {
  risk_score: number; // 0-100
  is_suspicious: boolean;
  risk_factors: string[];
  recommendation: 'allow' | 'review' | 'block';
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

    const { order_id, user_id, action_type, metadata }: FraudCheckRequest = await req.json();

    if (!user_id || !action_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, action_type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    // Analyze fraud risk
    const fraudCheck = await aiProvider.detectFraud({
      order_id,
      user_id,
      action_type,
      metadata,
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
        agent_type: 'fraud',
        input: { order_id, user_id, action_type, metadata },
        output: fraudCheck,
      }),
    });

    return new Response(
      JSON.stringify(fraudCheck),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Fraud check error:', error);
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
