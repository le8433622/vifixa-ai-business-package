import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ProposalActionSchema = z.enum([
  'commerce.create_income_source',
  'commerce.create_offer',
  'commerce.create_demand',
  'commerce.suggest_match',
])

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_action_request'),
    payload: z.object({
      action_type: ProposalActionSchema,
      action_payload: z.record(z.unknown()).default({}),
      decision_reason: z.string().min(1).max(1000).default('AI proposal requires approval before execution.'),
      approval_mode: z.enum(['manual', 'supervised']).default('manual'),
      session_id: z.string().uuid().optional(),
      order_id: z.string().uuid().optional(),
      metadata: z.record(z.unknown()).default({}),
    }),
  }),
  z.object({
    action: z.literal('list_my_action_requests'),
    payload: z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'executed', 'blocked']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({}),
  }),
  z.object({
    action: z.literal('approve_action_request'),
    payload: z.object({
      request_id: z.string().uuid(),
      decision_reason: z.string().min(1).max(1000).default('Approved for later execution by bounded gateway.'),
    }),
  }),
  z.object({
    action: z.literal('reject_action_request'),
    payload: z.object({
      request_id: z.string().uuid(),
      decision_reason: z.string().min(1).max(1000),
    }),
  }),
])

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

async function writeAudit(supabase: ReturnType<typeof createClient>, input: {
  requestId: string
  userId: string
  action: string
  status: string
  input?: unknown
  output?: unknown
  reason?: string
  idempotencyKey?: string | null
  latencyMs?: number
}) {
  const { error } = await supabase.from('ai_orchestrator_audit_logs').insert({
    request_id: input.requestId,
    user_id: input.userId,
    action: input.action,
    persona: null,
    tool: null,
    mode: 'approval',
    risk: 'medium',
    decision: input.status === 'success' ? 'allow' : 'deny',
    status: input.status,
    reason: input.reason || null,
    input_redacted: redact(input.input || {}),
    output_redacted: input.output === undefined ? null : redact(input.output),
    latency_ms: input.latencyMs || null,
    idempotency_key: input.idempotencyKey || null,
  })
  if (error) console.warn('[ai-approval:audit]', error.message)
}

async function getUserRole(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return String(data?.role || 'customer')
}

function canReview(role: string) {
  return role === 'admin'
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
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const idempotencyKey = req.headers.get('idempotency-key')

  try {
    const body = await req.json()
    const parsed = RequestSchema.parse(body)
    const role = await getUserRole(supabase, userId)

    if (parsed.action === 'create_action_request') {
      const requestHash = await sha256({ userId, action: parsed.action, payload: parsed.payload })
      if (idempotencyKey) {
        const { data: existing, error: existingError } = await supabase
          .from('ai_action_requests')
          .select('*')
          .eq('user_id', userId)
          .contains('metadata', { idempotency_key: idempotencyKey })
          .maybeSingle()
        if (existingError) throw existingError
        if (existing) return json({ success: true, action: parsed.action, data: existing, idempotent: true })
      }

      const { data, error } = await supabase.from('ai_action_requests').insert({
        request_id: requestId,
        session_id: parsed.payload.session_id || null,
        order_id: parsed.payload.order_id || null,
        user_id: userId,
        action_type: parsed.payload.action_type,
        action_payload: redact(parsed.payload.action_payload),
        status: 'pending',
        approval_mode: parsed.payload.approval_mode,
        decision_reason: parsed.payload.decision_reason,
        metadata: {
          ...parsed.payload.metadata,
          source: 'ai-approval-gateway',
          idempotency_key: idempotencyKey || null,
          request_hash: requestHash,
          executable: false,
        },
      }).select('*').single()
      if (error) throw error

      const responseBody = { success: true, action: parsed.action, data }
      await writeAudit(supabase, { requestId, userId, action: parsed.action, status: 'success', input: parsed.payload, output: responseBody, idempotencyKey, latencyMs: Date.now() - startedAt })
      return json(responseBody)
    }

    if (parsed.action === 'list_my_action_requests') {
      let query = supabase
        .from('ai_action_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parsed.payload.limit)

      if (role !== 'admin') query = query.eq('user_id', userId)
      if (parsed.payload.status) query = query.eq('status', parsed.payload.status)

      const { data, error } = await query
      if (error) throw error
      const responseBody = { success: true, action: parsed.action, data }
      await writeAudit(supabase, { requestId, userId, action: parsed.action, status: 'success', input: parsed.payload, output: { count: data?.length || 0 }, idempotencyKey, latencyMs: Date.now() - startedAt })
      return json(responseBody)
    }

    if (parsed.action === 'approve_action_request' || parsed.action === 'reject_action_request') {
      if (!canReview(role)) {
        const responseBody = { success: false, error: 'Only admin can approve or reject AI action requests' }
        await writeAudit(supabase, { requestId, userId, action: parsed.action, status: 'error', input: parsed.payload, output: responseBody, reason: 'forbidden', idempotencyKey, latencyMs: Date.now() - startedAt })
        return json(responseBody, 403)
      }

      const nextStatus = parsed.action === 'approve_action_request' ? 'approved' : 'rejected'
      const { data, error } = await supabase.from('ai_action_requests').update({
        status: nextStatus,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        decision_reason: parsed.payload.decision_reason,
      }).eq('id', parsed.payload.request_id).eq('status', 'pending').select('*').single()
      if (error) throw error

      const responseBody = { success: true, action: parsed.action, data, executable: false }
      await writeAudit(supabase, { requestId, userId, action: parsed.action, status: 'success', input: parsed.payload, output: responseBody, idempotencyKey, latencyMs: Date.now() - startedAt })
      return json(responseBody)
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    console.error('[ai-approval]', requestId, redact(error.message || 'Unknown error'))
    if (error instanceof z.ZodError) return json({ success: false, request_id: requestId, error: 'Invalid request body', details: error.issues }, 400)
    await writeAudit(supabase, { requestId, userId, action: 'unknown', status: 'error', output: { error: error.message || 'Unknown error' }, idempotencyKey, latencyMs: Date.now() - startedAt })
    return json({ success: false, request_id: requestId, error: error.message || 'Unknown error' }, 400)
  }
})
