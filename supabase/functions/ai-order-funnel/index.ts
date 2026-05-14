import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Order Funnel — detect abandonment → auto discount → recover orders

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
    const action = url.searchParams.get('action') || 'scan'

    switch (action) {
      case 'scan': {
        // Find abandoned orders: pending > 2h, or chat sessions without order > 1h
        const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

        const [abandonedOrders, abandonedSessions] = await Promise.all([
          supabase.from('orders').select('*').eq('status', 'pending').lt('created_at', twoHoursAgo).order('created_at', { ascending: false }).limit(20),
          supabase.from('chat_sessions').select('*').eq('status', 'active').lt('updated_at', oneHourAgo).is('context->>conversion_stage', 'quoted').order('updated_at', { ascending: false }).limit(20),
        ])

        const recoverable = [...(abandonedOrders.data || []), ...(abandonedSessions.data || [])]
        let recovered = 0
        let totalDiscount = 0

        for (const item of recoverable) {
          const userId = item.customer_id || item.user_id
          if (!userId) continue
          const orderValue = item.estimated_price || 300000
          const discountPct = orderValue > 1000000 ? 15 : orderValue > 500000 ? 10 : 5

          const result = await ai.orchestrateInternal('upsell', async () => ({
            systemPrompt: `Bạn là chuyên gia phục hồi đơn hàng. Tạo offer cá nhân hóa để khách quay lại chốt đơn.
Trả về JSON: {title: string, offer: string, discount: {type: string, value: number}, urgency: string}`,
            userPrompt: `Đơn hàng bị bỏ: ${item.id}
Giá trị: ${orderValue}đ
Trạng thái: ${item.status || 'chat_abandoned'}
Thời gian: ${item.created_at}
${item.description ? `Mô tả: ${item.description}` : ''}
Tạo offer recovery:`,
          }))

          if (result.success && result.data) {
            await supabase.from('in_app_notifications').insert({
              user_id: userId,
              title: result.data.title || '⏰ Đơn hàng đang chờ bạn!',
              body: result.data.offer || `Giảm ${discountPct}% nếu chốt đơn ngay!`,
              category: 'order_recovery',
              priority: 'high',
              metadata: {
                type: 'order_recovery', order_id: item.id,
                discount_pct: discountPct, order_value: orderValue,
                is_session: !item.customer_id, request_id: requestId,
                action_url: item.customer_id ? `/customer/orders/${item.id}` : '/customer/chat',
              },
            })
            recovered++
            totalDiscount += Math.round(orderValue * discountPct / 100)
          }
        }

        await audit.log({
          agentType: 'order_funnel', requestId,
          input: { abandoned_orders: (abandonedOrders.data || []).length, abandoned_sessions: (abandonedSessions.data || []).length },
          output: { recovered, total_discount_offered: totalDiscount },
        })

        return jsonResponse({
          scanned: recoverable.length,
          recovered,
          total_discount_offered: totalDiscount,
          avg_discount: recovered > 0 ? Math.round(totalDiscount / recovered) : 0,
        })
      }

      case 'recover-one': {
        // Recover a specific order
        const { order_id, user_id, estimated_price } = await req.json()
        if (!order_id || !user_id) return jsonResponse({ error: 'Missing order_id or user_id' }, 400)

        const value = estimated_price || 300000
        const discountPct = value > 1000000 ? 15 : value > 500000 ? 10 : 5

        const result = await ai.orchestrateInternal('upsell', async () => ({
          systemPrompt: `Tạo offer cá nhân hóa để khách chốt đơn. Trả về JSON: {title, offer, discount_pct, message}`,
          userPrompt: `Order: ${order_id}, Value: ${value}đ. Recovery offer:`,
        }))

        await supabase.from('in_app_notifications').insert({
          user_id, title: result.success ? result.data.title : '⏰ Chốt đơn ngay!',
          body: result.success ? result.data.offer : `Giảm ${discountPct}% cho đơn hàng!`,
          category: 'order_recovery', priority: 'high',
          metadata: { type: 'order_recovery', order_id, discount_pct: discountPct, request_id: requestId, action_url: `/customer/orders/${order_id}` },
        })

        return jsonResponse({ recovered: true, discount_pct: discountPct })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    console.error('Order funnel error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})