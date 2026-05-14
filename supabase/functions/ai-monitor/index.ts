import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

const COST_THRESHOLD_USD = 5.0
const ACCURACY_THRESHOLD_PCT = 70
const LATENCY_BUDGET_MS: Record<string, number> = {
  diagnosis: 5000, pricing: 5000, matching: 3000, quality: 5000,
  dispute: 5000, coach: 3000, fraud: 5000, predict: 5000,
  care_agent: 5000, chat: 3000, upsell: 3000, b2b: 5000,
  materials: 3000, warranty: 5000,
}
const DAILY_COST_BUDGET_USD = 10.0

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const alerts: any[] = []

    const { data: costData } = await supabase.from('ai_cost_log').select('cost').gte('created_at', `${today}T00:00:00Z`)
    const todayCost = (costData || []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0)

    if (todayCost > COST_THRESHOLD_USD) {
      alerts.push({ type: 'cost_alert', severity: 'warning', title: '⚠️ AI Cost Alert', body: `AI cost hôm nay: $${todayCost.toFixed(4)} (ngưỡng: $${COST_THRESHOLD_USD}).`, action_url: '/admin/ai/cost' })
    }
    if (todayCost > DAILY_COST_BUDGET_USD) {
      alerts.push({ type: 'cost_budget_exceeded', severity: 'critical', title: '🚨 AI Cost Budget Exceeded', body: `AI cost $${todayCost.toFixed(2)} vượt ngân sách $${DAILY_COST_BUDGET_USD}!`, action_url: '/admin/ai/cost' })
    }

    const { data: accuracyData } = await supabase.from('ai_agent_accuracy').select('*')
    const lowAccuracyAgents = (accuracyData || []).filter((a: any) => a.total_feedback >= 3 && a.accuracy_pct < ACCURACY_THRESHOLD_PCT)
    for (const agent of lowAccuracyAgents) {
      alerts.push({ type: 'accuracy_alert', severity: 'critical', title: `🎯 AI Accuracy Alert: ${agent.agent_type}`, body: `${agent.agent_type} accuracy: ${agent.accuracy_pct}% (ngưỡng: ${ACCURACY_THRESHOLD_PCT}%). ${agent.total_feedback} feedback.`, action_url: '/admin/ai/accuracy' })
    }

    const { data: latencyData } = await supabase.from('ai_cost_log').select('agent_type, latency_ms').gte('created_at', oneHourAgo)
    const latencyByAgent: Record<string, number[]> = {}
    ;(latencyData || []).forEach((r: any) => {
      if (!latencyByAgent[r.agent_type]) latencyByAgent[r.agent_type] = []
      latencyByAgent[r.agent_type].push(r.latency_ms || 0)
    })
    for (const [agent, latencies] of Object.entries(latencyByAgent)) {
      if (latencies.length < 5) continue
      const sorted = [...latencies].sort((a, b) => a - b)
      const p95 = sorted[Math.floor(sorted.length * 0.95)]
      const budget = LATENCY_BUDGET_MS[agent] || 5000
      if (p95 > budget) {
        alerts.push({ type: 'latency_alert', severity: 'warning', title: `⏱ Latency Alert: ${agent}`, body: `p95 latency ${p95}ms (ngưỡng: ${budget}ms).`, action_url: '/admin/ai/monitor' })
      }
    }

    const { count: unratedCount } = await supabase.from('ai_feedback').select('*', { count: 'exact', head: true }).is('is_correct', null)
    if (unratedCount && unratedCount > 10) {
      alerts.push({ type: 'feedback_alert', severity: 'info', title: '💬 Feedback Pending', body: `${unratedCount} AI decisions đang chờ review.`, action_url: '/admin/ai/feedback' })
    }

    for (const alert of alerts) {
      await supabase.from('in_app_notifications').insert({
        user_id: null, title: alert.title, body: alert.body,
        category: 'ai_alert', priority: alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'normal' : 'low',
        metadata: { type: alert.type, severity: alert.severity, action_url: alert.action_url },
        created_at: new Date().toISOString(),
      })
    }

    return jsonResponse({
      checked_at: new Date().toISOString(),
      alerts_count: alerts.length, alerts,
      metrics: {
        today_cost_usd: Number(todayCost.toFixed(4)),
        low_accuracy_agents: lowAccuracyAgents.map((a: any) => ({ agent: a.agent_type, accuracy: a.accuracy_pct })),
        cost_exceeded: todayCost > COST_THRESHOLD_USD,
        budget_exceeded: todayCost > DAILY_COST_BUDGET_USD,
        latency_violations: Object.entries(latencyByAgent)
          .filter(([agent, l]) => l.length >= 5 && [...l].sort((a, b) => a - b)[Math.floor(l.length * 0.95)] > (LATENCY_BUDGET_MS[agent] || 5000))
          .map(([agent]) => agent),
      },
    })
  } catch (error: any) {
    console.error('Monitor error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})