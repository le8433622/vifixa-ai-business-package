// 🔮 AI Dự đoán bảo trì — Phân tích thiết bị và dự đoán lịch bảo trì

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 10 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { device_id, device_type, brand, model, purchase_date, last_maintenance, usage_frequency, issues_reported } = await req.json()
    if (!device_type) return jsonResponse({ error: 'Thiếu: loai_thiet_bi' }, 400)

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)
    const ctx = await rag.getPredictContext(device_type, brand)

    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.predictMaintenance({
      device_type, brand, model, purchase_date, last_maintenance, usage_frequency, issues_reported,
    })

    const duLieuRa = result.success ? {
      ...result.data,
      statistical_baseline: ctx,
    } : {
      next_maintenance_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      maintenance_type: 'kiem_tra_dinh_ky', urgency: 'medium',
      estimated_cost: null, recommendations: ['Schedule general maintenance'],
      device_lifespan_years: 5,
    }

    if (device_id && result.success) {
      await supabase.from('maintenance_schedules').upsert({
        user_id: user.id, device_id,
        maintenance_type: result.data.maintenance_type,
        next_due: result.data.next_maintenance_date,
        urgency: result.data.urgency,
        estimated_cost: result.data.estimated_cost,
        recommendations: result.data.recommendations,
      }, { onConflict: 'device_id,maintenance_type' })
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'du_doan_bao_tri',
      input: { loaiThietBi: device_type, thuongHieu: brand },
      output: duLieuRa, userId: user.id, requestId,
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi dự đoán bảo trì:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})