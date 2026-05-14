import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// AI Analytics — churn prediction + revenue attribution + user insights

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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'overview'

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId })

    switch (action) {
      case 'churn': {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, created_at')
          .eq('role', 'customer')
          .order('created_at', { ascending: false })
          .limit(200)

        const userIds = (users || []).map((u: any) => u.id)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
        const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

        const { data: recentOrders } = await supabase
          .from('orders')
          .select('customer_id')
          .in('customer_id', userIds)
          .gte('created_at', ninetyDaysAgo)

        const orderCounts: Record<string, number> = {}
        ;(recentOrders || []).forEach((o: any) => {
          orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1
        })

        const atRiskUsers = users?.filter((u: any) => {
          const orderCount = orderCounts[u.id] || 0
          if (orderCount === 0) return true
          const lastOrder = recentOrders?.filter((o: any) => o.customer_id === u.id)
          if (!lastOrder?.length) return true
          return false
        }) || []

        const result = await ai.orchestrateInternal('analytics', async () => ({
          systemPrompt: `Bạn là chuyên gia phân tích churn. Dựa vào dữ liệu, đưa ra insights.`,
          userPrompt: `Tổng số user: ${users?.length || 0}
User có nguy cơ rời bỏ (không có đơn trong 90 ngày): ${atRiskUsers.length}
Tỷ lệ churn: ${users?.length ? ((atRiskUsers.length / users.length) * 100).toFixed(1) : 0}%
Trả về JSON: {churn_rate: number, at_risk_count: number, recommendations: string[], retention_strategies: [{action: string, expected_impact: string}]}`,
        }))

        return jsonResponse({
          churn_rate: users?.length ? Number(((atRiskUsers.length / users.length) * 100).toFixed(1)) : 0,
          at_risk_users: atRiskUsers.length,
          total_users: users?.length || 0,
          ai_insights: result.success ? result.data : null,
          recommendations: result.success ? result.data?.recommendations : ['Tạo chương trình khuyến mãi cho user lâu ngày không đặt'],
        })
      }

      case 'revenue-attribution': {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, category, final_price, estimated_price, status, created_at, ai_diagnosis')
          .in('status', ['completed', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(200)

        const totalRevenue = (orders || []).reduce((s: number, o: any) => s + (o.final_price || 0), 0)
        const revenueByCategory: Record<string, number> = {}
        ;(orders || []).forEach((o: any) => {
          revenueByCategory[o.category] = (revenueByCategory[o.category] || 0) + (o.final_price || 0)
        })

        const topCategories = Object.entries(revenueByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, revenue]) => ({ category, revenue: Number(revenue.toFixed(0)) }))

        // Estimate AI-attributed revenue (orders that used AI diagnosis)
        const aiOrders = (orders || []).filter((o: any) => o.ai_diagnosis)
        const aiRevenue = aiOrders.reduce((s: number, o: any) => s + (o.final_price || 0), 0)

        const result = await ai.orchestrateInternal('analytics', async () => ({
          systemPrompt: `Bạn là chuyên gia phân tích doanh thu. Đưa ra insights về AI revenue attribution.`,
          userPrompt: `Tổng doanh thu: ${totalRevenue}đ
Doanh thu từ AI-assisted orders: ${aiRevenue}đ (${totalRevenue > 0 ? ((aiRevenue / totalRevenue) * 100).toFixed(1) : 0}%)
Top danh mục: ${topCategories.map(c => `${c.category}: ${c.revenue}đ`).join(', ')}
Trả về JSON: {ai_attributed_revenue_pct: number, top_categories: array, growth_recommendations: string[]}`,
        }))

        return jsonResponse({
          total_revenue: Number(totalRevenue.toFixed(0)),
          ai_attributed_revenue: Number(aiRevenue.toFixed(0)),
          ai_attribution_pct: totalRevenue > 0 ? Number(((aiRevenue / totalRevenue) * 100).toFixed(1)) : 0,
          top_categories: topCategories,
          ai_insights: result.success ? result.data : null,
        })
      }

      default: {
        // Overview dashboard
        const today = new Date().toISOString().split('T')[0]
        const [costResult, accuracyResult, orderResult, userResult] = await Promise.all([
          supabase.from('ai_cost_log').select('cost').gte('created_at', `${today}T00:00:00Z`),
          supabase.from('ai_agent_accuracy').select('*'),
          supabase.from('orders').select('id, category, final_price, status').in('status', ['completed', 'in_progress']),
          supabase.from('profiles').select('role'),
        ])

        const todayCost = (costResult.data || []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0)
        const totalRevenue = (orderResult.data || []).reduce((s: number, r: any) => s + (r.final_price || 0), 0)
        const accData = accuracyResult.data || []
        const avgAccuracy = accData.length > 0
          ? accData.reduce((s: number, r: any) => s + r.accuracy_pct, 0) / accData.length
          : 0
        const customers = (userResult.data || []).filter((p: any) => p.role === 'customer').length
        const workers = (userResult.data || []).filter((p: any) => p.role === 'worker').length

        return jsonResponse({
          today_ai_cost_usd: Number(todayCost.toFixed(4)),
          total_revenue_vnd: Number(totalRevenue.toFixed(0)),
          avg_accuracy_pct: Number(avgAccuracy.toFixed(1)),
          total_orders: (orderResult.data || []).length,
          total_customers: customers,
          total_workers: workers,
          ai_roi: todayCost > 0 ? `${(totalRevenue / (todayCost * 25000)).toFixed(1)}x` : 'N/A',
          generated_at: new Date().toISOString(),
        })
      }
    }
  } catch (error: any) {
    console.error('Analytics error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})