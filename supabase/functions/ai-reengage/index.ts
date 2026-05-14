import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Auto Re-engagement — AI sinh offer cá nhân hóa + tự động gửi push

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

    const { user_id, trigger, category } = await req.json()

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId })
    const audit = createAIAudit(supabase)

    // Get user context
    const { data: orders } = await supabase
      .from('orders')
      .select('id, category, status, final_price, estimated_price, created_at')
      .eq('customer_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: devices } = await supabase
      .from('device_profiles')
      .select('device_type, brand, purchase_date')
      .eq('user_id', user_id)

    const completedOrders = (orders || []).filter(o => o.status === 'completed')
    const totalSpent = completedOrders.reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)
    const categories = [...new Set((orders || []).map(o => o.category).filter(Boolean))] as string[]

    // Generate personalized re-engagement offer
    const offer = await ai.orchestrateInternal('upsell', async () => ({
      systemPrompt: `Bạn là chuyên gia tái tương tác khách hàng cho Vifixa.
Tạo offer cá nhân hóa để thu hút khách quay lại sử dụng dịch vụ.
Trả về JSON: {title: string, offer: string, discount: {type: string, value: number}, recommended_service: string, push_message: string, email_subject: string}`,
      userPrompt: `Trigger: ${trigger || 'inactive'}
Danh mục: ${category || categories.join(', ') || 'general'}
Đơn hoàn thành: ${completedOrders.length}
Tổng chi: ${totalSpent}đ
Devices: ${(devices || []).map(d => `${d.device_type} ${d.brand || ''}`).join(', ') || 'N/A'}
Trả về JSON re-engagement offer:`,
    }))

    const output = offer.success ? offer.data : {
      title: '🎁 Quay lại Vifixa ngay hôm nay!',
      offer: 'Giảm 15% cho đơn dịch vụ kế tiếp',
      discount: { type: 'percentage', value: 15 },
      recommended_service: categories[0] || 'general',
      push_message: '🎁 Ưu đãi đặc biệt đang chờ bạn!',
      email_subject: 'Vifixa có ưu đãi dành riêng cho bạn',
    }

    // Send notification
    await supabase.from('in_app_notifications').insert({
      user_id,
      title: output.title,
      body: output.offer,
      category: 're_engagement',
      priority: 'high',
      metadata: {
        type: 're_engagement', trigger: trigger || 'manual',
        discount_type: output.discount?.type, discount_value: output.discount?.value,
        recommended_service: output.recommended_service, request_id: requestId,
        action_url: '/customer',
      },
    })

    await audit.log({
      agentType: 'reengage', requestId,
      input: { user_id, trigger, category },
      output,
    })

    return jsonResponse(output)
  } catch (error: any) {
    console.error('Re-engage error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})