import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PersonaSchema = z.enum(['customer', 'worker', 'admin'])

const SAFE_ACTION_CATALOG = [
  { id: 'service.detect', domain: 'service', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
  { id: 'service.collect_slots', domain: 'service', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
  { id: 'commerce.create_income_source', domain: 'commerce', mode: 'proposal_only', risk: 'medium', personas: ['worker', 'admin'] },
  { id: 'commerce.create_offer', domain: 'commerce', mode: 'proposal_only', risk: 'medium', personas: ['worker', 'admin'] },
  { id: 'commerce.create_demand', domain: 'commerce', mode: 'proposal_only', risk: 'medium', personas: ['customer', 'admin'] },
  { id: 'commerce.suggest_match', domain: 'commerce', mode: 'proposal_only', risk: 'medium', personas: ['customer', 'admin'] },
  { id: 'payment.list_my_payment_intents', domain: 'payment-ledger', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
  { id: 'payment.get_my_wallets', domain: 'payment-ledger', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
  { id: 'payment.list_my_ledger_entries', domain: 'payment-ledger', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
  { id: 'payment.list_my_transactions', domain: 'payment-ledger', mode: 'read_only', risk: 'low', personas: ['customer', 'worker', 'admin'] },
] as const

type CatalogActionId = typeof SAFE_ACTION_CATALOG[number]['id']
type Persona = z.infer<typeof PersonaSchema>

type AuditInput = {
  supabase: ReturnType<typeof createClient>
  requestId: string
  userId: string
  action: string
  persona?: string
  tool?: string
  mode?: string
  risk?: string
  decision?: string
  status?: string
  reason?: string
  input?: unknown
  output?: unknown
  latencyMs?: number
  idempotencyKey?: string | null
}

const ReadonlyToolSchema = z.enum([
  'service.detect',
  'service.collect_slots',
  'payment.list_my_payment_intents',
  'payment.get_my_wallets',
  'payment.list_my_ledger_entries',
  'payment.list_my_transactions',
])

const RequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('healthcheck'), payload: z.object({}).default({}) }),
  z.object({ action: z.literal('list_action_catalog'), payload: z.object({ persona: PersonaSchema.default('customer') }).default({}) }),
  z.object({ action: z.literal('load_my_context'), payload: z.object({ include_profile: z.boolean().default(true), include_recent_runs: z.boolean().default(true), limit: z.number().int().min(1).max(50).default(10) }).default({}) }),
  z.object({ action: z.literal('inspect_intent'), payload: z.object({ persona: PersonaSchema.default('customer'), message: z.string().min(1).max(4000) }) }),
  z.object({ action: z.literal('plan_readonly'), payload: z.object({ persona: PersonaSchema.default('customer'), message: z.string().min(1).max(4000), max_steps: z.number().int().min(1).max(8).default(5) }) }),
  z.object({ action: z.literal('preview_action_policy'), payload: z.object({ persona: PersonaSchema.default('customer'), action_ids: z.array(z.string().min(1)).min(1).max(20) }) }),
  z.object({ action: z.literal('execute_readonly_tool'), payload: z.object({ persona: PersonaSchema.default('customer'), tool: ReadonlyToolSchema, input: z.record(z.unknown()).default({}) }) }),
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
      if (/token|secret|password|key|authorization/i.test(key)) output[key] = '[REDACTED]'
      else output[key] = redact(item)
    }
    return output
  }
  return value
}

async function sha256(input: unknown) {
  const data = new TextEncoder().encode(JSON.stringify(input))
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function writeAudit(input: AuditInput) {
  const row = {
    request_id: input.requestId,
    user_id: input.userId,
    action: input.action,
    persona: input.persona || null,
    tool: input.tool || null,
    mode: input.mode || 'readonly',
    risk: input.risk || 'low',
    decision: input.decision || 'allow',
    status: input.status || 'success',
    reason: input.reason || null,
    input_redacted: redact(input.input || {}),
    output_redacted: input.output === undefined ? null : redact(input.output),
    latency_ms: input.latencyMs || null,
    idempotency_key: input.idempotencyKey || null,
  }
  const { error } = await input.supabase.from('ai_orchestrator_audit_logs').insert(row)
  if (error) console.warn('[ai-orchestrator:audit]', error.message)
}

async function getIdempotentResponse(supabase: ReturnType<typeof createClient>, userId: string, idempotencyKey: string) {
  const { data, error } = await supabase
    .from('ai_orchestrator_idempotency_keys')
    .select('response_body, status_code, expires_at')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return json(data.response_body, data.status_code || 200)
}

async function saveIdempotentResponse(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  idempotencyKey: string,
  action: string,
  requestHash: string,
  responseBody: unknown,
  statusCode = 200,
) {
  const { error } = await supabase.from('ai_orchestrator_idempotency_keys').upsert({
    user_id: userId,
    idempotency_key: idempotencyKey,
    action,
    request_hash: requestHash,
    response_body: responseBody,
    status_code: statusCode,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'user_id,idempotency_key' })
  if (error) console.warn('[ai-orchestrator:idempotency]', error.message)
}

function getCatalogForPersona(persona: Persona) {
  return SAFE_ACTION_CATALOG.filter((item) => item.personas.includes(persona))
}

function classifyIntent(message: string) {
  const text = message.toLowerCase()
  if (/(kiếm tiền|thu nhập|offer|bán|dịch vụ|income|partner)/i.test(text)) return 'income_offer'
  if (/(cần|muốn đặt|tìm|nhu cầu|booking|demand)/i.test(text)) return 'demand_capture'
  if (/(thanh toán|ví|wallet|payment|ledger|giao dịch)/i.test(text)) return 'payment_review'
  if (/(lãi|lỗ|profit|margin|correction|sửa sai)/i.test(text)) return 'profit_review'
  if (/(admin|khóa|duyệt|báo cáo|vận hành)/i.test(text)) return 'admin_review'
  return 'general_chat'
}

function suggestActions(intent: string, persona: Persona) {
  const catalog = getCatalogForPersona(persona)
  const allow = (ids: string[]) => catalog.filter((item) => ids.includes(item.id))
  if (intent === 'income_offer') return allow(['commerce.create_income_source', 'commerce.create_offer'])
  if (intent === 'demand_capture') return allow(['commerce.create_demand', 'commerce.suggest_match'])
  if (intent === 'payment_review') return allow(['payment.list_my_payment_intents', 'payment.get_my_wallets', 'payment.list_my_ledger_entries', 'payment.list_my_transactions'])
  if (intent === 'profit_review') return allow(['payment.list_my_transactions', 'payment.list_my_ledger_entries'])
  return allow(['service.detect', 'service.collect_slots'])
}

function evaluatePolicy(actionId: string, persona: Persona) {
  const action = SAFE_ACTION_CATALOG.find((item) => item.id === actionId)
  if (!action) return { action_id: actionId, allowed: false, mode: 'blocked', reason: 'Action is not registered in AI-Orchestrator catalog.' }
  if (!action.personas.includes(persona)) return { action_id: actionId, allowed: false, mode: 'blocked', reason: `Persona ${persona} is not allowed for this action.` }
  return {
    action_id: actionId,
    allowed: action.mode === 'read_only' || action.mode === 'proposal_only',
    mode: action.mode,
    risk: action.risk,
    reason: action.mode === 'read_only' ? 'Read-only action can execute through bounded gateway.' : 'Proposal-only action requires approval and is not executable yet.',
  }
}

function requireReadonlyTool(tool: CatalogActionId, persona: Persona) {
  const policy = evaluatePolicy(tool, persona)
  if (!policy.allowed || policy.mode !== 'read_only') return { ok: false, policy, error: 'Only read-only tools can be executed in AI-Orchestrator.' }
  return { ok: true, policy }
}

function buildReadonlyPlan(message: string, persona: Persona, maxSteps: number) {
  const intent = classifyIntent(message)
  const suggested = suggestActions(intent, persona)
  const steps = suggested.slice(0, maxSteps).map((action, index) => ({ step_index: index, title: `Preview ${action.id}`, action_id: action.id, domain: action.domain, mode: action.mode, policy: evaluatePolicy(action.id, persona) }))
  return { readonly: true, intent, goal_description: message, confidence: steps.length > 0 ? 0.72 : 0.45, steps }
}

function detectService(query: string) {
  const text = query.toLowerCase()
  if (/(máy lạnh|điều hòa|air conditioner|ac)/i.test(text)) return [{ id: 'air_conditioner', confidence: 0.88, reason: 'Cooling/HVAC intent detected' }]
  if (/(điện|ổ cắm|đèn|electric)/i.test(text)) return [{ id: 'electrical', confidence: 0.82, reason: 'Electrical intent detected' }]
  if (/(nước|ống|rò|plumb)/i.test(text)) return [{ id: 'plumbing', confidence: 0.82, reason: 'Plumbing intent detected' }]
  if (/(phòng|booking|đặt phòng|homestay|hotel)/i.test(text)) return [{ id: 'room_booking', confidence: 0.84, reason: 'Room booking intent detected' }]
  if (/(tour|du lịch|travel|cửa lò)/i.test(text)) return [{ id: 'tour_local', confidence: 0.8, reason: 'Local tour intent detected' }]
  return [{ id: 'general_service', confidence: 0.45, reason: 'Generic service fallback' }]
}

function collectSlots(serviceId: string) {
  const base = [
    { key: 'location', label: 'Địa điểm', required: true },
    { key: 'time_window', label: 'Thời gian mong muốn', required: true },
    { key: 'budget', label: 'Ngân sách dự kiến', required: false },
  ]
  if (serviceId === 'room_booking') return [...base, { key: 'guests', label: 'Số người', required: true }, { key: 'nights', label: 'Số đêm', required: true }]
  if (serviceId === 'air_conditioner') return [...base, { key: 'symptom', label: 'Triệu chứng máy lạnh', required: true }]
  return base
}

function mapPaymentTool(tool: z.infer<typeof ReadonlyToolSchema>, input: Record<string, unknown>) {
  if (tool === 'payment.list_my_payment_intents') return { action: 'list_my_payment_intents', payload: input }
  if (tool === 'payment.get_my_wallets') return { action: 'get_my_wallets', payload: input }
  if (tool === 'payment.list_my_ledger_entries') return { action: 'list_my_ledger_entries', payload: input }
  if (tool === 'payment.list_my_transactions') return { action: 'list_my_transactions', payload: input }
  throw new Error(`Unsupported payment tool: ${tool}`)
}

async function callGateway(req: Request, path: string, body: unknown) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) return { body: { success: false, error: 'Missing Supabase env' }, status: 500 }
  const auth = req.headers.get('authorization') || ''
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let body: unknown
  try { body = JSON.parse(text) } catch { body = { raw: text } }
  return { body, status: response.status }
}

async function executeReadonlyTool(req: Request, tool: z.infer<typeof ReadonlyToolSchema>, persona: Persona, input: Record<string, unknown>) {
  const policyResult = requireReadonlyTool(tool, persona)
  if (!policyResult.ok) return { body: { success: false, action: 'execute_readonly_tool', error: policyResult.error, policy: policyResult.policy }, status: 403 }
  if (tool === 'service.detect') return { body: { success: true, action: 'execute_readonly_tool', data: detectService(String(input.query || input.message || '')), policy: policyResult.policy }, status: 200 }
  if (tool === 'service.collect_slots') return { body: { success: true, action: 'execute_readonly_tool', data: collectSlots(String(input.service_id || 'general_service')), policy: policyResult.policy }, status: 200 }
  if (tool.startsWith('payment.')) return await callGateway(req, '/functions/v1/payment-ledger', mapPaymentTool(tool, input))
  return { body: { success: false, action: 'execute_readonly_tool', error: 'Unsupported read-only tool' }, status: 400 }
}

async function sendAudited(input: AuditInput, body: unknown, status = 200) {
  await writeAudit({ ...input, output: body, status: status >= 400 ? 'error' : (input.status || 'success'), latencyMs: input.latencyMs })
  return json(body, status)
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

  const userId = userData.user.id
  const startedAt = Date.now()
  const requestId = crypto.randomUUID()
  const idempotencyKey = req.headers.get('idempotency-key')

  try {
    const body = await req.json()
    const parsed = RequestSchema.parse(body)
    const requestHash = await sha256({ action: parsed.action, payload: parsed.payload })

    if (parsed.action === 'execute_readonly_tool' && idempotencyKey) {
      const cached = await getIdempotentResponse(supabase, userId, idempotencyKey)
      if (cached) return cached
    }

    const baseAudit = {
      supabase,
      requestId,
      userId,
      action: parsed.action,
      persona: 'persona' in parsed.payload ? String(parsed.payload.persona) : undefined,
      input: parsed.payload,
      idempotencyKey,
    }

    if (parsed.action === 'healthcheck') {
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: { gateway: 'ai-orchestrator', version: 'v3-audit-idempotency', readonly: true, execute_readonly_tool: true, audit: true, idempotency: true, latency_ms: Date.now() - startedAt } }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'list_action_catalog') {
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: { persona: parsed.payload.persona, actions: getCatalogForPersona(parsed.payload.persona) } }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'load_my_context') {
      const result: Record<string, unknown> = { user_id: userId, warnings: [] }
      if (parsed.payload.include_profile) {
        const { data: profile, error } = await supabase.from('profiles').select('id, role, full_name, phone, created_at').eq('id', userId).maybeSingle()
        if (error) (result.warnings as string[]).push('profile_unavailable')
        else result.profile = profile
      }
      if (parsed.payload.include_recent_runs) {
        const { data: runs, error } = await supabase.from('agent_runs').select('id, persona, status, current_step, started_at, completed_at').eq('user_id', userId).order('started_at', { ascending: false }).limit(parsed.payload.limit)
        if (error) (result.warnings as string[]).push('agent_runs_unavailable')
        else result.recent_runs = runs
      }
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: result }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'inspect_intent') {
      const intent = classifyIntent(parsed.payload.message)
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: { readonly: true, persona: parsed.payload.persona, intent, suggested_actions: suggestActions(intent, parsed.payload.persona), message_preview: redact(parsed.payload.message) } }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'plan_readonly') {
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: buildReadonlyPlan(parsed.payload.message, parsed.payload.persona, parsed.payload.max_steps) }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'preview_action_policy') {
      const responseBody = { success: true, action: parsed.action, request_id: requestId, data: { persona: parsed.payload.persona, decisions: parsed.payload.action_ids.map((id) => evaluatePolicy(id, parsed.payload.persona)) } }
      return await sendAudited({ ...baseAudit, latencyMs: Date.now() - startedAt }, responseBody)
    }

    if (parsed.action === 'execute_readonly_tool') {
      const result = await executeReadonlyTool(req, parsed.payload.tool, parsed.payload.persona, parsed.payload.input)
      if (idempotencyKey) await saveIdempotentResponse(supabase, userId, idempotencyKey, parsed.action, requestHash, result.body, result.status)
      await writeAudit({ ...baseAudit, tool: parsed.payload.tool, mode: 'read_only', risk: 'low', output: result.body, status: result.status >= 400 ? 'error' : 'success', latencyMs: Date.now() - startedAt })
      return json(result.body, result.status)
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    console.error('[ai-orchestrator]', requestId, redact(error.message || 'Unknown error'))
    if (error instanceof z.ZodError) return json({ success: false, request_id: requestId, error: 'Invalid request body', details: error.issues }, 400)
    return json({ success: false, request_id: requestId, error: error.message || 'Unknown error' }, 400)
  }
})
