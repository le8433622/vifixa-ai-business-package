// AI Price Estimation Edge Function
// Per 11_AI_OPERATING_MODEL.md - Pricing Agent
// Tích hợp companion memory để cải thiện định giá

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

interface PriceRequest {
  category: string;
  diagnosis: string;
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

    const { category, diagnosis, location, urgency }: PriceRequest = await req.json();

    if (!category || !diagnosis) {
      return jsonResponse({ error: 'Missing required fields: category, diagnosis' }, 400);
    }

    const requestId = crypto.randomUUID();

    // Fetch companion memories to enhance pricing context
    const { data: memories } = await supabase
      .from('companion_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch real price standards for this category & location
    const { data: priceBands } = await supabase
      .from('price_standards')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(5);

    const ai = createAIProvider(requestId);

    // Inject price bands into the pricing call if available
    if (priceBands && priceBands.length > 0) {
      const priceEstimate = await ai.estimatePrice(
        { category, diagnosis, location, urgency },
        priceBands,
        // We could also pass memories as knowledge base here if the AI provider supported it
        // For now, we'll rely on the improved prompt in the AI core
      );

      await supabase.from('ai_logs').insert({
        user_id: user.id,
        request_id: requestId,
        agent_type: 'pricing',
        input: { category, diagnosis, location, urgency, price_bands_used: priceBands.length },
        output: priceEstimate,
      });

      return jsonResponse(priceEstimate);
    }

    const priceEstimate = await ai.estimatePrice({ category, diagnosis, location, urgency });

    // Lưu fact mới vào companion memory nếu có kết quả tốt
    if (priceEstimate.success && priceEstimate.data && priceEstimate.data.confidence > 0.7) {
      await supabase
        .from('companion_memories')
        .upsert({
          user_id: user.id,
          key: 'last_price_estimate',
          value: `${priceEstimate.data.estimated_price} VND`,
          category: 'ai_learned',
          importance: 3,
          source: 'estimate_price',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }, { onConflict: ['user_id', 'key'] });
    }

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      request_id: requestId,
      agent_type: 'pricing',
      input: { category, diagnosis, location, urgency },
      output: priceEstimate,
    });

    return jsonResponse(priceEstimate);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Price estimation error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
