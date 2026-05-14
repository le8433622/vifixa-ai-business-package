// ⚖️ AI Tranh chấp — Phân tích và đề xuất giải pháp cho khiếu nại

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
    checkRateLimit(user.id, clientIp, { maxRequests: 5 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, complainant_id, complaint_type, description, evidence_urls } = await req.json()
    if (!order_id || !complainant_id || !complaint_type || !description) {
      return jsonResponse({ error: 'Thiếu trường bắt buộc' }, 400)
    }

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const { order, pastDisputes } = await rag.getDisputeContext(order_id)

    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.summarizeDispute({
      order_id, complainant_id, complaint_type, description, evidence_urls,
      metadata: { past_disputes: pastDisputes.length, order_value: order?.final_price || 0 },
    })

    const ketQua = result.success ? result.data : {
      summary: 'AI dispute unavailable — routed to manual review',
      severity: 'medium', recommended_action: 'review', confidence: 0,
      explanation: 'Dịch vụ AI tạm thời không khả dụng',
    }

    const canNguoiXemXet = !result.success || ketQua.confidence < 0.6 ||
      (ketQua.recommended_action === 'refund' && ketQua.confidence < 0.8) ||
      ketQua.severity === 'high'

    const duLieuRa = {
      ...ketQua,
      can_nguoi_xem_xet: canNguoiXemXet,
      ly_do_xem_xet: canNguoiXemXet
        ? (!result.success ? 'AI không khả dụng' : ketQua.confidence < 0.6 ? 'Độ tin cậy thấp' : ketQua.severity === 'high' ? 'Mức độ nghiêm trọng cao' : 'Đề xuất hoàn tiền giá trị lớn')
        : null,
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'tranh_chap',
      input: { maDon: order_id, nguoiKhieuNai: complainant_id, loai: complaint_type, moTa: description },
      output: duLieuRa, userId: user.id, requestId,
    })

    if (canNguoiXemXet) {
      await supabase.from('admin_review_queue').insert({
        entity_type: 'dispute', entity_id: order_id,
        ai_decision: duLieuRa, review_status: 'pending', created_by: user.id,
      })
    }

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi xử lý tranh chấp:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})