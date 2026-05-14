import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Weekly AI Report — generates plain-text report with AI insights
// Can be extended to send via email or create PDF

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

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId })
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString()

    // Collect all weekly data
    const [costData, accuracyData, feedbackData, orderData, aiLogsData] = await Promise.all([
      supabase.rpc('get_ai_cost_summary', { p_days: 7 }),
      supabase.from('ai_agent_accuracy').select('*'),
      supabase.from('ai_feedback').select('*').gte('created_at', weekAgo),
      supabase.from('orders').select('id, category, status, final_price, created_at').gte('created_at', weekAgo),
      supabase.from('ai_logs').select('agent_type', { count: 'exact', head: false }).gte('created_at', weekAgo),
    ])

    const cost = costData.data || []
    const accuracy = accuracyData.data || []
    const feedback = feedbackData.data || []
    const orders = orderData.data || []
    const totalCost = cost.reduce((s: number, r: any) => s + Number(r.total_cost), 0)
    const totalCalls = cost.reduce((s: number, r: any) => s + r.total_calls, 0)
    const totalRevenue = orders.filter((o: any) => o.status === 'completed').reduce((s: number, r: any) => s + (r.final_price || 0), 0)
    const avgAccuracy = accuracy.length > 0 ? accuracy.reduce((s: number, r: any) => s + r.accuracy_pct, 0) / accuracy.length : 0
    const agentsBelow70 = accuracy.filter((a: any) => a.total_feedback >= 3 && a.accuracy_pct < 70)

    // Generate AI commentary
    const commentary = await ai.orchestrateInternal('analytics', async () => ({
      systemPrompt: `Bạn là chuyên gia phân tích dữ liệu cho Vifixa. Viết BÁO CÁO TUẦN ngắn gọn bằng tiếng Việt.
Trả về JSON: {summary: string (2-3 câu), highlights: string[], concerns: string[], recommendations: string[], next_week_focus: string}`,
      userPrompt: `BÁO CÁO AI TUẦN ${today.toLocaleDateString('vi-VN')}
- AI calls: ${totalCalls}
- Chi phí AI: $${Number(totalCost).toFixed(4)}
- Doanh thu: ${Number(totalRevenue).toLocaleString('vi-VN')}đ
- Độ chính xác TB: ${avgAccuracy.toFixed(1)}%
- Agent cần cải thiện: ${agentsBelow70.map((a: any) => `${a.agent_type} (${a.accuracy_pct}%)`).join(', ') || 'Không có'}
- Feedback mới: ${feedback.length}
- Đơn hàng mới: ${orders.length}
Viết báo cáo tuần:`,
    }))

    const report = {
      generated_at: today.toISOString(),
      period: { from: weekAgo.split('T')[0], to: today.toISOString().split('T')[0] },
      metrics: {
        total_ai_calls: totalCalls,
        total_cost_usd: Number(totalCost.toFixed(4)),
        total_revenue_vnd: Number((totalRevenue / 1000).toFixed(0)) + 'K',
        avg_accuracy_pct: Number(avgAccuracy.toFixed(1)),
        feedback_count: feedback.length,
        new_orders: orders.length,
        agents_below_threshold: agentsBelow70.length,
        ai_roi: totalCost > 0 ? `${(totalRevenue / (totalCost * 25000)).toFixed(1)}x` : 'N/A',
      },
      agents: accuracy.map((a: any) => ({
        name: a.agent_type,
        accuracy: a.accuracy_pct,
        feedback: a.total_feedback,
        avg_rating: a.avg_rating,
        needs_attention: a.accuracy_pct < 70 && a.total_feedback >= 3,
      })),
      ai_commentary: commentary.success ? commentary.data : null,
      raw_commentary: commentary.success ? commentary.data?.summary || '' : '',
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'report', requestId,
      input: { period: report.period },
      output: { metrics: report.metrics },
    })

    return jsonResponse(report)
  } catch (error: any) {
    console.error('Report error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})