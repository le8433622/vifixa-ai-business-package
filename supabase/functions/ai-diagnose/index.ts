// 🧠 AI Chẩn đoán — Phân tích sự cố từ mô tả + ảnh chụp
// Sử dụng vision model khi có ảnh, fallback về text khi không

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

    const { category, description, media_urls, location } = await req.json()
    if (!category || !description) {
      return jsonResponse({ error: 'Thiếu trường bắt buộc: danh_muc, mo_ta' }, 400)
    }

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const context = await rag.getDiagnosisContext(category, description, user.id)
    const ai = createAICore(supabase, { requestId, userId: user.id })

    const hasImages = media_urls && Array.isArray(media_urls) && media_urls.length > 0
    let result

    if (hasImages) {
      const visionResult = await ai.analyzeImages({ imageUrls: media_urls.slice(0, 4), description, category })
      if (visionResult.success) {
        result = visionResult
      } else {
        console.warn('Vision diagnosis failed, fallback to text:', visionResult.error)
        result = await ai.diagnose({ category, description, media_urls, location }, context.knowledgeBase)
      }
    } else {
      result = await ai.diagnose({ category, description, media_urls, location }, context.knowledgeBase)
    }

    const output = result.success ? result.data : {
      diagnosis: 'Không thể chẩn đoán do lỗi hệ thống',
      severity: 'medium' as const,
      recommended_skills: [category || 'general'],
      confidence: 0,
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: hasImages ? 'chan_doan_thi_giac' : 'chan_doan',
      input: { danhMuc: category, moTa: description, urlsMedia: media_urls },
      output,
      userId: user.id, requestId,
      metadata: { vision_enabled: !!hasImages, vision_success: result?.success },
    })

    return jsonResponse(output)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi chẩn đoán:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})