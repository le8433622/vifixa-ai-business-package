import type { ChatContext } from './types.ts';

export function fallbackDiagnosis(context: ChatContext) {
  const severity = context.urgency || 'medium';
  return {
    diagnosis: `Chẩn đoán sơ bộ cho ${context.category}: ${context.description}`,
    severity,
    recommended_skills: [context.category || 'general'],
    confidence: 0.55,
  };
}

export function fallbackQuote(context: ChatContext) {
  const basePrices: Record<string, number> = {
    air_conditioning: 450000,
    plumbing: 280000,
    electricity: 250000,
    appliance: 320000,
    camera: 500000,
  };
  const urgencyMultiplier = context.urgency === 'emergency' ? 1.5 : context.urgency === 'high' ? 1.25 : 1;
  const base = basePrices[context.category || ''] || 300000;
  const estimatedPrice = Math.round(base * urgencyMultiplier / 10000) * 10000;
  return {
    estimated_price: estimatedPrice,
    price_breakdown: [
      { item: 'Công kiểm tra/xử lý dự kiến', cost: estimatedPrice },
    ],
    confidence: 0.52,
  };
}
