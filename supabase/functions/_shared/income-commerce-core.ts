// Vifixa Income Commerce Core
// Self-correcting profit-first commerce primitives.
// This file is intentionally pure TypeScript so Edge Functions can import it safely.

export type Currency = 'VND' | 'USD'

export type IncomeSourceType =
  | 'asset'
  | 'skill'
  | 'time'
  | 'location'
  | 'relationship'
  | 'inventory'
  | 'service_capacity'

export type OfferStatus = 'draft' | 'testing' | 'active' | 'paused' | 'killed' | 'scaled'
export type DemandStatus = 'new' | 'qualified' | 'matched' | 'converted' | 'lost'
export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'stopped'
export type CommerceDecision = 'test' | 'scale' | 'pause' | 'kill' | 'revise'

export interface MoneyAmount {
  amount: number
  currency: Currency
}

export interface IncomeSource {
  id: string
  partnerId: string
  type: IncomeSourceType
  title: string
  description: string
  location?: { lat: number; lng: number; address?: string }
  capabilities: string[]
  availability?: Record<string, unknown>
  trustScore?: number
  createdAt?: string
}

export interface Offer {
  id: string
  partnerId: string
  incomeSourceId: string
  title: string
  description: string
  targetCustomer: string
  price: MoneyAmount
  costEstimate: UnitCostInput
  status: OfferStatus
  evidence?: string[]
  constraints?: Record<string, unknown>
}

export interface Demand {
  id: string
  userId?: string
  rawText: string
  normalizedNeed: string
  location?: { lat: number; lng: number; address?: string }
  budget?: MoneyAmount
  constraints?: string[]
  status: DemandStatus
}

export interface UnitCostInput {
  revenue: number
  cogs?: number
  adSpend?: number
  fulfillmentCost?: number
  paymentFee?: number
  refundCost?: number
  opsCost?: number
  platformFee?: number
  inventoryRiskCost?: number
  cashflowDelayCost?: number
}

export interface ProfitResult {
  revenue: number
  totalCost: number
  netProfit: number
  profitMargin: number
  isPositive: boolean
  currency: Currency
  breakdown: Array<{ key: string; amount: number }>
}

export interface RiskInput {
  refundRisk?: number
  fraudRisk?: number
  supplyRisk?: number
  deliveryRisk?: number
  trustRisk?: number
  legalRisk?: number
}

export interface RiskAdjustedScore {
  expectedProfit: number
  riskPenalty: number
  learningValue: number
  cashflowPenalty: number
  score: number
}

export interface ExperimentVariant {
  id: string
  name: string
  hypothesis: string
  offerPatch?: Partial<Offer>
  channel?: string
  budgetLimit?: number
}

export interface ExperimentMetrics {
  impressions?: number
  clicks?: number
  inquiries?: number
  orders?: number
  paidOrders?: number
  revenue?: number
  cost?: number
  refunds?: number
  complaints?: number
}

export interface ExperimentResult {
  variantId: string
  metrics: ExperimentMetrics
  profit: ProfitResult
  confidence: number
}

export type LossDriver =
  | 'low_conversion'
  | 'high_cac'
  | 'thin_margin'
  | 'high_refund'
  | 'high_fulfillment_cost'
  | 'weak_trust'
  | 'wrong_audience'
  | 'weak_offer'
  | 'supply_problem'
  | 'unknown'

export interface LossDiagnosis {
  isLoss: boolean
  drivers: LossDriver[]
  explanation: string
}

export interface CorrectionHypothesis {
  id: string
  driver: LossDriver
  hypothesis: string
  expectedImpact: number
  costToTest: number
  risk: number
  suggestedAction: string
}

export interface LearningRecord {
  id: string
  context: Record<string, unknown>
  hypothesis: string
  result: Record<string, unknown>
  detectedErrors: LossDriver[]
  correctionsApplied: string[]
  finalDecision: CommerceDecision
  lesson: string
  createdAt: string
}

function positiveNumber(value: number | undefined): number {
  return Number.isFinite(value) && value! > 0 ? value! : 0
}

export function calculateUnitProfit(input: UnitCostInput, currency: Currency = 'VND'): ProfitResult {
  const revenue = positiveNumber(input.revenue)
  const costs = {
    cogs: positiveNumber(input.cogs),
    adSpend: positiveNumber(input.adSpend),
    fulfillmentCost: positiveNumber(input.fulfillmentCost),
    paymentFee: positiveNumber(input.paymentFee),
    refundCost: positiveNumber(input.refundCost),
    opsCost: positiveNumber(input.opsCost),
    platformFee: positiveNumber(input.platformFee),
    inventoryRiskCost: positiveNumber(input.inventoryRiskCost),
    cashflowDelayCost: positiveNumber(input.cashflowDelayCost),
  }
  const breakdown = Object.entries(costs).map(([key, amount]) => ({ key, amount }))
  const totalCost = breakdown.reduce((sum, item) => sum + item.amount, 0)
  const netProfit = revenue - totalCost
  const profitMargin = revenue > 0 ? netProfit / revenue : -1
  return { revenue, totalCost, netProfit, profitMargin, isPositive: netProfit > 0, currency, breakdown }
}

export function calculateRiskAdjustedScore(input: {
  expectedProfit: number
  risk?: RiskInput
  learningValue?: number
  cashflowDelayCost?: number
}): RiskAdjustedScore {
  const risk = input.risk || {}
  const riskPenalty =
    positiveNumber(risk.refundRisk) * 0.25 +
    positiveNumber(risk.fraudRisk) * 0.3 +
    positiveNumber(risk.supplyRisk) * 0.15 +
    positiveNumber(risk.deliveryRisk) * 0.1 +
    positiveNumber(risk.trustRisk) * 0.15 +
    positiveNumber(risk.legalRisk) * 0.4

  const learningValue = positiveNumber(input.learningValue)
  const cashflowPenalty = positiveNumber(input.cashflowDelayCost)
  const score = input.expectedProfit + learningValue - riskPenalty - cashflowPenalty
  return { expectedProfit: input.expectedProfit, riskPenalty, learningValue, cashflowPenalty, score }
}

export function diagnoseLoss(metrics: ExperimentMetrics, profit: ProfitResult): LossDiagnosis {
  const drivers: LossDriver[] = []
  const clicks = positiveNumber(metrics.clicks)
  const impressions = positiveNumber(metrics.impressions)
  const inquiries = positiveNumber(metrics.inquiries)
  const paidOrders = positiveNumber(metrics.paidOrders)
  const cost = positiveNumber(metrics.cost)
  const refunds = positiveNumber(metrics.refunds)
  const complaints = positiveNumber(metrics.complaints)

  const ctr = impressions > 0 ? clicks / impressions : 0
  const inquiryRate = clicks > 0 ? inquiries / clicks : 0
  const paidRate = inquiries > 0 ? paidOrders / inquiries : 0
  const cac = paidOrders > 0 ? cost / paidOrders : cost
  const refundRate = paidOrders > 0 ? refunds / paidOrders : 0

  if (!profit.isPositive) {
    if (ctr > 0.02 && paidRate < 0.05) drivers.push('weak_offer')
    if (inquiryRate < 0.02 && clicks > 30) drivers.push('low_conversion')
    if (cac > profit.revenue * 0.3) drivers.push('high_cac')
    if (profit.profitMargin > -0.05 && profit.profitMargin < 0.1) drivers.push('thin_margin')
    if (refundRate > 0.08) drivers.push('high_refund')
    if (complaints > 0) drivers.push('weak_trust')
    if (drivers.length === 0) drivers.push('unknown')
  }

  return {
    isLoss: !profit.isPositive,
    drivers,
    explanation: drivers.length
      ? `Offer/campaign is negative. Main drivers: ${drivers.join(', ')}.`
      : 'Profit is positive or there is not enough data to diagnose loss.',
  }
}

export function generateCorrectionHypotheses(diagnosis: LossDiagnosis): CorrectionHypothesis[] {
  const hypotheses: CorrectionHypothesis[] = []
  const add = (driver: LossDriver, hypothesis: string, suggestedAction: string, expectedImpact = 0.2, costToTest = 1, risk = 0.1) => {
    hypotheses.push({ id: crypto.randomUUID(), driver, hypothesis, expectedImpact, costToTest, risk, suggestedAction })
  }

  for (const driver of diagnosis.drivers) {
    if (driver === 'high_cac') {
      add(driver, 'Nếu đổi creative/audience thì CAC sẽ giảm.', 'Test 3 creative mới và 2 audience hẹp hơn.', 0.25, 2, 0.15)
    } else if (driver === 'thin_margin') {
      add(driver, 'Nếu tạo bundle/upsell thì AOV và margin sẽ tăng.', 'Tạo combo 2-3 món hoặc gói premium.', 0.3, 1, 0.1)
    } else if (driver === 'high_refund') {
      add(driver, 'Nếu mô tả/ảnh thật hơn và lọc khách trước mua thì hoàn hàng giảm.', 'Thêm ảnh thật, điều kiện rõ, xác nhận trước khi giao.', 0.25, 1, 0.1)
    } else if (driver === 'low_conversion') {
      add(driver, 'Nếu giảm rủi ro mua bằng cam kết/cọc nhỏ thì conversion tăng.', 'Test cọc nhỏ, cam kết hoàn tiền, bằng chứng xã hội.', 0.2, 1, 0.1)
    } else if (driver === 'weak_trust') {
      add(driver, 'Nếu tăng bằng chứng tin cậy thì tỷ lệ chốt tăng.', 'Thêm xác minh, ảnh/video thật, review, hotline.', 0.25, 1, 0.05)
    } else if (driver === 'weak_offer') {
      add(driver, 'Nếu offer cụ thể hơn theo nỗi đau thì paid conversion tăng.', 'Viết lại offer theo kết quả, giá rõ, deadline rõ.', 0.2, 1, 0.1)
    } else {
      add(driver, 'Nếu tách biến và test nhỏ thì tìm được nguyên nhân âm.', 'Chạy test A/B: giá, headline, audience, channel.', 0.15, 1, 0.2)
    }
  }

  return hypotheses.sort((a, b) => (b.expectedImpact / Math.max(b.costToTest + b.risk, 0.1)) - (a.expectedImpact / Math.max(a.costToTest + a.risk, 0.1)))
}

export function decideCommerceAction(input: {
  profit: ProfitResult
  confidence: number
  riskScore?: number
  minimumMargin?: number
  minimumConfidenceToScale?: number
}): { decision: CommerceDecision; reason: string } {
  const minimumMargin = input.minimumMargin ?? 0.12
  const minimumConfidenceToScale = input.minimumConfidenceToScale ?? 0.75
  const riskScore = input.riskScore ?? 0

  if (input.confidence < 0.5) {
    return { decision: 'test', reason: 'Not enough confidence; run small experiment first.' }
  }
  if (!input.profit.isPositive) {
    return { decision: 'revise', reason: 'Expected profit is negative; diagnose and correct before scaling.' }
  }
  if (input.profit.profitMargin < minimumMargin) {
    return { decision: 'revise', reason: 'Profit is positive but margin is too thin.' }
  }
  if (riskScore > 0.6) {
    return { decision: 'pause', reason: 'Risk is too high; pause and reduce risk before scaling.' }
  }
  if (input.confidence >= minimumConfidenceToScale) {
    return { decision: 'scale', reason: 'Positive profit, acceptable margin, and sufficient confidence.' }
  }
  return { decision: 'test', reason: 'Positive signal but needs more data.' }
}

export function createLearningRecord(input: {
  hypothesis: string
  context: Record<string, unknown>
  result: Record<string, unknown>
  diagnosis: LossDiagnosis
  correctionsApplied: string[]
  finalDecision: CommerceDecision
}): LearningRecord {
  return {
    id: crypto.randomUUID(),
    context: input.context,
    hypothesis: input.hypothesis,
    result: input.result,
    detectedErrors: input.diagnosis.drivers,
    correctionsApplied: input.correctionsApplied,
    finalDecision: input.finalDecision,
    lesson: buildLesson(input),
    createdAt: new Date().toISOString(),
  }
}

function buildLesson(input: {
  hypothesis: string
  diagnosis: LossDiagnosis
  correctionsApplied: string[]
  finalDecision: CommerceDecision
}): string {
  if (!input.diagnosis.isLoss && input.finalDecision === 'scale') {
    return `Hypothesis worked and can be scaled: ${input.hypothesis}`
  }
  if (input.correctionsApplied.length > 0) {
    return `Loss drivers ${input.diagnosis.drivers.join(', ')} were addressed by: ${input.correctionsApplied.join('; ')}.`
  }
  return `Hypothesis needs revision: ${input.hypothesis}. Drivers: ${input.diagnosis.drivers.join(', ')}.`
}
