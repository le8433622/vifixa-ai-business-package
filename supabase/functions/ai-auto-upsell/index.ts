import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Auto Upsell Flow — tự động upsell ở mọi touchpoint trong lifecycle customer

const TOUCHPOINTS = [
  { trigger: 'after_diagnosis', stage: 'vừa chẩn đoán', products: ['warranty', 'maintenance_plan'] },
  { trigger: 'after_quote', stage: 'vừa báo giá', products: ['membership', 'warranty'] },
  { trigger: 'after_order', stage: 'vừa tạo đơn', products: ['membership', 'maintenance_plan'] },
  { trigger: 'after_completion', stage: 'vừa hoàn thành', products: ['maintenance_plan', 'material_kit'] },
  { trigger: 'after_review', stage: 'vừa đánh giá', products: ['membership', 'warranty'] },
  { trigger: 'repeat_customer', stage: 'khách quay lại', products: ['membership', 'maintenance_plan'] },
]

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

    const { user_id, touchpoint, category, order_value } = await req.json()
    const targetUserId = user_id || userId
    if (!targetUserId || !touchpoint) return jsonResponse({ error: 'Missing user_id or touchpoint' }, 400)

    const validTouchpoint = TOUCHPOINTS.find(t => t.trigger === touchpoint)
    if (!validTouchpoint) return jsonResponse({ error: `Unknown touchpoint: ${touchpoint}` }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: targetUserId })
    const audit = createAIAudit(supabase)

    // Get user context
    const { data: orders } = await supabase
      .from('orders')
      .select('category, status, final_price, created_at')
      .eq('customer_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: subscription } = await supabase
      .from('customer_subscriptions')
      .select('*, membership_plans(*)')
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .maybeSingle()

    const completedOrders = (orders || []).filter(o => o.status === 'completed')
    const totalSpent = completedOrders.reduce((s, o) => s + (o.final_price || 0), 0)
    const hasMembership = !!subscription
    const isFirstTime = (orders || []).length <= 1

    let suggestions: any[] = []

    for (const product of validTouchpoint.products) {
      const result = await ai.orchestrateInternal('upsell', async () => ({
        systemPrompt: `Bạn là chuyên gia upsell cho Vifixa. Dựa vào context khách hàng, tạo upsell suggestion phù hợp.
Trả về JSON: {
  suggestion: string (tiếng Việt, ngắn gọn),
  product_type: string (${validTouchpoint.products.join('|')}),
  discount_percent: number (0-30),
  confidence: 0-1,
  reason: string,
  expected_upsell_value: number
}`,
        userPrompt: `Touchpoint: ${touchpoint} (${validTouchpoint.stage})
KH: ${targetUserId}
Danh mục: ${category || 'N/A'}
Giá trị đơn: ${order_value || 0}đ
Đã hoàn thành: ${completedOrders.length} đơn
Tổng chi: ${totalSpent}đ
Có membership: ${hasMembership}
Lần đầu: ${isFirstTime}
Sản phẩm target: ${product}
Tạo upsell:`,
      }))

      if (result.success && result.data && result.data.confidence >= 0.4) {
        suggestions.push(result.data)
      }
    }

    const output = {
      touchpoint,
      suggestions: suggestions.slice(0, 2), // Max 2 suggestions per touchpoint
      has_membership: hasMembership,
      order_count: (orders || []).length,
    }

    // Log each suggestion as an in-app notification
    for (const sug of suggestions.slice(0, 1)) {
      await supabase.from('in_app_notifications').insert({
        user_id: targetUserId,
        title: `💎 ${sug.suggestion?.slice(0, 60) || 'Ưu đãi đặc biệt!'}`,
        body: sug.reason || sug.suggestion || '',
        category: 'upsell',
        priority: 'normal',
        metadata: {
          type: 'auto_upsell', touchpoint,
          product_type: sug.product_type,
          discount_percent: sug.discount_percent,
          expected_value: sug.expected_upsell_value,
          request_id: requestId,
          action_url: touchpoint === 'after_completion' ? '/customer' : '/customer/chat',
        },
      })
    }

    await audit.log({
      agentType: 'auto_upsell', requestId,
      input: { user_id: targetUserId, touchpoint, category },
      output,
    })

    return jsonResponse(output)
  } catch (error: any) {
    console.error('Auto upsell error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})