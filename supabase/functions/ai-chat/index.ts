import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions, redactPII } from '../_shared/auth-helper.ts'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIRAG } from '../_shared/ai-rag.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import type { ChatContext, ChatRequest } from './types.ts'
import { extractSlots } from './slot-extractor.ts'
import { chooseState, getMissingSlots } from './state-machine.ts'
import { buildActions } from './action-builder.ts'
import { buildHandoffSummary, buildReply } from './reply-builder.ts'
import { maybeRunDiagnosisAndQuote } from './ai-service.ts'
import { createOrderIfConfirmed } from './order-service.ts'
import { logChatDecision } from './audit-service.ts'
import { logChatEvents } from './event-service.ts'
import { createApprovalRequest, evaluateAutonomy, resolveAutonomyPolicy } from './autonomy-service.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const acceptStream = req.headers.get('accept') === 'text/event-stream' ||
    req.headers.get('x-stream') === 'true'

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 30 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const locationData = await loadLocationData(supabase)

    let body: ChatRequest
    try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid request body' }, 400) }

    const message = body.message?.trim()
    if (!message) return jsonResponse({ error: 'Missing message' }, 400)

    let sessionId = body.session_id || undefined
    let isNewSession = false
    let sessionContext: ChatContext = { ...(body.context || {}) }
    let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = []

    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single()
      if (sessionError || !session) return jsonResponse({ error: 'Session not found' }, 404)
      sessionContext = { ...(session.context || {}), ...(body.context || {}) }
      const { data: chatMessages } = await supabase
        .from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      if (chatMessages) {
        messages = chatMessages.map(msg => ({ role: msg.role as 'user' | 'assistant' | 'system', content: msg.content }))
      }
    } else {
      const initialContext: ChatContext = { state: 'problem_capture', conversion_stage: 'started', ...(body.context || {}) }
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions').insert({ user_id: user.id, session_type: 'booking', status: 'active', context: initialContext })
        .select().single()
      if (createError || !newSession) return jsonResponse({ error: `Failed to create session: ${createError?.message}` }, 500)
      sessionId = newSession.id
      isNewSession = true
      sessionContext = initialContext
    }

    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'user', content: message,
      metadata: { request_id: body.idempotency_key || null },
    })
    messages.push({ role: 'user', content: message })

    const requestId = body.idempotency_key || crypto.randomUUID()

    // Extract slots with AI enrichment
    let nextContext = await extractSlots(message, { ...sessionContext, idempotency_key: requestId }, locationData, supabase)

    let missingSlots = getMissingSlots(nextContext)
    let state = chooseState(nextContext, missingSlots)

    if (state === 'diagnosis' || state === 'quote' || state === 'confirmation' || state === 'order_creation') {
      try {
        nextContext = await maybeRunDiagnosisAndQuote(supabase, nextContext, user.id)
      } catch (aiError) {
        console.error('Diagnosis/quote failed:', aiError)
        nextContext.risk_flags = [...new Set([...(nextContext.risk_flags || []), 'ai_fallback'])]
      }
    }

    missingSlots = getMissingSlots(nextContext)
    state = chooseState(nextContext, missingSlots)

    let orderId: string | undefined
    if (state === 'order_creation') {
      const policy = await resolveAutonomyPolicy(supabase, nextContext.category)
      const evaluation = evaluateAutonomy(nextContext, policy)

      if (evaluation.decision === 'execute') {
        const userToken = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
        orderId = await createOrderIfConfirmed(supabase, supabaseUrl, userToken, user.id, sessionId!, nextContext)
        state = 'handoff'
        nextContext.customer_confirmation = true
        nextContext.conversion_stage = 'order_created'
      } else {
        await createApprovalRequest(supabase, {
          requestId, userId: user.id, sessionId: sessionId!,
          actionType: 'create_order', context: nextContext, evaluation,
        })
        state = evaluation.decision === 'blocked' ? 'escalated' : 'approval_required'
        nextContext.conversion_stage = evaluation.decision === 'blocked' ? 'blocked' : 'approval_required'
        nextContext.risk_flags = [...new Set([...(nextContext.risk_flags || []), evaluation.reason])]
      }
    } else if (state === 'quote' && nextContext.quote) {
      nextContext.conversion_stage = 'quoted'
      state = 'confirmation'
    } else if (state === 'slot_filling') {
      nextContext.conversion_stage = 'qualified'
    }

    // --- UPSELL INTEGRATION ---
    let upsellOffer: any = null
    if ((state === 'confirmation' || state === 'handoff') && !nextContext.upsell_shown) {
      try {
        const rag = createAIRAG(supabase)
        const upsellContext = await rag.getUpsellContext(user.id)
        const ai = createAICore(supabase, { requestId, userId: user.id })
        const upsellResult = await ai.generateUpsell({
          user_id: user.id,
          trigger_type: state === 'handoff' ? 'after_completion' : 'after_confirmation',
          category: nextContext.category,
          order_value: (nextContext.quote as any)?.estimated_price || 0,
          is_first_time: upsellContext.completedOrders === 0,
          completed_orders: upsellContext.completedOrders,
          total_spent: upsellContext.totalSpent,
          has_membership: !!upsellContext.activeMembership,
        })
        if (upsellResult.success && upsellResult.data.confidence >= 0.6) {
          upsellOffer = {
            suggestion: upsellResult.data.suggestion,
            product_type: upsellResult.data.product_type,
            discount_percent: upsellResult.data.discount_percent || 0,
            show: true,
          }
          nextContext.upsell_shown = true
          nextContext.upsell_result = upsellOffer
        }
      } catch { /* upsell best-effort */ }
    }

    nextContext.state = state
    nextContext.handoff_summary = buildHandoffSummary(nextContext)
    nextContext.lead_score = nextContext.category && nextContext.location ? 80 : 45
    nextContext.confidence = nextContext.quote ? 0.82 : 0.68

    const finalMissingSlots = getMissingSlots(nextContext)
    const actions = buildActions(state, finalMissingSlots, nextContext, orderId)
    const reply = buildReply(state, finalMissingSlots, nextContext, orderId)
    const sessionComplete = Boolean(orderId)

    const output = {
      session_id: sessionId!,
      reply,
      state,
      intent: nextContext.intent,
      slots: nextContext,
      missing_slots: finalMissingSlots,
      actions,
      next_step: state,
      confidence: nextContext.confidence,
      session_complete: sessionComplete,
      order_id: orderId,
      upsell: upsellOffer,
    }

    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'assistant', content: reply,
      metadata: { request_id: requestId, actions, state, intent: nextContext.intent, slots: nextContext, order_id: orderId, upsell: upsellOffer },
    })

    await supabase.from('chat_sessions').update({
      status: sessionComplete ? 'completed' : 'active',
      context: nextContext,
      completed_at: sessionComplete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId)

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'chat',
      input: { message, context: sessionContext, messages: messages.slice(-8) },
      output,
      userId: user.id,
      requestId,
      metadata: { state, intent: nextContext.intent, session_id: sessionId },
    })

    await logChatEvents(supabase, {
      isNewSession, requestId, userId: user.id, sessionId: sessionId!,
      state, intent: nextContext.intent, missingSlots: finalMissingSlots,
      context: nextContext, orderId,
    })

    if (acceptStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(output)}\n\n`))
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return jsonResponse(output)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Chat error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function loadLocationData(supabase: any): Promise<any> {
  try {
    const { data: districts } = await supabase.from('vietnam_administrative_divisions').select('name').eq('type', 'district')
    const { data: provincesShort } = await supabase.from('vietnam_administrative_divisions').select('name_short').eq('type', 'province')
    const { data: provincesFull } = await supabase.from('vietnam_administrative_divisions').select('name').eq('type', 'province')
    if (districts?.length && provincesShort?.length) {
      const districtNames = districts.map((d: any) => d.name.toLowerCase())
      const provinceNames = provincesShort.map((p: any) => p.name_short.toLowerCase())
      const fullProvinceNames = provincesFull?.map((p: any) => p.name.toLowerCase()) || []
      return { districtNames, provinceNames, allNames: [...districtNames, ...provinceNames, ...fullProvinceNames] }
    }
  } catch { /* fallback */ }
  return null
}