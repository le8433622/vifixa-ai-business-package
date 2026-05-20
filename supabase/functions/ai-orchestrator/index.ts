import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('healthcheck'),
    payload: z.object({}).default({}),
  }),
  z.object({
    action: z.literal('list_action_catalog'),
    payload: z.object({
      persona: PersonaSchema.default('customer'),
    }).default({}),
  }),
  z.object({
    action: z.literal('load_my_context'),
    payload: z.object({
      include_profile: z.boolean().default(true),
      include_recent_runs: z.boolean().default(true),
      limit: z.number().int().min(1).max(50).default(10),
    }).default({}),
  }),
  z.object({
    action: z.literal('inspect_intent'),
    payload: z.object({
      persona: PersonaSchema.default('customer'),
      message: z.string().min(1).max(4000),
    }),
  }),
  z.object({
    action: z.literal('plan_readonly'),
    payload: z.object({
      persona: PersonaSchema.default('customer'),
      message: z.string().min(1).max(4000),
      max_steps: z.number().int().min(1).max(8).default(5),
    }),
  }),
  z.object({
    action: z.literal('preview_action_policy'),
    payload: z.object({
      persona: PersonaSchema.default('customer'),
      action_ids: z.array(z.string().min(1)).min(1).max(20),
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
  }
  return value
}

function getCatalogForPersona(persona: z.infer<typeof PersonaSchema>) {
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

function suggestActions(intent: string, persona: z.infer<typeof PersonaSchema>) {
  const catalog = getCatalogForPersona(persona)
  const allow = (ids: string[]) => catalog.filter((item) => ids.includes(item.id))

  if (intent === 'income_offer') return allow(['commerce.create_income_source', 'commerce.create_offer'])
  if (intent === 'demand_capture') return allow(['commerce.create_demand', 'commerce.suggest_match'])
  if (intent === 'payment_review') return allow(['payment.list_my_payment_intents', 'payment.get_my_wallets', 'payment.list_my_ledger_entries', 'payment.list_my_transactions'])
  if (intent === 'profit_review') return allow(['payment.list_my_transactions', 'payment.list_my_ledger_entries'])
  return allow(['service.detect', 'service.collect_slots'])
}

function evaluatePolicy(actionId: string, persona: z.infer<typeof PersonaSchema>) {
  const action = SAFE_ACTION_CATALOG.find((item) => item.id === actionId)
  if (!action) {
    return {
      action_id: actionId,
      allowed: false,
      mode: 'blocked',
      reason: 'Action is not registered in AI-Orchestrator v1 catalog.',
    }
  }

  if (!action.personas.includes(persona)) {
    return {
      action_id: actionId,
      allowed: false,
      mode: 'blocked',
      reason: `Persona ${persona} is not allowed for this action.`,
    }
  }

  return {
    action_id: actionId,
    allowed: action.mode === 'read_only' || action.mode === 'proposal_only',
    mode: action.mode,
    risk: action.risk,
    reason: action.mode === 'read_only'
      ? 'Read-only action can be previewed safely.'
      : 'Proposal-only action requires a bounded gateway and explicit execution step later.',
  }
}

function buildReadonlyPlan(message: string, persona: z.infer<typeof PersonaSchema>, maxSteps: number) {
  const intent = classifyIntent(message)
  const suggested = suggestActions(intent, persona)
  const steps = suggested.slice(0, maxSteps).map((action, index) => ({
    step_index: index,
    title: `Preview ${action.id}`,
    action_id: action.id,
    domain: action.domain,
    mode: action.mode,
    policy: evaluatePolicy(action.id, persona),
  }))

  return {
    readonly: true,
    intent,
    goal_description: message,
    confidence: steps.length > 0 ? 0.72 : 0.45,
    steps,
  }
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

  try {
    const parsed = RequestSchema.parse(await req.json())

    if (parsed.action === 'healthcheck') {
      return json({
        success: true,
        action: parsed.action,
        request_id: requestId,
        data: {
          gateway: 'ai-orchestrator',
          version: 'v1-readonly',
          readonly: true,
          latency_ms: Date.now() - startedAt,
        },
      })
    }

    if (parsed.action === 'list_action_catalog') {
      return json({
        success: true,
        action: parsed.action,
        request_id: requestId,
        data: {
          persona: parsed.payload.persona,
          actions: getCatalogForPersona(parsed.payload.persona),
        },
      })
    }

    if (parsed.action === 'load_my_context') {
      const result: Record<string, unknown> = { user_id: userId, warnings: [] }

      if (parsed.payload.include_profile) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, created_at')
          .eq('id', userId)
          .maybeSingle()
        if (error) (result.warnings as string[]).push('profile_unavailable')
        else result.profile = profile
      }

      if (parsed.payload.include_recent_runs) {
        const { data: runs, error } = await supabase
          .from('agent_runs')
          .select('id, persona, status, current_step, started_at, completed_at')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(parsed.payload.limit)
        if (error) (result.warnings as string[]).push('agent_runs_unavailable')
        else result.recent_runs = runs
      }

      return json({ success: true, action: parsed.action, request_id: requestId, data: result })
    }

    if (parsed.action === 'inspect_intent') {
      const intent = classifyIntent(parsed.payload.message)
      return json({
        success: true,
        action: parsed.action,
        request_id: requestId,
        data: {
          readonly: true,
          persona: parsed.payload.persona,
          intent,
          suggested_actions: suggestActions(intent, parsed.payload.persona),
          message_preview: redact(parsed.payload.message),
        },
      })
    }

    if (parsed.action === 'plan_readonly') {
      const plan = buildReadonlyPlan(parsed.payload.message, parsed.payload.persona, parsed.payload.max_steps)
      return json({ success: true, action: parsed.action, request_id: requestId, data: plan })
    }

    if (parsed.action === 'preview_action_policy') {
      return json({
        success: true,
        action: parsed.action,
        request_id: requestId,
        data: {
          persona: parsed.payload.persona,
          decisions: parsed.payload.action_ids.map((id) => evaluatePolicy(id, parsed.payload.persona)),
        },
      })
    }

    return json({ success: false, error: 'Unsupported action' }, 400)
  } catch (error: any) {
    console.error('[ai-orchestrator]', requestId, redact(error.message || 'Unknown error'))
    if (error instanceof z.ZodError) {
      return json({ success: false, request_id: requestId, error: 'Invalid request body', details: error.issues }, 400)
    }
    return json({ success: false, request_id: requestId, error: error.message || 'Unknown error' }, 400)
  }
})
