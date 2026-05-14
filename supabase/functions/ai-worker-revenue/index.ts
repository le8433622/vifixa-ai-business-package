import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Worker Revenue Dashboard — AI đề xuất tối ưu thu nhập cho worker

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    const { worker_id } = await req.json()
    const targetWorkerId = worker_id || userId
    if (!targetWorkerId) return jsonResponse({ error: 'Missing worker_id' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: targetWorkerId })
    const audit = createAIAudit(supabase)

    // Get worker data
    const { data: orders } = await supabase
      .from('orders')
      .select('id, category, status, final_price, estimated_price, created_at, rating')
      .eq('worker_id', targetWorkerId)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: worker } = await supabase
      .from('workers')
      .select('*, profiles!inner(full_name, phone)')
      .eq('user_id', targetWorkerId)
      .single()

    if (!orders || orders.length === 0) {
      return jsonResponse({ revenue: { total: 0, avg: 0, count: 0 }, recommendations: null })
    }

    // Analyze
    const completed = orders.filter(o => o.status === 'completed')
    const totalEarnings = completed.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)
    const avgRating = completed.filter(o => o.rating).reduce((s, o) => s + o.rating, 0) / Math.max(completed.filter(o => o.rating).length, 1)
    const categoryCounts: Record<string, number> = {}
    const hourCounts: Record<string, number> = {}
    const dayCounts: Record<string, number> = {}

    for (const o of orders) {
      categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1
      const h = new Date(o.created_at).getHours().toString()
      hourCounts[h] = (hourCounts[h] || 0) + 1
      const d = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(o.created_at).getDay()]
      dayCounts[d] = (dayCounts[d] || 0) + 1
    }

    const bestCategory = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'general'
    const bestHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '8'
    const bestDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'T2'

    // AI recommendations
    const result = await ai.orchestrateInternal('coach', async () => ({
      systemPrompt: `Bạn là chuyên gia tối ưu thu nhập cho thợ sửa chữa.
Phân tích dữ liệu và đưa ra chiến lược tăng thu nhập cụ thể bằng tiếng Việt.
Trả về JSON: {
  revenue_score: 0-100,
  best_strategy: string,
  hourly_recommendation: [{hour: string, demand: string, recommendation: string}],
  skill_recommendations: [{skill: string, reason: string, expected_income_boost: string}],
  area_recommendations: string[],
  quick_wins: string[],
  monthly_projection: {current: number, optimized: number, growth_pct: number}
}`,
      userPrompt: `Worker: ${worker?.profiles?.full_name || targetWorkerId}
Tổng đơn: ${orders.length}
Đã hoàn thành: ${completed.length}
Thu nhập: ${totalEarnings}đ
Rating TB: ${avgRating.toFixed(1)}/5
Dịch vụ chính: ${bestCategory}
Giờ tốt nhất: ${bestHour}h
Ngày tốt nhất: ${bestDay}
Top danh mục: ${Object.entries(categoryCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([c, n]) => `${c}(${n})`).join(', ')}
Phân tích và tối ưu:`,
    }))

    const output = {
      worker: { name: worker?.profiles?.full_name || 'N/A', id: targetWorkerId },
      revenue: {
        total: totalEarnings,
        avg_per_job: completed.length > 0 ? Math.round(totalEarnings / completed.length) : 0,
        total_jobs: orders.length,
        completed_jobs: completed.length,
        avg_rating: Number(avgRating.toFixed(1)),
      },
      insights: {
        best_category: bestCategory,
        best_hour: `${bestHour}h`,
        best_day: bestDay,
        category_breakdown: categoryCounts,
      },
      ai_recommendations: result.success ? result.data : null,
    }

    await audit.log({
      agentType: 'worker_revenue', requestId,
      input: { worker_id: targetWorkerId, orders_analyzed: orders.length },
      output,
    })

    return jsonResponse(output)
  } catch (error: any) {
    console.error('Worker revenue error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})