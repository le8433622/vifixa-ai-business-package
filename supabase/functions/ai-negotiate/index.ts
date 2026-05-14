import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Price Negotiation AI — hỗ trợ thương lượng giá thông minh
// Giúp worker đưa ra mức giá hợp lý dựa trên category, khoảng cách, độ khó

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 10 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { order_id, customer_offer, worker_counter, category, description, estimated_price } = await req.json()

    if (!category || !description) {
      return jsonResponse({ error: 'Missing required fields: category, description' }, 400)
    }

    const requestId = crypto.randomUUID()
    const rag = createAIRAG(supabase)

    // Get context: price standards + past orders
    const context = await rag.getPricingContext(category)
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('final_price, estimated_price, category')
      .eq('category', category)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20)

    const ai = createAICore(supabase, { requestId, userId: user.id })
    const result = await ai.orchestrateInternal('pricing', async () => ({
      systemPrompt: `Bạn là chuyên gia thương lượng giá dịch vụ sửa chữa cho Vifixa.
Phân tích thông tin và đề xuất mức giá hợp lý cho cả hai bên.
Trả về JSON: {
  fair_price: number (giá hợp lý),
  min_acceptable: number (giá tối thiểu chấp nhận được),
  max_suggested: number (giá tối đa đề xuất),
  reasoning: string (giải thích bằng tiếng Việt, ngắn gọn),
  compromise_suggestion: string (gợi ý thỏa hiệp),
  confidence: 0-1
}`,
      userPrompt: `Dịch vụ: ${category}
Mô tả: ${description}
Giá AI ước tính: ${estimated_price || 'Chưa có'}đ
${customer_offer ? `Khách đề xuất: ${customer_offer}đ` : ''}
${worker_counter ? `Thợ đề xuất: ${worker_counter}đ` : ''}
Giá tham khảo thị trường: ${(context.priceBands || []).map((pb: any) => `${pb.subcategory || 'Chung'}: ${pb.min_price}-${pb.max_price}đ`).join(', ')}
Giá hoàn thành trung bình: ${(completedOrders || []).reduce((s: number, o: any) => s + (o.final_price || 0), 0) / Math.max((completedOrders || []).length, 1)}đ
Phân tích và đề xuất giá hợp lý:`,
    }))

    const output = result.success ? result.data : {
      fair_price: estimated_price || 500000,
      min_acceptable: Math.round((estimated_price || 500000) * 0.8),
      max_suggested: Math.round((estimated_price || 500000) * 1.2),
      reasoning: 'Không thể phân tích. Sử dụng giá AI ước tính làm cơ sở.',
      compromise_suggestion: 'Giữ nguyên giá AI ước tính.',
      confidence: 0.5,
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'negotiate',
      input: { order_id, category, customer_offer, worker_counter },
      output,
      userId: user.id,
      requestId,
    })

    return jsonResponse(output)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Negotiate error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})