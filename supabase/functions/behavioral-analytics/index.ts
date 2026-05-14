import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const user = await verifyAuth(req)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403)
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = supabaseAdmin
  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id')

  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const targetUserId = body.user_id || userId
      if (targetUserId) {
        await analyzeUserBehavior(supabase, targetUserId)
        return jsonResponse({ success: true, message: `Analysis complete for user ${targetUserId}` })
      } else {
        const { data: users } = await supabase.from('profiles').select('id').in('role', ['worker', 'customer'])
        for (const user of users || []) await analyzeUserBehavior(supabase, user.id)
        return jsonResponse({ success: true, message: `Analysis complete for ${users?.length || 0} users` })
      }
    }

    if (req.method === 'GET' && userId) {
      const [patternsResult, suggestionsResult] = await Promise.all([
        supabase.from('behavioral_patterns').select('*').eq('user_id', userId),
        supabase.from('user_suggestions').select('*').eq('user_id', userId).eq('dismissed', false).eq('applied', false),
      ])
      return jsonResponse({ patterns: patternsResult.data || [], pending_suggestions: suggestionsResult.data || [] })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('Behavioral analytics error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function analyzeUserBehavior(supabase: any, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (!profile) return

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!orders || orders.length === 0) return

  const ruleBased = profile.role === 'worker' ? analyzeWorker(orders) : analyzeCustomer(orders)
  savePattern(supabase, userId, ruleBased)

  const requestId = crypto.randomUUID()
  const ai = createAICore(supabase, { requestId, userId })

  const isWorker = profile.role === 'worker'
  const aiResult = await ai.orchestrateInternal('analytics', async () => ({
    systemPrompt: `Bạn là chuyên gia phân tích hành vi người dùng trên Vifixa.`,
    userPrompt: `Role: ${isWorker ? 'Worker' : 'Customer'}
Orders (${orders.length}): ${orders.slice(0, 10).map((o: any) => `${o.category}(${o.status})`).join(', ')}
Trả về JSON: { behavioral_clusters: string[], risk_signals: string[], growth_opportunities: string[], suggested_actions: [{action: string, impact: string}] }`,
  }))

  if (aiResult.success) {
    saveAIPattern(supabase, userId, aiResult.data)
  }

  const audit = createAIAudit(supabase)
  await audit.log({
    agentType: 'analytics',
    input: { user_id: userId, orders_count: orders.length },
    output: { rule_based: ruleBased, ai_insights: aiResult.success ? aiResult.data : null },
  })
}

function analyzeWorker(orders: any[]) {
  const hourCounts: Record<number, number> = {}
  const jobTypeCounts: Record<string, number> = {}
  orders.forEach((o: any) => {
    const hour = new Date(o.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
    jobTypeCounts[o.category || 'general'] = (jobTypeCounts[o.category || 'general'] || 0) + 1
  })
  const bestHours = Object.entries(hourCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([h]) => parseInt(h))
  const topJobTypes = Object.entries(jobTypeCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([t]) => t)
  const completed = orders.filter((o: any) => o.status === 'completed')
  const totalEarnings = completed.reduce((s: number, o: any) => s + (o.worker_payout_amount || 0), 0)
  const disputed = orders.filter((o: any) => o.status === 'disputed').length
  return {
    best_work_hours: bestHours,
    top_job_types: topJobTypes,
    avg_earnings_per_job: completed.length > 0 ? totalEarnings / completed.length : 0,
    total_completed_jobs: completed.length,
    dispute_rate: orders.length > 0 ? disputed / orders.length : 0,
  }
}

function analyzeCustomer(orders: any[]) {
  const serviceTypes: Record<string, number> = {}
  orders.forEach((o: any) => { serviceTypes[o.category || 'general'] = (serviceTypes[o.category || 'general'] || 0) + 1 })
  const totalSpent = orders.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + (o.actual_price || 0), 0)
  return {
    preferred_services: Object.entries(serviceTypes).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
    avg_spending: orders.length > 0 ? totalSpent / orders.length : 0,
    total_orders: orders.length,
    churn_risk: orders.filter((o: any) => o.status === 'cancelled').length > 2 ? 'high' : 'low',
  }
}

async function savePattern(supabase: any, userId: string, data: any) {
  await supabase.from('behavioral_patterns').upsert({
    user_id: userId, pattern_type: 'rule_based',
    pattern_data: data, confidence: 1.0,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'user_id, pattern_type' })
}

async function saveAIPattern(supabase: any, userId: string, data: any) {
  await supabase.from('behavioral_patterns').upsert({
    user_id: userId, pattern_type: 'ai_insights',
    pattern_data: data, confidence: 0.7,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'user_id, pattern_type' })
}