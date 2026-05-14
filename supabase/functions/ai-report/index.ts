import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403)
    }

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '7'

    const [accuracyData, costData, feedbackData, logData] = await Promise.all([
      supabase.from('ai_agent_accuracy').select('*'),
      supabase.rpc('get_ai_cost_summary', { p_days: parseInt(period) }),
      supabase.from('ai_feedback').select('*').gte('created_at', new Date(Date.now() - parseInt(period) * 86400000).toISOString()).is('is_correct', null),
      supabase.from('ai_logs').select('agent_type, count:agent_type').gte('created_at', new Date(Date.now() - parseInt(period) * 86400000).toISOString()),
    ])

    const accuracy = accuracyData.data || []
    const cost = costData.data || []
    const unratedFeedback = feedbackData.data || []

    const totalCost = cost.reduce((s: number, r: any) => s + Number(r.total_cost), 0)
    const totalCalls = cost.reduce((s: number, r: any) => s + r.total_calls, 0)
    const avgAccuracy = accuracy.length > 0 ? accuracy.reduce((s: number, r: any) => s + r.accuracy_pct, 0) / accuracy.length : 0
    const agentsNeedingAttention = accuracy.filter((a: any) => a.accuracy_pct < 70)

    const report = {
      generated_at: new Date().toISOString(),
      period_days: parseInt(period),
      summary: {
        total_ai_calls: totalCalls,
        total_cost_usd: Number(totalCost.toFixed(4)),
        avg_accuracy_pct: Number(avgAccuracy.toFixed(1)),
        unrated_feedback_count: unratedFeedback.length,
        agents_below_threshold: agentsNeedingAttention.length,
      },
      agents: accuracy.map((a: any) => ({
        name: a.agent_type,
        accuracy_pct: a.accuracy_pct,
        total_feedback: a.total_feedback,
        avg_rating: a.avg_rating,
        needs_attention: a.accuracy_pct < 70,
      })),
      cost_by_day: cost.map((c: any) => ({
        day: c.day,
        calls: c.total_calls,
        cost: Number(c.total_cost),
        avg_latency_ms: c.avg_latency_ms,
        cache_hit_pct: c.cache_hit_pct,
      })),
      recommendations: [
        ...(agentsNeedingAttention.length > 0 ? [`⚠️ ${agentsNeedingAttention.length} agent(s) cần cải thiện: ${agentsNeedingAttention.map((a: any) => a.agent_type).join(', ')}`] : []),
        ...(unratedFeedback.length > 5 ? [`💬 ${unratedFeedback.length} feedback chưa được đánh giá — cần review`] : []),
        ...(totalCost > 0.1 ? [`💰 Chi phí AI 7 ngày: $${totalCost.toFixed(4)}`] : ['💰 Chi phí AI trong ngưỡng cho phép']),
        ...(avgAccuracy < 80 ? [`🎯 Độ chính xác trung bình ${avgAccuracy.toFixed(1)}% — dưới mục tiêu 80%`] : [`🎯 Độ chính xác ${avgAccuracy.toFixed(1)}% — đạt mục tiêu`]),
      ],
    }

    return jsonResponse(report)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message }, 401)
    console.error('Report error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})