// 💎 AI Upsell — Đề xuất bán hàng thông minh

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
    checkRateLimit(user.id, clientIp, { maxRequests: 20 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { trigger_type, category, order_value, is_first_time } = body
    if (!trigger_type) return jsonResponse({ error: 'Thiếu: loai_kich_hoat' }, 400)

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const context = await rag.getUpsellContext(user.id)

    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.generateUpsell({
      user_id: user.id, trigger_type, category,
      order_value: order_value || 0, completed_orders: context.completedOrders,
      total_spent: context.totalSpent, has_membership: !!context.activeMembership,
    })

    if (!result.success) return jsonResponse({ goiY: [], loi: 'AI upsell unavailable' })

    const duLieuRa = {
      goiY: result.data.suggestion,
      loaiSanPham: result.data.product_type,
      phanTramGiam: result.data.discount_percent || 0,
      doTinCay: result.data.confidence,
      lyDo: result.data.reason,
      loaiKichHoat: trigger_type,
      hienThi: result.data.confidence >= 0.5,
      dangCoMembership: !!context.activeMembership,
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'upsell', input: body, output: duLieuRa, userId: user.id, requestId,
      metadata: { loaiKichHoat: trigger_type, danhMuc: category },
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi upsell:', error)
    return jsonResponse({ goiY: [], loi: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})