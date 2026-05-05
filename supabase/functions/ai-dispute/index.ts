// AI Dispute Resolution Edge Function
// Per 11_AI_OPERATING_MODEL.md - Dispute Agent

import { createAIProvider } from '../_shared/ai-provider.ts';

interface DisputeRequest {
  order_id: string;
  complainant_id: string;
  complaint_type: 'quality' | 'pricing' | 'timeliness' | 'damage';
  description: string;
  evidence_urls?: string[];
}

interface DisputeResponse {
  summary: string;
  severity: 'low' | 'medium' | 'high';
  recommended_action: 'refund' | 'rework' | 'partial_refund' | 'dismiss';
  confidence: number;
  explanation: string;
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

    const { order_id, complainant_id, complaint_type, description, evidence_urls }: DisputeRequest = await req.json();

    if (!order_id || !complainant_id || !complaint_type || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    // Analyze dispute
    const disputeResult = await aiProvider.summarizeDispute({
      order_id,
      complainant_id,
      complaint_type,
      description,
      evidence_urls,
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
        agent_type: 'dispute',
        input: { order_id, complainant_id, complaint_type, description, evidence_urls },
        output: disputeResult,
      }),
    });

    return new Response(
      JSON.stringify(disputeResult),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Dispute error:', error);
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
