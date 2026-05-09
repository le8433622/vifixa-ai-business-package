// AI Price Estimation Edge Function
// Per 11_AI_OPERATING_MODEL.md - Pricing Agent

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

    // --- SMART PRICING ENGINE: Calculate Multipliers ---
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const multipliers: Record<string, number> = {};

    // 1. Time-based (Night shift: 20:00 - 06:00)
    if (hour >= 20 || hour < 6) {
      multipliers['Phụ phí ngoài giờ (Ca đêm)'] = 1.3;
    }

    // 2. Day-based (Weekend)
    if (day === 0 || day === 6) {
      multipliers['Phụ phí cuối tuần'] = 1.1;
    }

    // 3. Urgency-based
    if (urgency === 'emergency') {
      multipliers['Phí xử lý khẩn cấp (Emergency)'] = 1.5;
    } else if (urgency === 'high') {
      multipliers['Phí ưu tiên xử lý sớm (High)'] = 1.2;
    }

    const requestId = crypto.randomUUID();

    // Fetch real price standards for this category & location
    const { data: priceBands } = await supabase
      .from('price_standards')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(5);

    const ai = createAIProvider(requestId);

    const priceInput = { category, diagnosis, location, urgency, multipliers };

    const priceEstimate = await ai.estimatePrice(
      priceInput,
      priceBands || []
    );

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      request_id: requestId,
      agent_type: 'pricing',
      input: priceInput,
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
