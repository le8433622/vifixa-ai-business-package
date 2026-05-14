import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  let user: any
  try {
    user = await verifyAuth(req)
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const url = new URL(req.url)
  const suggestionId = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET' && !action) {
      const { data: abTests } = await supabase.from('ab_tests').select('*').eq('active', true)
      const userVariant = getABTestVariant(user.id, abTests || [])

      const { data: suggestions } = await supabase
        .from('user_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('applied', false)
        .eq('dismissed', false)
        .order('confidence', { ascending: false })

      if ((!suggestions || suggestions.length === 0) && user.role !== 'admin') {
        const aiSuggestions = await generateAISuggestions(supabase, user.id)
        if (aiSuggestions.length > 0) {
          return jsonResponse({ suggestions: aiSuggestions, ab_test: userVariant, ai_generated: true })
        }
      }

      return jsonResponse({ suggestions: suggestions || [], ab_test: userVariant, ai_generated: false })
    }

    if (req.method === 'GET' && action === 'ab-tests') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403)
      const { data } = await supabase.from('ab_tests').select('*, user_suggestions(count)').order('created_at', { ascending: false })
      return jsonResponse({ ab_tests: data || [] })
    }

    if (req.method === 'POST' && action === 'ab-tests') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403)
      const body = await req.json()
      const { test_name, description, variant_a, variant_b, traffic_split } = body
      if (!test_name) return jsonResponse({ error: 'Missing test_name' }, 400)
      const { data, error } = await supabase.from('ab_tests').insert({
        test_name, description, variant_a, variant_b,
        traffic_split: traffic_split || 50, active: true, created_by: user.id,
      }).select().single()
      if (error) throw error
      return jsonResponse({ success: true, ab_test: data })
    }

    if (req.method === 'PUT' && suggestionId && !action) {
      const { data: suggestion } = await supabase.from('user_suggestions').select('*, ab_tests(*)').eq('id', suggestionId).eq('user_id', user.id).single()
      if (!suggestion) return jsonResponse({ error: 'Suggestion not found' }, 404)
      await supabase.from('user_preferences').upsert({
        user_id: user.id, preference_key: suggestion.suggestion_type,
        value: suggestion.suggestion, updated_at: new Date().toISOString(),
      })
      await supabase.from('user_suggestions').update({ applied: true, applied_at: new Date().toISOString() }).eq('id', suggestionId)
      if (suggestion.ab_test_id) {
        await supabase.from('ab_test_conversions').insert({ ab_test_id: suggestion.ab_test_id, user_id: user.id, suggestion_id: suggestionId, converted: true })
      }
      return jsonResponse({ success: true, message: 'Suggestion applied' })
    }

    if (req.method === 'PUT' && suggestionId && action === 'dismiss') {
      await supabase.from('user_suggestions').update({ dismissed: true }).eq('id', suggestionId).eq('user_id', user.id)
      return jsonResponse({ success: true, message: 'Suggestion dismissed' })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('Smart suggestions error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function generateAISuggestions(supabase: any, userId: string): Promise<any[]> {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile) return []

    const { data: orders } = await supabase
      .from('orders')
      .select('category, status, created_at, estimated_price, final_price')
      .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!orders || orders.length === 0) return []

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId })

    const isWorker = profile.role === 'worker'
    const result = await ai.orchestrateInternal('suggestion', async () => ({
      systemPrompt: `Bạn là chuyên gia phân tích hành vi và đưa ra gợi ý thông minh cho ${isWorker ? 'thợ sửa chữa' : 'khách hàng'} trên nền tảng Vifixa.`,
      userPrompt: `Người dùng: ${isWorker ? 'Thợ' : 'Khách hàng'}
Đơn hàng (${orders.length}): ${orders.slice(0, 10).map((o: any) => `${o.category} (${o.status})`).join(', ')}
${isWorker ? 'Gợi ý về: tối ưu thu nhập, kỹ năng nên học, giờ làm việc hiệu quả' : 'Gợi ý về: dịch vụ phù hợp, gói bảo trì, tiết kiệm chi phí'}
Trả về JSON array: [{suggestion_type: string, suggestion: object, confidence: 0-1, reason: string}] (tối đa 3 gợi ý)`,
    }))

    if (!result.success) return []

    const suggestions = Array.isArray(result.data) ? result.data.slice(0, 3) : [result.data]
    const saved: any[] = []

    for (const sug of suggestions) {
      const { data } = await supabase.from('user_suggestions').insert({
        user_id: userId,
        suggestion_type: sug.suggestion_type || 'ai_generated',
        suggestion: sug.suggestion || sug,
        confidence: sug.confidence || 0.5,
      }).select().single()
      if (data) saved.push(data)
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'suggestion',
      input: { orders_count: orders.length, is_worker: isWorker },
      output: saved,
      userId,
    })

    return saved
  } catch (err) {
    console.error('AI suggestion generation failed:', err)
    return []
  }
}

function getABTestVariant(userId: string, abTests: any[]): any {
  if (!abTests?.length) return null
  let hash = 0
  const data = new TextEncoder().encode(userId)
  for (const b of data) hash = (hash + b) % 100
  for (const test of abTests) {
    const variant = hash < (test.traffic_split || 50) ? 'a' : 'b'
    return { test_id: test.id, test_name: test.test_name, variant: `variant_${variant}`, config: variant === 'a' ? test.variant_a : test.variant_b }
  }
  return null
}