import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// AI Retention Campaign — auto-detect churn-risk users + personalized offers

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

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    // Find at-risk users: customers with orders > 30d ago, or 1 order only
    const { data: customers } = await supabase.from('profiles').select('id, email, phone, created_at').eq('role', 'customer').limit(500)
    const userIds = (customers || []).map(c => c.id)

    const { data: lastOrders } = await supabase
      .from('orders')
      .select('customer_id, created_at, category, final_price')
      .in('customer_id', userIds)
      .order('created_at', { ascending: false })

    const userLastOrder: Record<string, any> = {}
    const userOrderCount: Record<string, number> = {}
    const userCategories: Record<string, Set<string>> = {}
    for (const o of lastOrders || []) {
      if (!userLastOrder[o.customer_id]) userLastOrder[o.customer_id] = o
      userOrderCount[o.customer_id] = (userOrderCount[o.customer_id] || 0) + 1
      if (!userCategories[o.customer_id]) userCategories[o.customer_id] = new Set()
      userCategories[o.customer_id].add(o.category)
    }

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId })
    const audit = createAIAudit(supabase)
    let campaignsLaunched = 0

    for (const customer of customers || []) {
      const lastOrder = userLastOrder[customer.id]
      const daysSinceLastOrder = lastOrder
        ? Math.round((Date.now() - new Date(lastOrder.created_at).getTime()) / 86400000)
        : 999
      const totalOrders = userOrderCount[customer.id] || 0

      // Determine churn risk
      const isAtRisk = daysSinceLastOrder > 30 || totalOrders === 0
      const isHighRisk = daysSinceLastOrder > 60 || totalOrders === 0
      if (!isAtRisk) continue

      // AI-generate personalized retention offer
      const categories = userCategories[customer.id] ? [...userCategories[customer.id]].join(', ') : 'general'
      const offer = await ai.orchestrateInternal('upsell', async () => ({
        systemPrompt: `Bạn là chuyên gia giữ chân khách hàng cho Vifixa.
Tạo offer cá nhân hóa để giữ chân khách hàng đang có nguy cơ rời bỏ.
Trả về JSON: {title: string, offer: string, discount_pct: number, reason: string, urgency: string}`,
        userPrompt: `Khách hàng: ${customer.email || customer.id}
Đã ${daysSinceLastOrder} ngày không đặt dịch vụ
Tổng số đơn: ${totalOrders}
Dịch vụ đã dùng: ${categories}
Trả về JSON offer retention:`,
      }))

      if (offer.success && offer.data) {
        await supabase.from('in_app_notifications').insert({
          user_id: customer.id,
          title: offer.data.title || `🎁 Ưu đãi đặc biệt dành riêng cho bạn!`,
          body: offer.data.offer || `Đã lâu bạn không sử dụng Vifixa. Chúng tôi có ưu đãi ${offer.data.discount_pct || 10}% cho đơn kế tiếp.`,
          category: 'retention',
          priority: isHighRisk ? 'high' : 'normal',
          metadata: {
            type: 'retention_campaign', risk_level: isHighRisk ? 'high' : 'medium',
            days_inactive: daysSinceLastOrder, total_orders: totalOrders,
            offer_discount: offer.data.discount_pct || 10, request_id: requestId,
            action_url: '/customer',
          },
          created_at: new Date().toISOString(),
        })
        campaignsLaunched++
      }
    }

    await audit.log({
      agentType: 'retention', requestId,
      input: { total_customers: customers?.length || 0 },
      output: { campaigns_launched: campaignsLaunched },
    })

    return jsonResponse({
      success: true,
      customers_analyzed: customers?.length || 0,
      campaigns_launched: campaignsLaunched,
      message: `Đã phân tích ${customers?.length || 0} khách hàng, gửi ${campaignsLaunched} campaign retention.`,
    })
  } catch (error: any) {
    console.error('Retention error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})