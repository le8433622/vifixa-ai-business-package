import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import {
  calculateUnitProfit,
  decideCommerceAction,
  diagnoseLoss,
  generateCorrectionHypotheses,
  createLearningRecord,
  type UnitCostInput,
  type ExperimentMetrics,
} from '../_shared/income-commerce-core.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const AnalyzeSchema = z.object({
  offer_id: z.string().uuid().optional(),
  experiment_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  hypothesis: z.string().min(3),
  context: z.record(z.unknown()).default({}),
  costs: z.object({
    revenue: z.number().nonnegative(),
    cogs: z.number().nonnegative().optional(),
    adSpend: z.number().nonnegative().optional(),
    fulfillmentCost: z.number().nonnegative().optional(),
    paymentFee: z.number().nonnegative().optional(),
    refundCost: z.number().nonnegative().optional(),
    opsCost: z.number().nonnegative().optional(),
    platformFee: z.number().nonnegative().optional(),
    inventoryRiskCost: z.number().nonnegative().optional(),
    cashflowDelayCost: z.number().nonnegative().optional(),
  }),
  metrics: z.object({
    impressions: z.number().nonnegative().optional(),
    clicks: z.number().nonnegative().optional(),
    inquiries: z.number().nonnegative().optional(),
    orders: z.number().nonnegative().optional(),
    paidOrders: z.number().nonnegative().optional(),
    revenue: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    refunds: z.number().nonnegative().optional(),
    complaints: z.number().nonnegative().optional(),
  }).default({}),
  confidence: z.number().min(0).max(1).default(0.5),
  risk_score: z.number().min(0).max(1).default(0),
  currency: z.enum(['VND', 'USD']).default('VND'),
  persist: z.boolean().default(true),
})

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) return json({ error: 'Missing Supabase env' }, 500)

  const token = getBearer(req)
  if (!token) return json({ error: 'Missing authorization bearer token' }, 401)

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)
  const ownerId = userData.user.id

  try {
    const parsed = AnalyzeSchema.parse(await req.json())
    const costs = parsed.costs as UnitCostInput
    const metrics = parsed.metrics as ExperimentMetrics

    const profit = calculateUnitProfit(costs, parsed.currency)
    const diagnosis = diagnoseLoss(metrics, profit)
    const corrections = diagnosis.isLoss ? generateCorrectionHypotheses(diagnosis) : []
    const decision = decideCommerceAction({
      profit,
      confidence: parsed.confidence,
      riskScore: parsed.risk_score,
    })
    const learning = createLearningRecord({
      hypothesis: parsed.hypothesis,
      context: parsed.context,
      result: { profit, metrics, decision },
      diagnosis,
      correctionsApplied: [],
      finalDecision: decision.decision,
    })

    let persisted: Record<string, string | null> = {
      profit_record_id: null,
      correction_cycle_id: null,
      learning_record_id: null,
      commerce_decision_id: null,
    }

    if (parsed.persist) {
      const { data: profitRow, error: profitError } = await supabase.from('profit_records').insert({
        owner_id: ownerId,
        offer_id: parsed.offer_id || null,
        experiment_id: parsed.experiment_id || null,
        variant_id: parsed.variant_id || null,
        revenue: profit.revenue,
        total_cost: profit.totalCost,
        net_profit: profit.netProfit,
        profit_margin: profit.profitMargin,
        currency: profit.currency,
        breakdown: profit.breakdown,
        confidence: parsed.confidence,
        metrics,
      }).select('id').single()
      if (profitError) throw profitError
      persisted.profit_record_id = profitRow.id

      if (diagnosis.isLoss) {
        const { data: correctionRow, error: correctionError } = await supabase.from('correction_cycles').insert({
          owner_id: ownerId,
          profit_record_id: profitRow.id,
          loss_drivers: diagnosis.drivers,
          explanation: diagnosis.explanation,
          hypotheses: corrections,
          selected_hypothesis: corrections[0] || {},
          status: 'proposed',
        }).select('id').single()
        if (correctionError) throw correctionError
        persisted.correction_cycle_id = correctionRow.id
      }

      const { data: learningRow, error: learningError } = await supabase.from('learning_records').insert({
        owner_id: ownerId,
        context: learning.context,
        hypothesis: learning.hypothesis,
        result: learning.result,
        detected_errors: learning.detectedErrors,
        corrections_applied: learning.correctionsApplied,
        final_decision: learning.finalDecision,
        lesson: learning.lesson,
      }).select('id').single()
      if (learningError) throw learningError
      persisted.learning_record_id = learningRow.id

      const { data: decisionRow, error: decisionError } = await supabase.from('commerce_decisions').insert({
        owner_id: ownerId,
        offer_id: parsed.offer_id || null,
        experiment_id: parsed.experiment_id || null,
        decision: decision.decision,
        reason: decision.reason,
        risk_score: parsed.risk_score,
        expected_net_profit: profit.netProfit,
        confidence: parsed.confidence,
        created_by: 'ai',
      }).select('id').single()
      if (decisionError) throw decisionError
      persisted.commerce_decision_id = decisionRow.id
    }

    return json({
      success: true,
      data: {
        profit,
        diagnosis,
        corrections,
        decision,
        learning,
        persisted,
      },
    })
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unknown error' }, 400)
  }
})
