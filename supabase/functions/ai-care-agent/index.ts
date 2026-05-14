// 💚 AI Chăm sóc — Phân tích khách hàng, đề xuất hành động chủ động

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 10 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const [devicesResult, ordersResult] = await Promise.all([
      supabase.from('device_profiles').select('device_type, brand, model, purchase_date, warranty_expiry').eq('user_id', user.id).order('purchase_date', { ascending: false }),
      supabase.from('orders').select('id, category, status, created_at, completed_at, rating, final_price, estimated_price').eq('customer_id', user.id).order('created_at', { ascending: false }),
    ])

    const devices = devicesResult.data || []
    const orders = ordersResult.data || []
    const completedOrders = orders.filter((o: any) => o.status === 'completed')
    const totalSpent = completedOrders.reduce((s: number, o: any) => s + (o.final_price ?? o.estimated_price ?? 0), 0)
    const repeatRate = orders.length > 0 ? (orders.length - new Set(orders.map((o: any) => o.category)).size) / orders.length : 0

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.careAgent({
      user_id: user.id,
      devices: devices.map((d: any) => ({ device_type: d.device_type, brand: d.brand, model: d.model, purchase_date: d.purchase_date, warranty_expiry: d.warranty_expiry })),
      orders: orders.map((o: any) => ({ id: o.id, category: o.category, status: o.status, created_at: o.created_at, completed_at: o.completed_at, rating: o.rating })),
      total_spent: totalSpent, device_count: devices.length,
      completed_orders: completedOrders.length, repeat_rate: repeatRate,
    })

    const duLieuRa = result.success ? result.data : {
      summary: 'Không thể tạo kế hoạch chăm sóc', next_best_action: { title: 'Liên hệ hỗ trợ', description: 'Vui lòng liên hệ admin', action_type: 'chat' },
      device_insights: [], maintenance_reminders: [], reorder_suggestions: [],
      loyalty_status: { tier: 'Đồng', total_spent: totalSpent, next_tier_at: 5000000 },
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'cham_soc',
      input: { soThietBi: devices.length, soDon: orders.length, tongChi: totalSpent },
      output: duLieuRa, userId: user.id, requestId,
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi chăm sóc:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})