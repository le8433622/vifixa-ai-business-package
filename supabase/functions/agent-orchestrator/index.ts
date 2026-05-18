// Agent Orchestrator Edge Function
// Core of Agent OS: Goal → Plan → Policy → Execute → Audit → Observe
// POST /functions/v1/agent-orchestrator
// AI-powered: NVIDIA NIM (primary) + OpenRouter (fallback)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { createAIProvider, AIProvider } from '../_shared/ai-provider.ts'
import { serviceRegistry } from '../_shared/service-registry.ts'

// ========== TYPES ==========

interface OrchestratorRequest {
  message: string
  persona: 'customer' | 'worker' | 'admin'
  media_urls?: string[]
  session_id?: string
}

interface ActionDef {
  id: string
  domain: string
  name: string
  description: string
  handler: string
  autonomy_level: number
  risk_level: string
  confirm_message: string | null
  persona: string[]
}

interface PlanStep {
  action_id: string
  input: Record<string, unknown>
  description: string
}

interface AgentPlan {
  goal_type: string
  goal_description: string
  service_id: string | null
  steps: PlanStep[]
}

interface DetectedService {
  id: string
  name: string
  confidence: number
}

// ========== SERVE ==========

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Verify auth
    let user: { id: string; email?: string }
    try {
      const auth = await verifyAuth(req)
      user = auth
    } catch {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/agent-orchestrator', '')

    // POST / — Create goal + plan + execute
    if (path === '' && req.method === 'POST') {
      return await handleCreateGoal(req, supabase, user)
    }

    // POST /execute — Execute a single action
    if (path === '/execute' && req.method === 'POST') {
      return await handleExecuteAction(req, supabase, user)
    }

    // POST /approve — Approve/reject a pending approval
    if (path === '/approve' && req.method === 'POST') {
      return await handleApproval(req, supabase, user)
    }

    // GET /runs — Get runs for user
    if (path === '/runs' && req.method === 'GET') {
      return await handleGetRuns(req, supabase, user)
    }

    // GET /approvals — Get pending approvals for user
    if (path === '/approvals' && req.method === 'GET') {
      return await handleGetApprovals(req, supabase, user)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] agent-orchestrator error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

// ========== OBSERVE PHASE ==========

async function observePhase(
  supabase: any,
  userId: string,
  persona: string,
  plan: AgentPlan,
  results: Array<{ step_index: number; action_id: string; status: string; output?: any; error?: string }>
) {
  // 1. Save memory facts from execution results
  for (const r of results) {
    if (r.status === 'completed' && r.output) {
      try {
        const factKey = `action.${r.action_id.replace('.', '_')}.result`
        const factValue = typeof r.output === 'string' ? r.output : JSON.stringify(r.output).slice(0, 500)
        await supabase
          .from('companion_memories')
          .upsert({
            user_id: userId,
            key: factKey,
            value: factValue,
            category: 'ai_learned',
            importance: 2,
            source: 'agent_orchestrator',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: ['user_id', 'key'] })
      } catch (e) {
        console.warn('[VIFIXA] Memory save failed:', e)
      }
    }
  }

  // 2. Save goal completion memory
  try {
    await supabase
      .from('companion_memories')
      .upsert({
        user_id: userId,
        key: `goal.${plan.goal_type}.completed`,
        value: `Đã hoàn thành: ${plan.goal_description}`,
        category: 'conversation',
        importance: 3,
        source: 'agent_orchestrator',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: ['user_id', 'key'] })
  } catch (e) {
    console.warn('[VIFIXA] Goal memory save failed:', e)
  }

  // 3. Suggest next best action
  let nextAction: string | null = null
  if (persona === 'customer') {
    const serviceActions = ['repair', 'cleaning', 'delivery', 'massage']
    if (serviceActions.includes(plan.goal_type)) {
      nextAction = 'schedule_maintenance'
    }
  } else if (persona === 'worker') {
    if (plan.goal_type === 'find_jobs') {
      nextAction = 'accept_job'
    }
  }

  return { memories_saved: true, next_action: nextAction }
}

// ========== GUARDRAILS ==========

async function enforceGuardrails(supabase: any, userId: string, persona: string): Promise<{ allowed: boolean; reason?: string }> {
  // Rate limit: max 20 runs per user per minute
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { count: recentRuns } = await supabase
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('started_at', oneMinAgo)

  if ((recentRuns || 0) >= 20) {
    return { allowed: false, reason: 'Rate limit: max 20 runs/phút' }
  }

  // Concurrency: max 3 concurrent active goals
  const { count: activeGoals } = await supabase
    .from('agent_goals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  if ((activeGoals || 0) >= 3) {
    return { allowed: false, reason: 'Concurrency limit: max 3 goals đang chạy' }
  }

  return { allowed: true }
}

// ========== PERSONALITY CONTEXT ==========

async function loadPersonalityContext(supabase: any, userId: string, persona: string): Promise<Record<string, unknown>> {
  try {
    const [profileRes, companionRes, memoriesRes] = await Promise.all([
      supabase.from('profiles').select('full_name, phone, address, role').eq('id', userId).single(),
      supabase.from('companion_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('companion_memories').select('key, value, category, importance').eq('user_id', userId).order('importance', { ascending: false }).limit(30),
    ])

    const profile = profileRes.data
    const companion = companionRes.data
    const memories = memoriesRes.data || []

    const context: Record<string, unknown> = {
      userId, persona,
      name: companion?.full_name || profile?.full_name || 'Người dùng',
      phone: profile?.phone, address: profile?.address,
      tone: companion?.tone || 'warm',
      formality: companion?.formality || 'casual',
      empathy_level: companion?.empathy_level || 3,
      autonomy_level: companion?.autonomy_level || 2,
      interests: companion?.interests || [],
      goals: companion?.goals || [],
      recent_memories: memories.slice(0, 10).map((m: any) => ({ key: m.key, value: m.value })),
      device_count: 0, completed_orders: 0,
    }

    if (persona === 'customer') {
      const { count: deviceCount } = await supabase.from('device_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', userId).eq('status', 'completed')
      context.device_count = deviceCount || 0
      context.completed_orders = orderCount || 0
    } else if (persona === 'worker') {
      const { data: worker } = await supabase.from('workers').select('skills, trust_score, avg_earnings, rating_avg').eq('user_id', userId).single()
      if (worker) {
        context.skills = worker.skills
        context.trust_score = worker.trust_score
        context.avg_earnings = worker.avg_earnings
        context.rating = worker.rating_avg
      }
    }

    return context
  } catch (err) {
    console.warn('[VIFIXA] Failed to load personality context:', err)
    return { userId, persona }
  }
}

async function handleCreateGoal(req: Request, supabase: any, user: { id: string }): Promise<Response> {
  const body: OrchestratorRequest = await req.json()
  const { message, persona, media_urls } = body

  if (!message || !persona) {
    return jsonResponse({ error: 'Missing message or persona' }, 400)
  }

  // 0. Enforce guardrails (rate + concurrency limits)
  const guard = await enforceGuardrails(supabase, user.id, persona)
  if (!guard.allowed) {
    return jsonResponse({ error: guard.reason }, 429)
  }

  // 1. Detect intent + service
  const { intent, service, services } = await detectIntentAndService(supabase, message, persona)

  // 1.5 Load personality context for personalized AI
  const personalityContext = await loadPersonalityContext(supabase, user.id, persona)

  // 2. Create goal
  const { data: goal, error: goalError } = await supabase
    .from('agent_goals')
    .insert({
      user_id: user.id,
      persona,
      goal_type: intent.type,
      goal_description: message,
      service_id: service?.id || null,
      status: 'active',
    })
    .select()
    .single()

  if (goalError || !goal) {
    console.error('[VIFIXA] Goal creation failed:', goalError)
    return jsonResponse({ error: 'Failed to create goal' }, 500)
  }

  // 3. Generate plan using AI
  const plan = await generatePlan(supabase, message, persona, intent, service, services, media_urls, personalityContext)

  // 4. Start agent run
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      goal_id: goal.id,
      user_id: user.id,
      persona,
      plan: plan.steps,
      current_step: 0,
      status: 'running',
    })
    .select()
    .single()

  if (runError || !run) {
    console.error('[VIFIXA] Run creation failed:', runError)
    return jsonResponse({ error: 'Failed to start run' }, 500)
  }

  // 5. Execute steps sequentially
  const results = await executePlanSteps(supabase, run.id, plan.steps, user.id, persona)

  // 6. Update run status
  const allComplete = results.every(r => r.status === 'completed')
  const hasApproval = results.some(r => r.status === 'waiting_approval')
  const hasError = results.some(r => r.status === 'failed')

  let runStatus = 'running'
  if (hasError) runStatus = 'failed'
  else if (hasApproval) runStatus = 'running' // paused for approval
  else if (allComplete) runStatus = 'completed'

  await supabase
    .from('agent_runs')
    .update({
      status: runStatus,
      completed_at: runStatus === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', run.id)

  // 7. Update goal status
  if (runStatus === 'completed') {
    await supabase
      .from('agent_goals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', goal.id)

    // 8. Observe + Update phase: save memory, suggest next action
    try {
      await observePhase(supabase, user.id, persona, plan, results)
    } catch (obsErr) {
      console.warn('[VIFIXA] Observe phase failed:', obsErr)
    }
  }

  return jsonResponse({
    goal_id: goal.id,
    run_id: run.id,
    goal_type: plan.goal_type,
    goal_description: plan.goal_description,
    service_id: plan.service_id,
    plan: plan.steps,
    results,
    status: runStatus,
    needs_approval: hasApproval,
  })
}

async function handleExecuteAction(req: Request, supabase: any, user: { id: string }): Promise<Response> {
  const body = await req.json()
  const { action_id, input, run_id, step_index } = body

  if (!action_id || !input) {
    return jsonResponse({ error: 'Missing action_id or input' }, 400)
  }

  // Get action definition
  const { data: action, error: actionError } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', action_id)
    .eq('is_active', true)
    .single()

  if (actionError || !action) {
    return jsonResponse({ error: `Action not found: ${action_id}` }, 404)
  }

  // Get persona from run or request
  const { data: run } = await supabase
    .from('agent_runs')
    .select('persona')
    .eq('id', run_id)
    .single()

  const persona = run?.persona || body.persona || 'customer'

  // Check policy
  const { data: effectiveLevel } = await supabase
    .rpc('get_effective_autonomy_level', { p_action_id: action_id, p_persona: persona })

  if (effectiveLevel === null || effectiveLevel === undefined || effectiveLevel < action.autonomy_level) {
    return jsonResponse({
      error: 'Action requires approval',
      action_id,
      confirm_message: action.confirm_message,
      risk_level: action.risk_level,
    }, 403)
  }

  // Execute action
  const result = await executeSingleAction(supabase, action, input, user.id)

  // Log step if run_id provided
  if (run_id !== undefined && step_index !== undefined) {
    await supabase
      .from('agent_steps')
      .update({
        status: result.success ? 'completed' : 'failed',
        action_input: input,
        action_output: result.output,
        error_message: result.error,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('run_id', run_id)
      .eq('step_index', step_index)
  }

  return jsonResponse({
    success: result.success,
    output: result.output,
    error: result.error,
    next_action_suggestion: result.next_action_suggestion,
  })
}

async function handleApproval(req: Request, supabase: any, user: { id: string }): Promise<Response> {
  const body = await req.json()
  const { approval_id, decision, reason } = body

  if (!approval_id || !decision) {
    return jsonResponse({ error: 'Missing approval_id or decision' }, 400)
  }

  if (decision !== 'approved' && decision !== 'rejected') {
    return jsonResponse({ error: 'Decision must be approved or rejected' }, 400)
  }

  // Update approval
  const { data: approval, error: approvalError } = await supabase
    .from('agent_approvals')
    .update({
      status: decision,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejected_reason: decision === 'rejected' ? reason : null,
    })
    .eq('id', approval_id)
    .eq('user_id', user.id)
    .select('step_id')
    .single()

  if (approvalError || !approval) {
    return jsonResponse({ error: 'Approval not found or unauthorized' }, 404)
  }

  // Update step status
  if (decision === 'approved') {
    await supabase
      .from('agent_steps')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', approval.step_id)
  } else {
    await supabase
      .from('agent_steps')
      .update({ status: 'failed', error_message: 'User rejected', completed_at: new Date().toISOString() })
      .eq('id', approval.step_id)
  }

  return jsonResponse({
    success: true,
    approval_id,
    decision,
  })
}

async function handleGetRuns(req: Request, supabase: any, user: { id: string }): Promise<Response> {
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '10')

  const { data: runs, error } = await supabase
    .from('agent_runs')
    .select('*, agent_goals(goal_type, goal_description)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    return jsonResponse({ error: 'Failed to fetch runs' }, 500)
  }

  return jsonResponse({ runs: runs || [] })
}

async function handleGetApprovals(req: Request, supabase: any, user: { id: string }): Promise<Response> {
  const { data: approvals, error } = await supabase
    .from('agent_approvals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return jsonResponse({ error: 'Failed to fetch approvals' }, 500)
  }

  return jsonResponse({ approvals: approvals || [] })
}

// ========== INTENT DETECTION ==========

interface DetectedService {
  id: string
  name: string
  confidence: number
}

async function detectIntentAndService(supabase: any, message: string, persona: string) {
  const lower = message.toLowerCase()

  // Service detection from registry
  const { data: services } = await supabase
    .from('agent_actions')
    .select('id, name, description')
    .eq('domain', 'service')
    .eq('is_active', true)

  // Simple keyword-based intent detection (can be enhanced with AI)
  let intentType = 'general_chat'
  let detectedServices: DetectedService[] = []

  // Account intents
  if (lower.includes('đổi địa chỉ') || lower.includes('update address') || lower.includes('địa chỉ mới')) {
    intentType = 'update_address'
  } else if (lower.includes('đổi số') || lower.includes('đổi điện thoại') || lower.includes('phone')) {
    intentType = 'update_phone'
  } else if (lower.includes('đổi mật khẩu') || lower.includes('password')) {
    intentType = 'update_password'
  }
  // Service intents — multi-service detection
  else {
    const serviceMatches: DetectedService[] = []

    // Repair (existing)
    if (lower.includes('sửa') || lower.includes('hỏng') || lower.includes('hư') || lower.includes('máy lạnh') || lower.includes('điện') || lower.includes('nước')) {
      serviceMatches.push({ id: 'repair', name: 'Sửa chữa', confidence: 0.9 })
    }
    // Cleaning
    if (lower.includes('dọn') || lower.includes('vệ sinh') || lower.includes('lau') || lower.includes('sạch') || lower.includes('tổng vệ sinh')) {
      if (lower.includes('tổng vệ sinh') || lower.includes('deep')) {
        serviceMatches.push({ id: 'deep_cleaning', name: 'Tổng vệ sinh', confidence: 0.9 })
      } else {
        serviceMatches.push({ id: 'cleaning', name: 'Dọn dẹp', confidence: 0.9 })
      }
    }
    // Delivery
    if (lower.includes('giao hàng') || lower.includes('ship') || lower.includes('chuyển đồ') || lower.includes('mua hộ') || lower.includes('giao')) {
      serviceMatches.push({ id: 'delivery', name: 'Giao hàng', confidence: 0.9 })
    }
    // Moving
    if (lower.includes('chuyển nhà') || lower.includes('chuyển văn phòng') || lower.includes('dọn nhà')) {
      serviceMatches.push({ id: 'moving', name: 'Chuyển nhà', confidence: 0.9 })
    }
    // Elder Care
    if (lower.includes('người già') || lower.includes('chăm sóc người') || lower.includes('điều dưỡng')) {
      serviceMatches.push({ id: 'elder_care', name: 'Chăm sóc người già', confidence: 0.9 })
    }
    // Child Care
    if (lower.includes('trông trẻ') || lower.includes('giữ trẻ') || lower.includes('babysit')) {
      serviceMatches.push({ id: 'child_care', name: 'Trông trẻ', confidence: 0.9 })
    }
    // Pet Care
    if (lower.includes('chó') || lower.includes('mèo') || lower.includes('thú cưng') || lower.includes('pet') || lower.includes('tắm chó') || lower.includes('cắt lông')) {
      serviceMatches.push({ id: 'pet_care', name: 'Chăm thú cưng', confidence: 0.9 })
    }
    // Tutoring
    if (lower.includes('gia sư') || lower.includes('học') || lower.includes('dạy') || lower.includes('kèm') || lower.includes('luyện thi')) {
      serviceMatches.push({ id: 'tutoring', name: 'Gia sư', confidence: 0.9 })
    }
    // Massage
    if (lower.includes('massage') || lower.includes('bấm huyệt') || lower.includes('thư giãn') || lower.includes('vật lý trị liệu')) {
      serviceMatches.push({ id: 'massage', name: 'Massage', confidence: 0.9 })
    }

    // Multi-service intent
    if (serviceMatches.length > 1) {
      intentType = 'multi_service'
      detectedServices = serviceMatches
    } else if (serviceMatches.length === 1) {
      intentType = serviceMatches[0].id
      detectedServices = serviceMatches
    }
  }

  // Worker intents
  if (intentType === 'general_chat') {
    if (lower.includes('có đơn') || lower.includes('việc nào') || lower.includes('job')) {
      intentType = 'find_jobs'
    } else if (lower.includes('nhận') || lower.includes('accept') || lower.includes('đồng ý làm')) {
      intentType = 'accept_job'
    } else if (lower.includes('từ chối') || lower.includes('decline') || lower.includes('không làm')) {
      intentType = 'decline_job'
    } else if (lower.includes('bắt đầu') || lower.includes('start') || lower.includes('đến nơi')) {
      intentType = 'start_job'
    } else if (lower.includes('hoàn thành') || lower.includes('xong') || lower.includes('done') || lower.includes('complete')) {
      intentType = 'complete_job'
    } else if (lower.includes('rút tiền') || lower.includes('payout') || lower.includes('lĩnh tiền')) {
      intentType = 'request_payout'
    } else if (lower.includes('thu nhập') || lower.includes('tiền') || lower.includes('earnings')) {
      intentType = 'income_review'
    }
  }

  // Admin intents
  if (intentType === 'general_chat') {
    if (lower.includes('tóm tắt') || lower.includes('daily') || lower.includes('báo cáo')) {
      intentType = 'daily_brief'
    } else if (lower.includes('kyc') || lower.includes('duyệt')) {
      intentType = 'review_kyc'
    } else if (lower.includes('khóa') || lower.includes('lock')) {
      intentType = 'lock_user'
    } else if (lower.includes('mở khóa') || lower.includes('unlock')) {
      intentType = 'unlock_user'
    } else if (lower.includes('giải quyết') || lower.includes('tranh chấp') || lower.includes('resolve')) {
      intentType = 'resolve_dispute'
    } else if (lower.includes('hoàn tiền') || lower.includes('refund') || lower.includes('approve refund')) {
      intentType = 'approve_refund'
    } else if (lower.includes('fraud') || lower.includes('bất thường') || lower.includes('anomaly')) {
      intentType = 'detect_fraud'
    }
  }

  return { intent: { type: intentType }, services: detectedServices, service: detectedServices[0] || null }
}

// ========== PLAN GENERATION ==========

async function generatePlan(
  supabase: any,
  message: string,
  persona: string,
  intent: { type: string },
  service: { id: string } | null,
  services?: DetectedService[],
  media_urls?: string[],
  personalityContext?: Record<string, unknown>
): Promise<AgentPlan> {
  const { data: actions } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('is_active', true)

  if (!actions || actions.length === 0) {
    return { goal_type: intent.type, goal_description: message, service_id: service?.id || null, steps: [] }
  }

  // Load memories for personalization
  let memories: Array<{ key: string; value: string }> = []
  if (personalityContext) {
    try {
      const { data: memData } = await supabase
        .from('companion_memories')
        .select('key, value')
        .eq('user_id', (personalityContext as any).userId)
        .order('importance', { ascending: false })
        .limit(20)
      memories = memData || []
    } catch { /* ignore */ }
  }

  // Try AI-powered plan generation first
  try {
    const ai = createAIProvider()
    const aiPlan = await ai.generatePlan({
      message,
      persona,
      availableActions: actions.map((a: any) => ({ id: a.id, name: a.name, description: a.description })),
      memories,
      services: services?.map(s => ({ id: s.id, name: s.name })),
    })

    if (aiPlan && aiPlan.steps && aiPlan.steps.length > 0 && aiPlan.confidence > 0.5) {
      console.log('[VIFIXA] AI plan generated with confidence:', aiPlan.confidence)
      return {
        goal_type: aiPlan.goal_type || intent.type,
        goal_description: aiPlan.goal_description || message,
        service_id: service?.id || null,
        steps: aiPlan.steps.map(s => ({
          action_id: s.action_id,
          input: s.input || {},
          description: s.description || '',
        })),
      }
    }
  } catch (err) {
    console.warn('[VIFIXA] AI plan generation failed, falling back to rule-based:', err)
  }

  // Fallback to rule-based plan
  if (intent.type === 'multi_service' && services && services.length > 1) {
    const steps = buildMultiServicePlan(services, persona, actions, media_urls)
    return { goal_type: 'multi_service', goal_description: message, service_id: services[0].id, steps }
  }

  const steps = buildPlanForIntent(intent.type, persona, service, actions, media_urls)
  return { goal_type: intent.type, goal_description: message, service_id: service?.id || null, steps }
}

function buildMultiServicePlan(
  services: DetectedService[],
  persona: string,
  actions: ActionDef[],
  media_urls?: string[]
): PlanStep[] {
  const steps: PlanStep[] = []

  for (const svc of services) {
    const serviceSteps = buildPlanForIntent(svc.id, persona, { id: svc.id }, actions, media_urls)
    steps.push(...serviceSteps.map(s => ({
      ...s,
      description: `[${svc.name}] ${s.description}`,
    })))
  }

  return steps
}

function buildPlanForIntent(
  intentType: string,
  persona: string,
  service: { id: string } | null,
  actions: ActionDef[],
  media_urls?: string[]
): PlanStep[] {
  const actionMap = new Map<string, ActionDef>()
  for (const a of actions) actionMap.set(a.id, a)

  switch (intentType) {
    case 'update_address':
      return [
        { action_id: 'account.update_address', input: {}, description: 'Cập nhật địa chỉ' },
        { action_id: 'memory.save_fact', input: { key: 'home_address', value: '', importance: 3 }, description: 'Lưu địa chỉ mới vào memory' },
      ]

    case 'update_phone':
      return [
        { action_id: 'account.update_phone', input: {}, description: 'Đổi số điện thoại' },
      ]

    case 'update_password':
      return [
        { action_id: 'account.update_password', input: {}, description: 'Đổi mật khẩu' },
      ]

    case 'repair_device':
      return buildServicePlan('repair', service, media_urls)

    case 'cleaning':
      return buildServicePlan('cleaning', service, media_urls)

    case 'deep_cleaning':
      return buildServicePlan('deep_cleaning', service, media_urls)

    case 'delivery':
      return buildServicePlan('delivery', service, media_urls)

    case 'moving':
      return buildServicePlan('moving', service, media_urls)

    case 'elder_care':
      return buildServicePlan('elder_care', service, media_urls)

    case 'child_care':
      return buildServicePlan('child_care', service, media_urls)

    case 'pet_care':
      return buildServicePlan('pet_care', service, media_urls)

    case 'tutoring':
      return buildServicePlan('tutoring', service, media_urls)

    case 'massage':
      return buildServicePlan('massage', service, media_urls)

    case 'find_jobs':
      return [
        { action_id: 'map.find_providers', input: {}, description: 'Tìm đơn gần nhất theo kỹ năng' },
      ]

    case 'accept_job':
      return [
        { action_id: 'worker.accept_job', input: {}, description: 'Nhận đơn' },
        { action_id: 'map.route', input: {}, description: 'Tính lộ trình đến khách' },
        { action_id: 'wallet.show_balance', input: {}, description: 'Cập nhật thu nhập' },
      ]

    case 'decline_job':
      return [
        { action_id: 'worker.decline_job', input: {}, description: 'Từ chối đơn' },
        { action_id: 'map.find_providers', input: {}, description: 'Tìm đơn khác' },
      ]

    case 'start_job':
      return [
        { action_id: 'worker.start_job', input: {}, description: 'Bắt đầu công việc' },
        { action_id: 'map.track_worker', input: {}, description: 'Cập nhật vị trí realtime cho khách' },
      ]

    case 'complete_job':
      return [
        { action_id: 'worker.complete_job', input: {}, description: 'Hoàn thành công việc' },
        { action_id: 'memory.save_fact', input: { key: 'last_completed_work', value: '', importance: 3 }, description: 'Lưu lịch sử công việc' },
        { action_id: 'wallet.show_balance', input: {}, description: 'Cập nhật thu nhập' },
      ]

    case 'request_payout':
      return [
        { action_id: 'worker.request_payout', input: {}, description: 'Yêu cầu rút tiền' },
      ]

    case 'income_review':
      return [
        { action_id: 'wallet.show_balance', input: {}, description: 'Xem thu nhập' },
      ]

    case 'daily_brief':
      return [
        { action_id: 'admin.daily_brief', input: {}, description: 'Tạo báo cáo tổng quan' },
      ]

    case 'review_kyc':
      return [
        { action_id: 'admin.review_kyc', input: {}, description: 'Duyệt KYC' },
      ]

    case 'lock_user':
      return [
        { action_id: 'admin.lock_user', input: {}, description: 'Khóa tài khoản người dùng' },
      ]

    case 'unlock_user':
      return [
        { action_id: 'admin.unlock_user', input: {}, description: 'Mở khóa tài khoản người dùng' },
      ]

    case 'resolve_dispute':
      return [
        { action_id: 'admin.resolve_dispute', input: {}, description: 'Phân tích và giải quyết tranh chấp' },
      ]

    case 'approve_refund':
      return [
        { action_id: 'admin.approve_refund', input: {}, description: 'Duyệt hoàn tiền' },
      ]

    case 'detect_fraud':
      return [
        { action_id: 'admin.detect_anomaly', input: {}, description: 'Phát hiện bất thường' },
      ]

    default:
      // General chat — no actions needed
      return []
  }
}

function buildServicePlan(
  serviceId: string,
  service: { id: string } | null,
  media_urls?: string[]
): PlanStep[] {
  return [
    { action_id: `${serviceId}.detect`, input: { service_id: serviceId }, description: 'Nhận diện dịch vụ' },
    { action_id: `${serviceId}.quote`, input: { service_id: serviceId }, description: 'Báo giá' },
    { action_id: `${serviceId}.book`, input: { service_id: serviceId, images: media_urls || [] }, description: 'Tạo đơn (cần xác nhận)' },
  ]
}

// ========== PLAN EXECUTION ==========

async function executePlanSteps(
  supabase: any,
  runId: string,
  steps: PlanStep[],
  userId: string,
  persona: string
): Promise<Array<{ step_index: number; action_id: string; status: string; output?: any; error?: string }>> {
  const results: Array<{ step_index: number; action_id: string; status: string; output?: any; error?: string }> = []
  let previousOutput: any = null

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // Merge previous output into current step input
    if (previousOutput && step.input) {
      step.input = { ...previousOutput, ...step.input }
    } else if (previousOutput) {
      step.input = { ...previousOutput }
    }

    // Get action definition
    const { data: action } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('id', step.action_id)
      .single()

    if (!action) {
      results.push({ step_index: i, action_id: step.action_id, status: 'failed', error: 'Action not found' })
      continue
    }

    if (!action.persona.includes(persona)) {
      results.push({ step_index: i, action_id: step.action_id, status: 'skipped', error: 'Unauthorized for persona' })
      continue
    }

    // Check policy
    const { data: effectiveLevel } = await supabase
      .rpc('get_effective_autonomy_level', { p_action_id: step.action_id, p_persona: persona })

    const needsApproval = effectiveLevel === null || effectiveLevel === undefined || effectiveLevel < action.autonomy_level

    // Create step record (with correct step_id for approvals)
    const { data: stepRecord } = await supabase
      .from('agent_steps')
      .insert({
        run_id: runId,
        step_index: i,
        action_id: step.action_id,
        action_input: step.input,
        status: needsApproval ? 'waiting_approval' : 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (needsApproval && stepRecord) {
      await supabase
        .from('agent_approvals')
        .insert({
          step_id: stepRecord.id,
          user_id: userId,
          action_id: step.action_id,
          action_summary: action.confirm_message || `Thực hiện: ${action.name}`,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'pending',
        })

      results.push({ step_index: i, action_id: step.action_id, status: 'waiting_approval' })
      break
    }

    // Auto execute
    const result = await executeSingleAction(supabase, action, step.input, userId)

    // Track previous output for chaining
    if (result.success && result.output) {
      previousOutput = result.output
    }

    await supabase
      .from('agent_steps')
      .update({
        status: result.success ? 'completed' : 'failed',
        action_output: result.output,
        error_message: result.error,
        completed_at: new Date().toISOString(),
      })
      .eq('run_id', runId)
      .eq('step_index', i)

    results.push({ step_index: i, action_id: step.action_id, status: result.success ? 'completed' : 'failed', output: result.output, error: result.error })

    if (!result.success) {
      break
    }
  }

  return results
}

async function executeSingleAction(
  supabase: any,
  action: ActionDef,
  input: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; output?: any; error?: string; next_action_suggestion?: string }> {
  try {
    // Route to appropriate handler based on action type
    if (action.handler.startsWith('POST ') || action.handler.startsWith('GET ') || action.handler.startsWith('DELETE ')) {
      // HTTP handler — call Edge Function
      const [method, path] = action.handler.split(' ')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: method !== 'GET' ? JSON.stringify(input) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || `HTTP ${response.status}` }
      }

      return { success: true, output: data }
    }

    if (action.handler.includes('RPC')) {
      // Supabase RPC call
      const rpcName = action.handler.replace(' RPC', '').trim()
      const { data, error } = await supabase.rpc(rpcName, input)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, output: data }
    }

    if (action.handler === 'serviceRegistry.detect()') {
      const query = (input as any).query || (input as any).message || ''
      const matched = serviceRegistry.detect(query)
      if (matched.length > 0) {
        return { success: true, output: { services: matched.map(s => ({ id: s.id, name: s.name, icon: s.icon, keywords: s.keywords })) } }
      }
      // Fallback to DB
      const { data: services } = await supabase
        .from('agent_actions')
        .select('id, name, description, pricing_rules')
        .eq('domain', 'service')
        .eq('is_active', true)
      const lower = query.toLowerCase()
      const dbMatched = (services || []).filter((s: any) => {
        const name = s.name?.toLowerCase() || ''
        return lower.split(' ').some((word: string) => word.length > 1 && name.includes(word))
      }).map((s: any) => ({ id: s.id.replace('.detect', ''), name: s.name, score: 10 }))
      return { success: true, output: { services: dbMatched } }
    }

    if (action.handler === 'serviceRegistry.collectSlots()') {
      const serviceId = (input as any).service_id || ''
      const svc = serviceRegistry.get(serviceId)
      if (svc) {
        const required = svc.diagnosisFields.filter(f => f.required).map(f => ({ key: f.key, label: f.label, type: f.type, options: f.options }))
        const questions = svc.questions || []
        return { success: true, output: { service: serviceId, name: svc.name, missing_fields: required, questions, pricing: svc.typicalPricing } }
      }
      return { success: true, output: { missing_fields: [], questions: ['Mô tả vấn đề của bạn'], service: serviceId } }
    }

    if (action.handler === 'Supabase Realtime') {
      try {
        const channel = supabase.channel(`agent-${userId}-${Date.now()}`)
        const subscribeResult = await channel
          .on('presence', { event: 'sync' }, () => {})
          .subscribe((status: string) => {
            if (status !== 'SUBSCRIBED') {
              console.warn('[VIFIXA] Realtime status:', status)
            }
          })
        return { success: true, output: { channel: `agent-${userId}`, subscribed: true } }
      } catch (err: any) {
        return { success: false, error: `Realtime error: ${err.message}` }
      }
    }

    if (action.handler === 'auth.updateUser()') {
      try {
        const updates: Record<string, unknown> = {}
        if ((input as any).password) updates.password = (input as any).password
        if ((input as any).email) updates.email = (input as any).email
        if ((input as any).data) updates.data = (input as any).data

        if (Object.keys(updates).length === 0) {
          return { success: false, error: 'No fields to update' }
        }

        const { error } = await supabase.auth.admin.updateUserById(userId, updates)
        if (error) {
          return { success: false, error: error.message }
        }
        return { success: true, output: { message: 'Auth updated successfully', fields: Object.keys(updates) } }
      } catch (err: any) {
        return { success: false, error: `Auth update failed: ${err.message}` }
      }
    }

    // Unknown handler
    return { success: false, error: `Unknown handler: ${action.handler}` }
  } catch (error: any) {
    return { success: false, error: error.message || 'Execution failed' }
  }
}
