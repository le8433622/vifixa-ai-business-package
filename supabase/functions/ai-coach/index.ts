// AI Worker Coach Edge Function
// Per 11_AI_OPERATING_MODEL.md - Worker Coach Agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

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
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 15 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { worker_id, job_type, issue_description, performance_history }: CoachRequest = await req.json();

    if (!worker_id) {
      return jsonResponse({ error: 'Missing required field: worker_id' }, 400);
    }

    const requestId = crypto.randomUUID();
    const coachResult = await createAIProvider(requestId).coachWorker({
      worker_id, job_type, issue_description, performance_history,
    });

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      agent_type: 'coach',
      input: { worker_id, job_type, issue_description, performance_history },
      output: coachResult,
    });

    return jsonResponse(coachResult);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Coach error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
