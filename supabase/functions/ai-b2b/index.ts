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

    const { action, enterprise_id, data } = await req.json()
    if (!action) return jsonResponse({ error: 'Missing action' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    let result
    switch (action) {
      case 'fleet_health': {
        const sites = data?.sites || []
        result = await ai.orchestrateInternal('b2b', async () => ({
          systemPrompt: `Bạn là chuyên gia quản lý bảo trì tòa nhà. Phân tích tình trạng thiết bị và đề xuất lịch bảo trì.`,
          userPrompt: `Tòa nhà/chuỗi: ${enterprise_id || 'N/A'}\nSố địa điểm: ${sites.length}\nDữ liệu: ${JSON.stringify(sites.slice(0, 5))}\n\nTrả về JSON (overall_health, total_devices, devices_needing_maintenance, estimated_monthly_cost, recommendations, sla_compliance_pct)`,
        }))
        break
      }
      case 'predict_renewal': {
        result = await ai.orchestrateInternal('b2b', async () => ({
          systemPrompt: `Bạn là chuyên gia dự đoán hợp đồng B2B. Phân tích hành vi sử dụng để dự đoán khả năng gia hạn.`,
          userPrompt: `Enterprise: ${enterprise_id}\nCurrent usage: ${JSON.stringify(data)}\n\nTrả về JSON (renewal_probability, risk_factors, recommended_discount, suggested_actions: [])`,
        }))
        break
      }
      case 'sla_monitoring': {
        result = await ai.orchestrateInternal('b2b', async () => ({
          systemPrompt: `Bạn là chuyên gia giám sát SLA. Đánh giá hiệu suất dịch vụ so với cam kết.`,
          userPrompt: `SLA Data: ${JSON.stringify(data)}\n\nTrả về JSON (sla_score, met_sla, violations, avg_response_time, recommendations)`,
        }))
        break
      }
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }

    const output = result.success ? result.data : { error: 'AI B2B service unavailable' }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'b2b',
      input: { action, enterprise_id, data_keys: Object.keys(data || {}) },
      output,
      userId: user.id,
      requestId,
    })

    return jsonResponse(output)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('B2B error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})