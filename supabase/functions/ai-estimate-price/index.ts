// 💰 AI Định giá — Định giá thông minh dựa trên AI + dữ liệu lịch sử + nhu cầu thị trường

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 15 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { category, diagnosis, location, urgency } = await req.json()
    if (!category || !diagnosis) {
      return jsonResponse({ error: 'Thiếu trường: danh_muc, chan_doan' }, 400)
    }

    // Tính hệ số thời gian
    const now = new Date()
    const multipliers: Record<string, number> = {}
    if (now.getHours() >= 20 || now.getHours() < 6) multipliers['Ngoài giờ'] = 1.3
    if (now.getDay() === 0 || now.getDay() === 6) multipliers['Cuối tuần'] = 1.1
    if (urgency === 'emergency') multipliers['Khẩn cấp'] = 1.5
    else if (urgency === 'high') multipliers['Ưu tiên'] = 1.2

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const context = await rag.getPricingContext(category, location)

    // Lấy giá hoàn thành lịch sử
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('final_price, estimated_price')
      .eq('category', category)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    const prices = (completedOrders || []).map((o: any) => o.final_price || o.estimated_price).filter(Boolean) as number[]
    const avgHistorical = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null

    // Gọi AI định giá
    const ai = createAICore(supabase, { requestId, userId: user.id })
    const priceResult = await ai.estimatePrice(
      { category, diagnosis, location, urgency, multipliers },
      context.priceBands, multipliers,
    )

    const aiPrice = priceResult.success ? priceResult.data.estimated_price : 300000
    const finalPrice = avgHistorical
      ? Math.round(aiPrice * 0.6 + avgHistorical * 0.4)
      : aiPrice

    // Lấy hệ số tăng giá theo nhu cầu (surge pricing)
    let surgeMultiplier = 1.0
    let surgeTier = 'bình_thường'
    try {
      const surgeRes = await fetch(`${supabaseUrl}/functions/v1/calculate-demand-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ category, location, base_price: finalPrice }),
      })
      if (surgeRes.ok) {
        const data = await surgeRes.json()
        surgeMultiplier = data.multiplier || 1.0
        surgeTier = data.surge_multiplier_tier || 'bình_thường'
      }
    } catch { /* bỏ qua lỗi surge */ }

    const output = {
      estimated_price: Math.round(finalPrice * surgeMultiplier),
      base_price: finalPrice,
      surge_multiplier: surgeMultiplier,
      surge_tier: surgeTier,
      price_breakdown: priceResult.success ? priceResult.data.price_breakdown : [{ item: 'Dịch vụ cơ bản', cost: finalPrice }],
      confidence: priceResult.success ? Math.min(priceResult.data.confidence * (prices.length > 0 ? 1.2 : 1), 1) : 0.3,
      historical_avg: avgHistorical,
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'dinh_gia',
      input: { danhMuc: category, chanDoan: diagnosis, viTri: location, mucDo: urgency },
      output,
      userId: user.id, requestId,
    })

    return jsonResponse(output)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi định giá:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})