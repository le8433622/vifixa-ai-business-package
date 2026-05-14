import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Pricing Optimizer — tự động điều chỉnh pricing dựa trên demand + historical data + A/B test

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
    const audit = createAIAudit(supabase)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'analyze'

    switch (action) {

      case 'analyze': {
        // Analyze pricing effectiveness across categories
        const { data: orders } = await supabase
          .from('orders')
          .select('id, category, status, estimated_price, final_price, created_at')
          .in('status', ['completed', 'cancelled', 'pending'])
          .order('created_at', { ascending: false })
          .limit(500)

        const catData: Record<string, { count: number; completed: number; cancelled: number; estTotal: number; finalTotal: number; days: number[]; hours: number[] }> = {}
        for (const o of orders || []) {
          if (!catData[o.category]) catData[o.category] = { count: 0, completed: 0, cancelled: 0, estTotal: 0, finalTotal: 0, days: [], hours: [] }
          catData[o.category].count++
          if (o.status === 'completed') { catData[o.category].completed++; catData[o.category].finalTotal += (o.final_price || 0) }
          if (o.status === 'cancelled') catData[o.category].cancelled++
          catData[o.category].estTotal += (o.estimated_price || 0)
          catData[o.category].days.push(new Date(o.created_at).getDay())
          catData[o.category].hours.push(new Date(o.created_at).getHours())
        }

        const analysis = Object.entries(catData).map(([cat, d]) => ({
          category: cat,
          total_orders: d.count,
          completion_rate: d.count > 0 ? Number(((d.completed / d.count) * 100).toFixed(1)) : 0,
          cancellation_rate: d.count > 0 ? Number(((d.cancelled / d.count) * 100).toFixed(1)) : 0,
          avg_estimated: d.count > 0 ? Math.round(d.estTotal / d.count) : 0,
          avg_final: d.completed > 0 ? Math.round(d.finalTotal / d.completed) : 0,
          price_gap_pct: d.estTotal > 0 ? Number((((d.finalTotal - d.estTotal) / d.estTotal) * 100).toFixed(1)) : 0,
          peak_day: d.days.length > 0 ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][modeValue(d.days)] : 'N/A',
          peak_hour: d.hours.length > 0 ? `${modeValue(d.hours)}h` : 'N/A',
        }))

        // AI recommendations
        const result = await ai.orchestrateInternal('pricing', async () => ({
          systemPrompt: `Bạn là chuyên gia tối ưu giá cho Vifixa.
Phân tích dữ liệu pricing và đề xuất điều chỉnh để tối đa hóa revenue.
Trả về JSON: {
  recommendations: [{category: string, current_avg_price: number, suggested_price: number, expected_revenue_impact: string, reasoning: string}],
  surge_opportunities: [{day: string, hour: string, multiplier: number}],
  discount_strategies: [{type: string, target: string, value: number}],
  expected_revenue_growth_pct: number
}`,
          userPrompt: `Phân tích pricing theo category:
${analysis.map(a => `${a.category}: avg_est=${a.avg_estimated}, avg_final=${a.avg_final}, completion=${a.completion_rate}%, cancel=${a.cancellation_rate}%, gap=${a.price_gap_pct}%, peak=${a.peak_hour} ${a.peak_day}`).join('\n')}
Đề xuất tối ưu giá:`,
        }))

        const output = {
          analysis,
          ai_recommendations: result.success ? result.data : null,
          generated_at: new Date().toISOString(),
        }

        await audit.log({
          agentType: 'pricing_optimizer', requestId,
          input: { action, orders_analyzed: orders?.length || 0 },
          output,
        })

        return jsonResponse(output)
      }

      case 'simulate': {
        // Simulate pricing change impact
        const { category, new_price } = await req.json()
        if (!category || !new_price) return jsonResponse({ error: 'Missing category or new_price' }, 400)

        const { data: orders } = await supabase
          .from('orders')
          .select('estimated_price, final_price, status')
          .eq('category', category)
          .limit(200)

        const completed = (orders || []).filter(o => o.status === 'completed')
        const avgPrice = completed.length > 0 ? completed.reduce((s, o) => s + (o.final_price || 0), 0) / completed.length : 0
        const completionRate = (orders || []).length > 0 ? completed.length / (orders || []).length : 0

        const result = await ai.orchestrateInternal('pricing', async () => ({
          systemPrompt: `Bạn là chuyên gia mô phỏng pricing. Dựa vào dữ liệu lịch sử, dự đoán tác động của thay đổi giá.
Trả về JSON: {estimated_new_completion_rate: number, estimated_revenue_change_pct: number, 
  risk_level: string, recommendation: string, time_to_stabilize_days: number}`,
          userPrompt: `Category: ${category}
Current avg price: ${Math.round(avgPrice)}đ
New price: ${new_price}đ
Current completion rate: ${(completionRate * 100).toFixed(1)}%
Price change: ${((new_price - avgPrice) / avgPrice * 100).toFixed(1)}%
Phân tích tác động:`,
        }))

        return jsonResponse({
          category,
          current_price: Math.round(avgPrice),
          simulated_price: new_price,
          change_pct: avgPrice > 0 ? Number(((new_price - avgPrice) / avgPrice * 100).toFixed(1)) : 0,
          simulation: result.success ? result.data : null,
        })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    console.error('Pricing optimizer error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

function modeValue(arr: number[]): number {
  const freq: Record<number, number> = {}
  for (const v of arr) freq[v] = (freq[v] || 0) + 1
  return Number(Object.entries(freq).sort(([, a], [, b]) => b - a)[0]?.[0] || 0)
}