// 🚨 AI Phát hiện gian lận — Rule-based + AI cho phát hiện bất thường

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
    checkRateLimit(user.id, clientIp, { maxRequests: 10 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { check_type, order_id, user_id } = body
    const requestId = crypto.randomUUID()

    // Rule-based checks
    const alerts: any[] = []
    const headers = { Authorization: `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' }

    if (check_type === 'price_change' && order_id) {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=estimated_price,final_price`, { headers })
      if (res.ok) {
        const [data] = await res.json()
        if (data?.estimated_price && data?.final_price) {
          const change = Math.abs((data.final_price - data.estimated_price) / data.estimated_price * 100)
          if (change > 50) alerts.push({ alert_type: 'price_manipulation', severity: 'high', description: `Giá thay đổi ${change.toFixed(1)}%` })
        }
      }
    }

    if (check_type === 'dispute_rate' && user_id) {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?worker_id=eq.${user_id}&select=status`, { headers })
      if (res.ok) {
        const orders = await res.json()
        const disputed = orders.filter((o: any) => o.status === 'disputed').length
        if (orders.length > 0 && disputed / orders.length > 0.2)
          alerts.push({ alert_type: 'high_dispute_rate', severity: 'critical', description: `Tỷ lệ tranh chấp ${(disputed / orders.length * 100).toFixed(1)}%` })
      }
    }

    // AI analysis for high-risk cases
    let aiResult = null
    if (alerts.length > 0 || check_type === 'suspicious_activity') {
      const rag = createAIRAG(supabase)
      const fraudContext = await rag.getFraudContext(user_id || user.id)
      const ai = createAICore(supabase, { requestId, userId: user.id })
      const result = await ai.detectFraud({
        transaction_id: order_id || requestId, amount: 0, user_id: user_id || user.id,
        metadata: { check_type, alerts_count: alerts.length, recent_orders: fraudContext.recentOrders.length },
      })
      aiResult = result.success ? result.data : null
    }

    const enrichedAlerts = [
      ...alerts,
      ...(aiResult?.flags || []).map((f: any) => ({ alert_type: f.type, severity: f.severity, description: f.type, ai_generated: true })),
    ]

    const riskWeights: Record<string, number> = { critical: 30, high: 20, medium: 10, low: 5 }
    const baseRisk = alerts.reduce((s: number, a: any) => s + (riskWeights[a.severity] || 5), 0)

    const duLieuRa = {
      success: true, alerts: enrichedAlerts,
      risk_score: Math.min(baseRisk + (aiResult?.risk_score || 0) * 100, 100),
      alerts_count: enrichedAlerts.length,
      ai_analysis: aiResult,
    }

    const audit = createAIAudit(supabase)
    await audit.log({ agentType: 'gian_lan', input: body, output: duLieuRa, userId: user.id, requestId })
    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi phát hiện gian lận:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})