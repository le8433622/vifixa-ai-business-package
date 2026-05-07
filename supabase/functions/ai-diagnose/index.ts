// AI Diagnosis Edge Function
// Per 11_AI_OPERATING_MODEL.md - Diagnosis Agent
// Per 15_CODEX_BUSINESS_CONTEXT.md - AI Role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

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
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 15 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { category, description, media_urls, location }: DiagnosisRequest = await req.json();

    if (!category || !description) {
      return jsonResponse({ error: 'Missing required fields: category, description' }, 400);
    }

    const requestId = crypto.randomUUID();

    // Fetch knowledge base entries for this category
    const { data: knowledgeEntries } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(10);

    const diagnosis = await createAIProvider(requestId).diagnose(
      { category, description, media_urls, location },
      knowledgeEntries || [],
    );

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      agent_type: 'diagnosis',
      input: { category, description, media_urls, location },
      output: diagnosis,
    });

    return jsonResponse(diagnosis);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Diagnosis error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
