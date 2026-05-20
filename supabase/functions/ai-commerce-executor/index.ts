import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CommerceActionSchema = z.enum([
  'commerce.create_income_source',
  'commerce.create_offer',
  'commerce.create_demand',
  'commerce.suggest_match',
])

const IncomeSourcePayload = z.object({
  type: z.enum(['asset', 'skill', 'time', 'location', 'relationship', 'inventory', 'service_capacity']),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(2000),
  capabilities: z.array(z.string().min(1)).default([]),
  location: z.record(z.unknown()).default({}),
  availability: z.record(z.unknown()).default({}),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
})

const OfferPayload = z.object({
  income_source_id: z.string().uuid(),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(2000),
  target_customer: z.string().max(500).optional(),
  price_amount: z.number().nonnegative(),
  currency: z.enum(['VND', 'USD']).default('VND'),
  cost_estimate: z.record(z.unknown()).default({}),
  evidence: z.array(z.string()).default([]),
  constraints: z.record(z.unknown()).default({}),
  status: z.enum(['draft', 'testing', 'active', 'paused']).default('draft'),
})

const DemandPayload = z.object({
  raw_text: z.string().min(3).max(2000),
  normalized_need: z.string().min(3).max(1000),
  location: z.record(z.unknown()).default({}),
  budget_amount: z.number().nonnegative().optional(),
  currency: z.enum(['VND', 'USD']).default('VND'),
  constraints: z.array(z.string()).default([]),
  status: z.enum(['new', 'qualified']).default('new'),
})

const MatchPayload = z.object({
  demand_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
  status: z.enum(['suggested', 'accepted', 'rejected']).default('suggested'),
})

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list_executable_requests'),
    payload: z.object({
      status: z.enum(['approved', 'executed', 'blocked']).default('approved'),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
  z.object({
    action: z.literal('execute_approved_request'),
    payload: z.object({
      request_id: z.string().uuid(),
      reason: z.string().min(1).max(1000).default('Executed approved commerce proposal through bounded gateway.'),
    }),
  }),
])

type SupabaseClient = ReturnType<typeof createClient>

type AIActionRequest = {
  id: string
  request_id: string
  user_id: string
  action_type: z.infer<typeof CommerceActionSchema>
  action_payload: Record<string, unknown>
  status: string
  metadata: Record<string, unknown> | null
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearer(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._\-]+/g, 'Bearer [REDACTED]')
      .replace(/[A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{12,}\.[A-Za-z0-9_\-]{12,}/g, '[REDACTED_JWT]')
      .replace(/(sb_secret_[A-Za-z0-9_\-]+)/g, '[REDACTED_SUPABASE_SECRET]')
  }
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(input)) {
      output[key] = /token|secret|password|key|authorization/i.test(key) ? '[REDACTED]' : redact(item)
    }
    return output
  }
  return value
}

async function getUserRole(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return String(data?.role || 'customer')
}

async function writeAudit(supabase: SupabaseClient, input: {
  requestId: string
  userId: string
  action: string
  tool?: string | null
  status: string
  reason?: string
  input?: unknown
  output?: unknown
  latencyMs?: number
  idempotencyKey?: string | null
}) {
  const { error } = await supabase.from('ai_orchestrator_audit_logs').insert({
    request_id: input.requestId,
    user_id: input.userId,
    action: input.action,
    persona: 'admin',
    tool: input.tool || null,
    mode: 'commerce_execution',
    risk: 'medium',
    decision: input.status === 'success' ? 'allow' : 'deny',
    status: input.status,
    reason: input.reason || null,
    input_redacted: redact(input.input || {}),
    output_redacted: input.output === undefined ? null : redact(input.output),
    latency_ms: input.latencyMs || null,
    idempotency_key: input.idempotencyKey || null,
  })
  if (error) console.warn('[ai-commerce-executor:audit]', error.message)
}

async function loadRequest(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('ai_action_requests')
    .select('id, request_id, user_id, action_type, action_payload, status, metadata')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as AIActionRequest | null
}

async function executeCommerceAction(supabase: SupabaseClient, request: AIActionRequest) {
  if (request.action_type === 'commerce.create_income_source') {
    const payload = IncomeSourcePayload.parse(request.action_payload)
    const { data, error } = await supabase.from('income_sources').insert({
      partner_id: request.user_id,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      capabilities: payload.capabilities,
      location: payload.location,
      availability: payload.availability,
      status: payload.status,
    }).select('*').single()
    if (error) throw error
    return { table: 'income_sources', data }
  }

  if (request.action_type === 'commerce.create_offer') {
    const payload = OfferPayload.parse(request.action_payload)
    const { data: source, error: sourceError } = await supabase
      .from('income_sources')
      .select('id, partner_id')
      .eq('id', payload.income_source_id)
      .maybeSingle()
    if (sourceError) throw sourceError
    if (!source || source.partner_id !== request.user_id) throw new Error('Income source not found or not owned by request user')

    const { data, error } = await supabase.from('commerce_offers').insert({
      partner_id: request.user_id,
      income_source_id: payload.income_source_id,
      title: payload.title,
      description: payload.description,
      target_customer: payload.target_customer || null,
      price_amount: payload.price_amount,
      currency: payload.currency,
      cost_estimate: payload.cost_estimate,
      evidence: payload.evidence,
      constraints: payload.constraints,
      status: payload.status,
    }).select('*').single()
    if (error) throw error
    return { table: 'commerce_offers', data }
  }

  if (request.action_type === 'commerce.create_demand') {
    const payload = DemandPayload.parse(request.action_payload)
    const { data, error } = await supabase.from('commerce_demands').insert({
      user_id: request.user_id,
      raw_text: payload.raw_text,
      normalized_need: payload.normalized_need,
      location: payload.location,
      budget_amount: payload.budget_amount || null,
      currency: payload.currency,
      constraints: payload.constraints,
      status: payload.status,
    }).select('*').single()
    if (error) throw error
    return { table: 'commerce_demands', data }
  }

  if (request.action_type === 'commerce.suggest_match') {
    const payload = MatchPayload.parse(request.action_payload)
    const { data: demand, error: demandError } = await supabase
      .from('commerce_demands')
      .select('id, user_id')
      .eq('id', payload.demand_id)
      .maybeSingle()
    if (demandError) throw demandError
    if (!demand || demand.user_id !== request.user_id) throw new Error('Demand not found or not owned by request user')

    const { data: offer, error: offerError } = await supabase
      .from('commerce_offers')
      .select('id, status')
      .eq('id', payload.offer_id)
      .in('status', ['testing', 'active', 'scaled'])
      .maybeSingle()
    if (offerError) throw offerError
    if (!offer) throw new Error('Offer not available')

    const { data, error } = await supabase.from('commerce_matches').insert({
      demand_id: payload.demand_id,
      offer_id: payload.offer_id,
      score: payload.score,
      reasons: payload.reasons,
      status: payload.status,
    }).select('*').single()
    if (error) throw error
    return { table: 'commerce_matches', data }
  }

  throw new Error('Unsupported commerce action')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ success: false, error: 'Missing Supabase env' }, 500)

  const token = getBearer(req)
  if (!token) return json({ success: false, error: 'Missing authorization bearer token' }, 401)

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ success: false, error: 'Unauthorized' }, 401)

  const adminUserId = userData.user.id
  const role = await getUserRole(supabase, adminUserId)
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const idempotencyKey = req.headers.get('idempotency-key')

  try {
    if (role !== 'admin') {
      const responseBody = { success: false, error: 'Only admin can execute approved AI commerce requests' }
      await writeAudit(supabase, { requestId, userId: adminUserId, action: 'forbidden', status: 'error', output: responseBody, reason: 'forbidden', latencyMs: Date.now() - startedAt, idempotencyKey })
      return json(responseBody, 403)
    }

    const parsed = RequestSchema.parse(await req.json())

    if (parsed.action === 'list_executable_requests') {
      const { data, error } = await supabase
        .from('ai_action_requests')
        .select('*')
        .in('action_type', CommerceActionSchema.options)
        .eq('status', parsed.payload.status)
        .order('created_at', { ascending: false })
        .limit(parsed.payload.limit)
      if (error) throw error
      const responseBody = { success: true, action: parsed.action, data }
      await writeAudit(supabase, { requestId, userId: adminUserId, action: parsed.action, status: 'success', input: parsed.payload, output: { count: data?.length || 0 }, latencyMs: Date.now() - startedAt, idempotencyKey })
      return json(responseBody)
    }

    if (parsed.action === 'execute_approved_request') {
      const aiRequest = await loadRequest(supabase, parsed.payload.request_id)
      if (!aiRequest) return json({ success: false, error: 'AI action request not found' }, 404)
      if (!CommerceActionSchema.safeParse(aiRequest.action_type).success) return json({ success: false, error: 'Request action is not commerce-executable' }, 400)

      if (aiRequest.status === 'executed') {
        return json({ success: true, action: parsed.action, idempotent: true, data: aiRequest.metadata?.execution_result || null })
      }

      if (aiRequest.status !== 'approved') return json({ success: false, error: `Request must be approved before execution. Current status: ${aiRequest.status}` }, 409)

      const result = await executeCommerceAction(supabase, aiRequest)
      const nextMetadata = {
        ...(aiRequest.metadata || {}),
        executable: false,
        executed_by: adminUserId,
        executed_at: new Date().toISOString(),
        execution_gateway: 'ai-commerce-executor',
        execution_result: result,
      }

      const { data: updated, error: updateError } = await supabase.from('ai_action_requests').update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        decision_reason: parsed.payload.reason,
        metadata: nextMetadata,
      }).eq('id', aiRequest.id).eq('status', 'approved').select('*').single()
      if (updateError) throw updateError

      const responseBody = { success: true, action: parsed.action, data: { request: updated, result } }
      await writeAudit(supabase, { requestId, userId: adminUserId, action: parsed.action, tool: aiRequest.action_type, status: 'success', input: { request_id: aiRequest.id }, output: responseBody, reason: parsed.payload.reason, latencyMs: Date.now() - startedAt, idempotencyKey })
      return json(responseBody)
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    console.error('[ai-commerce-executor]', requestId, redact(error.message || 'Unknown error'))
    if (error instanceof z.ZodError) return json({ success: false, request_id: requestId, error: 'Invalid request body', details: error.issues }, 400)
    await writeAudit(supabase, { requestId, userId: adminUserId, action: 'unknown', status: 'error', output: { error: error.message || 'Unknown error' }, latencyMs: Date.now() - startedAt, idempotencyKey })
    return json({ success: false, request_id: requestId, error: error.message || 'Unknown error' }, 400)
  }
})
