import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// AI Auto-Pilot — orchestrate entire order flow: diagnose → price → match → order → upsell → quality → retention
// Bật/tắt qua app_settings key 'ai_autopilot_enabled'

const AUTOPILOT_FLOW = [
  'diagnose', 'price', 'match', 'create_order', 'notify_worker',
  'notify_customer', 'upsell', 'schedule_quality_check', 'retention',
] as const

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if Auto-Pilot is enabled
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_autopilot_enabled')
      .maybeSingle()

    const autopilotEnabled = setting?.value === 'true'
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'process'

    if (action === 'status') {
      return jsonResponse({ enabled: autopilotEnabled, flow: AUTOPILOT_FLOW })
    }

    if (!autopilotEnabled && action !== 'dry-run') {
      return jsonResponse({ error: 'Auto-Pilot is disabled. Enable in Settings > AI.' }, 400)
    }

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId })
    const rag = createAIRAG(supabase)
    const audit = createAIAudit(supabase)

    const body = await req.json()
    const { category, description, media_urls, location, user_id } = body
    if (!category || !description || !user_id) {
      return jsonResponse({ error: 'Missing required: category, description, user_id' }, 400)
    }

    const flowResults: Record<string, any> = { request_id: requestId, started_at: new Date().toISOString() }
    let errors: string[] = []
    let orderId: string | null = null

    // Step 1: Diagnose
    try {
      const diagContext = await rag.getDiagnosisContext(category, description, user_id)
      const diag = await ai.diagnose({ category, description, media_urls, location }, diagContext.knowledgeBase)
      flowResults.diagnose = diag.success ? diag.data : diag
      if (!diag.success) errors.push(`diagnose: ${diag.error}`)
    } catch (e: any) { errors.push(`diagnose: ${e.message}`) }

    // Step 2: Price
    try {
      if (flowResults.diagnose?.diagnosis) {
        const priceCtx = await rag.getPricingContext(category, location)
        const price = await ai.estimatePrice({
          category, diagnosis: flowResults.diagnose.diagnosis, location,
          urgency: flowResults.diagnose.severity || 'medium',
        }, priceCtx.priceBands)
        flowResults.price = price.success ? price.data : price
        if (!price.success) errors.push(`price: ${price.error}`)
      }
    } catch (e: any) { errors.push(`price: ${e.message}`) }

    // Step 3: Match worker
    try {
      const skills = flowResults.diagnose?.recommended_skills || [category]
      const { workers } = await rag.getMatchingContext(skills, location)
      if (workers?.length > 0) {
        const match = await ai.matchWorker({
          order_id: requestId, skills_required: skills, location,
          urgency: flowResults.diagnose?.severity || 'medium',
        }, workers.slice(0, 10))
        flowResults.match = match.success ? match.data : match
        if (!match.success) errors.push(`match: ${match.error}`)
      } else {
        flowResults.match = { note: 'No available workers found' }
        errors.push('match: no workers available')
      }
    } catch (e: any) { errors.push(`match: ${e.message}`) }

    // Step 4: Create order (Auto-Pilot)
    if (!errors.some(e => e.startsWith('match: no workers'))) {
      try {
        const { data: order, error: orderError } = await supabase.from('orders').insert({
          customer_id: user_id,
          category,
          description,
          media_urls: media_urls || [],
          ai_diagnosis: flowResults.diagnose,
          estimated_price: flowResults.price?.estimated_price || 300000,
          status: 'pending',
          worker_id: flowResults.match?.matched_worker_id || null,
        }).select().single()

        if (orderError) throw orderError
        orderId = order.id
        flowResults.order_created = { order_id: order.id, status: 'pending' }

        // Notify worker
        if (flowResults.match?.matched_worker_id) {
          await supabase.from('in_app_notifications').insert({
            user_id: flowResults.match.matched_worker_id,
            title: '🔔 Đơn hàng mới!', body: `${category}: ${description.slice(0, 100)}`,
            category: 'new_order', priority: 'high',
            metadata: { order_id: order.id, type: 'autopilot_dispatch', action_url: `/worker/jobs/${order.id}` },
          })
        }
      } catch (e: any) { errors.push(`create_order: ${e.message}`) }
    }

    // Step 5: Upsell
    if (orderId) {
      try {
        const upsell = await ai.generateUpsell({
          user_id, trigger_type: 'after_confirmation', category,
          order_value: flowResults.price?.estimated_price || 0,
          is_first_time: false,
        })
        if (upsell.success && upsell.data.confidence >= 0.6) {
          await supabase.from('in_app_notifications').insert({
            user_id, title: '💎 ' + upsell.data.suggestion,
            body: upsell.data.reason || 'Ưu đãi đặc biệt cho bạn!',
            category: 'upsell', priority: 'normal',
            metadata: { type: 'autopilot_upsell', order_id: orderId, product_type: upsell.data.product_type, request_id: requestId },
          })
          flowResults.upsell = upsell.data
        }
      } catch (e: any) { errors.push(`upsell: ${e.message}`) }
    }

    flowResults.completed_at = new Date().toISOString()
    flowResults.errors = errors.length > 0 ? errors : undefined
    flowResults.autopilot_mode = action

    // Log the full Auto-Pilot run
    await audit.log({
      agentType: 'autopilot', requestId,
      input: { category, description, user_id, mode: action },
      output: { order_id: orderId, steps_completed: Object.keys(flowResults).filter(k => !['request_id', 'started_at', 'completed_at', 'autopilot_mode'].includes(k)).length, errors: errors.length },
      metadata: { flow_steps: AUTOPILOT_FLOW, completed_steps: Object.keys(flowResults).filter(k => k.startsWith('diagnose') || k.startsWith('price') || k.startsWith('match') || k.startsWith('order') || k.startsWith('upsell')) },
    })

    return jsonResponse(flowResults)
  } catch (error: any) {
    console.error('Auto-Pilot error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})