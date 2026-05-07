// AI Quality Check Edge Function
// Per 11_AI_OPERATING_MODEL.md - Quality Agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

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
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 15 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, worker_id, before_media, after_media, checklist }: QualityRequest = await req.json();

    if (!order_id || !worker_id) {
      return jsonResponse({ error: 'Missing required fields: order_id, worker_id' }, 400);
    }

    const requestId = crypto.randomUUID();
    const qualityResult = await createAIProvider(requestId).checkQuality({
      order_id, worker_id, before_media, after_media, checklist,
    });

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      agent_type: 'quality',
      input: { order_id, worker_id, before_media, after_media, checklist },
      output: qualityResult,
    });

    return jsonResponse(qualityResult);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Quality check error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
