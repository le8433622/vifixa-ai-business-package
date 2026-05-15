// AI Worker Matching Edge Function
// Per 11_AI_OPERATING_MODEL.md - Matching Agent
// Tích hợp companion memory để cải thiện việc ghép thợ

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

    // Fetch companion memories to enhance matching context
    const { data: memories } = await supabase
      .from('companion_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch real verified workers from database
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, profiles(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
      .eq('is_verified', true)
      .limit(20);

    if (workersError) {
      console.error(`[${requestId}] Failed to fetch workers:`, workersError);
    }

    // Enhance skills_required with worker preferences from memory
    let enhancedSkillsRequired = [...skills_required];
    const preferredSkills = memories
      .filter(m => m.category === 'worker_preference' && m.key === 'preferred_skills')
      .map(m => m.value);
    
    if (preferredSkills.length > 0) {
      // Add preferred skills to the requirements
      enhancedSkillsRequired = [...new Set([...skills_required, ...preferredSkills])];
    }

    const ai = createAIProvider(requestId);
    const matchingResult = await ai.matchWorker({
      order_id,
      skills_required: enhancedSkillsRequired,
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

    // Lưu fact mới vào companion memory
    if (validatedResult.matched_worker_id) {
      await supabase
        .from('companion_memories')
        .upsert({
          user_id: user.id,
          key: 'last_matched_worker',
          value: validatedResult.worker_name,
          category: 'ai_learned',
          importance: 3,
          source: 'matching',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }, { onConflict: ['user_id', 'key'] });
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
