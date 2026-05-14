// 🛡️ AI Bảo hành — Kiểm tra điều kiện bảo hành và xử lý yêu cầu

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 10 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, customer_id, claim_reason } = await req.json()
    if (!order_id || !customer_id || !claim_reason) {
      return jsonResponse({ error: 'Thiếu: ma_don, ma_khach, ly_do' }, 400)
    }

    const { data: order } = await supabase.from('orders').select('*').eq('id', order_id).single()
    if (!order) return jsonResponse({ error: 'Không tìm thấy đơn' }, 404)
    if (!order.completed_at) return jsonResponse({ error: 'Đơn chưa hoàn thành' }, 400)

    const now = new Date()
    const warrantyEnd = new Date(order.completed_at)
    warrantyEnd.setDate(warrantyEnd.getDate() + 30)
    const daysRemaining = Math.ceil((warrantyEnd.getTime() - now.getTime()) / 86400000)

    if (daysRemaining < 0) {
      return jsonResponse({ duDieuKien: false, lyDo: 'Hết hạn bảo hành', hanCuoi: warrantyEnd.toISOString() })
    }

    const { count: existingClaims } = await supabase.from('warranty_claims').select('*', { count: 'exact', head: true }).eq('order_id', order_id)
    if (existingClaims && existingClaims > 0) return jsonResponse({ duDieuKien: false, lyDo: 'Đã yêu cầu bảo hành trước đó' })

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    const diagResult = await ai.diagnose({
      category: order.category || 'general',
      description: `Yêu cầu bảo hành: ${claim_reason}. Vấn đề gốc: ${order.description || 'N/A'}`,
    })

    let diemHopLe = 0.5, khuyenNghi = 'xem_xet', doTinCay = 0.5, tuDongDuyet = false
    if (diagResult.success) {
      doTinCay = diagResult.data.confidence
      const lienQuan = diagResult.data.diagnosis.toLowerCase().includes(order.category?.toLowerCase() || '')
      diemHopLe = lienQuan ? doTinCay * 0.9 : doTinCay * 0.4
      if (diemHopLe >= 0.7 && doTinCay >= 0.6 && diagResult.data.severity !== 'emergency') {
        khuyenNghi = 'chap_thuan'; tuDongDuyet = true
      } else if (diemHopLe < 0.3) {
        khuyenNghi = 'tu_choi'
      }
    }

    const duLieuRa = {
      duDieuKien: khuyenNghi === 'chap_thuan', soNgayConLai: Math.max(0, daysRemaining),
      tuDongDuyet, khuyenNghi, thongBao: tuDongDuyet
        ? 'Yêu cầu bảo hành được chấp thuận. Kỹ thuật viên sẽ liên hệ trong 48 giờ.'
        : khuyenNghi === 'tu_choi'
        ? 'Yêu cầu bảo hành không đủ điều kiện. Vui lòng liên hệ admin.'
        : 'Yêu cầu bảo hành đang được xem xét.',
      diemHopLe: Math.round(diemHopLe * 100) / 100,
      doTinCay,
    }

    if (tuDongDuyet) {
      await supabase.from('warranty_claims').insert({
        order_id, customer_id, claim_reason, status: 'approved', approved_by: 'ai-system',
        metadata: { ai_confidence: doTinCay, eligibility_score: diemHopLe, request_id: requestId },
      })
      await supabase.from('orders').update({ status: 'disputed' }).eq('id', order_id)
    } else {
      await supabase.from('warranty_claims').insert({
        order_id, customer_id, claim_reason, status: 'pending', approved_by: null,
        metadata: { ai_confidence: doTinCay, eligibility_score: diemHopLe, request_id: requestId },
      })
      await supabase.from('admin_review_queue').insert({
        entity_type: 'warranty', entity_id: order_id, ai_decision: duLieuRa, review_status: 'pending', created_by: user.id,
      })
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'bao_hanh',
      input: { maDon: order_id, maKhach: customer_id, lyDo: claim_reason },
      output: duLieuRa, userId: user.id, requestId,
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi bảo hành:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})