import type { AutonomyEvaluation, AutonomyPolicy, ChatContext } from './types.ts';

const DEFAULT_POLICY: AutonomyPolicy = {
  mode: 'autonomous',
  min_confidence: 0.6,
  max_auto_order_value: 2_000_000,
  allow_safety_risk: false,
};

function getEstimatedPrice(context: ChatContext): number {
  const quote = context.quote as { estimated_price?: number } | undefined;
  return typeof quote?.estimated_price === 'number' ? quote.estimated_price : 0;
}

export async function resolveAutonomyPolicy(supabase: any, category?: string): Promise<AutonomyPolicy> {
  try {
    const { data, error } = await supabase
      .from('ai_autonomy_policies')
      .select('mode,min_confidence,max_auto_order_value,allow_safety_risk')
      .eq('is_active', true)
      .or(`scope_type.eq.global,scope_value.eq.${category || 'general'}`)
      .order('scope_type', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return DEFAULT_POLICY;

    return {
      mode: data.mode || DEFAULT_POLICY.mode,
      min_confidence: Number(data.min_confidence ?? DEFAULT_POLICY.min_confidence),
      max_auto_order_value: Number(data.max_auto_order_value ?? DEFAULT_POLICY.max_auto_order_value),
      allow_safety_risk: Boolean(data.allow_safety_risk),
    };
  } catch (error) {
    console.error('Failed to resolve autonomy policy; using default policy:', error);
    return DEFAULT_POLICY;
  }
}

export function evaluateAutonomy(context: ChatContext, policy: AutonomyPolicy = DEFAULT_POLICY): AutonomyEvaluation {
  const riskFlags = context.risk_flags || [];
  const confidence = context.confidence || 0;
  const estimatedPrice = getEstimatedPrice(context);

  if (!policy.allow_safety_risk && riskFlags.includes('safety')) {
    return { decision: 'blocked', reason: 'safety_risk_requires_human', policy };
  }

  if (policy.mode === 'manual') {
    return { decision: 'requires_approval', reason: 'manual_mode_requires_human_approval', policy };
  }

  if (policy.mode === 'supervised') {
    return { decision: 'requires_approval', reason: 'supervised_mode_requires_human_approval', policy };
  }

  if (confidence < policy.min_confidence) {
    return { decision: 'requires_approval', reason: 'confidence_below_auto_threshold', policy };
  }

  if (estimatedPrice > policy.max_auto_order_value) {
    return { decision: 'requires_approval', reason: 'estimated_price_above_auto_threshold', policy };
  }

  return { decision: 'execute', reason: 'autonomous_policy_allows_execution', policy };
}

export async function createApprovalRequest(
  supabase: any,
  input: {
    requestId: string;
    userId: string;
    sessionId: string;
    actionType: string;
    context: ChatContext;
    evaluation: AutonomyEvaluation;
  },
) {
  const { data: existing } = await supabase
    .from('ai_action_requests')
    .select('id,status')
    .eq('session_id', input.sessionId)
    .eq('request_id', input.requestId)
    .eq('action_type', input.actionType)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from('ai_action_requests')
    .insert({
      request_id: input.requestId,
      session_id: input.sessionId,
      user_id: input.userId,
      action_type: input.actionType,
      action_payload: {
        category: input.context.category,
        description: input.context.description,
        location: input.context.location,
        urgency: input.context.urgency,
        preferred_time: input.context.preferred_time,
        quote: input.context.quote,
        media_urls: input.context.media_urls || [],
      },
      status: input.evaluation.decision === 'blocked' ? 'blocked' : 'pending',
      approval_mode: input.evaluation.policy.mode,
      decision_reason: input.evaluation.reason,
      metadata: {
        risk_flags: input.context.risk_flags || [],
        confidence: input.context.confidence || null,
        conversion_stage: input.context.conversion_stage || null,
      },
    })
    .select('id,status')
    .single();

  if (error) throw error;
  return data;
}
