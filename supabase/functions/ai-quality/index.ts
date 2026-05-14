// ✅ AI Chất lượng — Kiểm tra chất lượng dịch vụ (text + hình ảnh)

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
    checkRateLimit(user.id, clientIp, { maxRequests: 15 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, worker_id, before_media, after_media, checklist } = await req.json()
    if (!order_id || !worker_id) {
      return jsonResponse({ error: 'Thiếu trường: ma_don, ma_tho' }, 400)
    }

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    const coAnh = before_media?.length > 0 || after_media?.length > 0
    let ketQua

    if (coAnh) {
      const visionResult = await ai.analyzeQualityImages({ beforeUrls: before_media || [], afterUrls: after_media || [], checklist })
      if (visionResult.success) {
        ketQua = {
          quality_score: Math.round((visionResult.data.workmanship_score + visionResult.data.cleanliness_score + visionResult.data.completeness_score) / 3),
          passed: visionResult.data.overall_passed,
          issues: visionResult.data.issues_found,
          recommendations: visionResult.data.recommendations,
          vision_analysis: { tayNghe: visionResult.data.workmanship_score, veSinh: visionResult.data.cleanliness_score, hoanThanh: visionResult.data.completeness_score },
        }
      } else {
        console.warn('Vision QC failed, fallback:', visionResult.error)
        const textResult = await ai.checkQuality({ order_id, worker_id, before_media, after_media, checklist })
        ketQua = textResult.success ? textResult.data : null
      }
    } else {
      const textResult = await ai.checkQuality({ order_id, worker_id, before_media, after_media, checklist })
      ketQua = textResult.success ? textResult.data : null
    }

    const duLieuRa = ketQua || {
      quality_score: 50, passed: true, issues: ['AI QC unavailable — bypassed'], recommendations: ['Manual review recommended'],
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: coAnh ? 'chat_luong_thi_giac' : 'chat_luong',
      input: { maDon: order_id, maTho: worker_id, anhTruoc: before_media, anhSau: after_media },
      output: duLieuRa, userId: user.id, requestId,
    })

    if (!ketQua) {
      await supabase.from('admin_review_queue').insert({
        entity_type: 'quality_check', entity_id: order_id, ai_decision: duLieuRa,
        review_status: 'pending', created_by: user.id,
      })
    }

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi kiểm tra chất lượng:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})