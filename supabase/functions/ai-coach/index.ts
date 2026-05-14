// 🎓 AI Huấn luyện thợ — Phân tích hiệu suất, đề xuất kỹ năng, tối ưu thu nhập

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

    const { worker_id, job_type, issue_description, performance_history } = await req.json()
    if (!worker_id) return jsonResponse({ error: 'Thiếu: ma_tho' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.coachWorker({ worker_id, job_type, issue_description, performance_history })

    const duLieuRa = result.success ? result.data : {
      suggestions: ['Không thể tạo gợi ý do lỗi hệ thống'],
      safety_tips: ['Luôn tuân thủ quy tắc an toàn'],
      skill_recommendations: [],
      earnings_tips: ['Liên hệ admin để được hỗ trợ'],
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'huan_luyen',
      input: { maTho: worker_id, loaiCongViec: job_type },
      output: duLieuRa, userId: user.id, requestId,
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi huấn luyện:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})