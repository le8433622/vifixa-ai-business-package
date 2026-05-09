// AI Worker Matching Edge Function
// Per 11_AI_OPERATING_MODEL.md - Matching Agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

interface MatchingRequest {
  order_id: string;
  skills_required: string[];
  location: { lat: number; lng: number };
  urgency: 'low' | 'medium' | 'high' | 'emergency';
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

    const { order_id, skills_required, location, urgency }: MatchingRequest = await req.json();

    if (!order_id || !skills_required || !location) {
      return jsonResponse({ error: 'Missing required fields: order_id, skills_required, location' }, 400);
    }

    const requestId = crypto.randomUUID();

    // Fetch real verified workers from database
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, profiles(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
      .eq('is_verified', true)
      .limit(20);

    if (workersError) {
      console.error(`[${requestId}] Failed to fetch workers:`, workersError);
    }

    const ai = createAIProvider(requestId);
    const matchingResult = await ai.matchWorker({
      order_id,
      skills_required,
      location,
      urgency,
    }, workers || []);

    // Validate: if AI selected a worker not in the DB, fall back to first available
    let validatedResult = matchingResult;
    if (workers && workers.length > 0) {
      const matchedInDb = workers.find((w: any) => String(w.id) === String(matchingResult.matched_worker_id));
      if (!matchedInDb) {
        const best = workers[0];
        validatedResult = {
          matched_worker_id: String(best.id),
          worker_name: (best.profiles?.[0] as any)?.full_name || `Worker ${best.id}`,
          eta_minutes: 30,
          confidence: 0.5,
        };
        console.warn(`[${requestId}] AI matched worker ${matchingResult.matched_worker_id} not in DB, falling back to ${best.id}`);
      } else {
        validatedResult = {
          ...matchingResult,
          worker_name: (matchedInDb.profiles?.[0] as any)?.full_name || matchingResult.worker_name,
        };
      }
    }

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      request_id: requestId,
      agent_type: 'matching',
      input: { order_id, skills_required, location, urgency, candidates_count: workers?.length || 0 },
      output: validatedResult,
    });

    return jsonResponse(validatedResult);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Matching error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
