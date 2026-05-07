// AI Worker Coach Edge Function
// Per 11_AI_OPERATING_MODEL.md - Worker Coach Agent

import { createAIProvider } from '../_shared/ai-provider.ts';

interface CoachRequest {
  worker_id: string;
  job_type?: string;
  issue_description?: string;
  performance_history?: Record<string, any>;
}

interface CoachResponse {
  suggestions: string[];
  safety_tips: string[];
  skill_recommendations: string[];
  earnings_tips: string[];
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

    const { worker_id, job_type, issue_description, performance_history }: CoachRequest = await req.json();

    if (!worker_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: worker_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = createAIProvider();

    // Generate coaching advice
    const coachResult = await aiProvider.coachWorker({
      worker_id,
      job_type,
      issue_description,
      performance_history,
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
        agent_type: 'coach',
        input: { worker_id, job_type, issue_description, performance_history },
        output: coachResult,
      }),
    });

    return new Response(
      JSON.stringify(coachResult),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Coach error:', error);
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
