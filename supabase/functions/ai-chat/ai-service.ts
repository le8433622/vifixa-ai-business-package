import { createAICore } from '../_shared/ai-core.ts'
import type { ChatContext, ChatSlots } from './types.ts'
import { fallbackDiagnosis, fallbackQuote } from './pricing-fallback.ts'

export async function maybeRunDiagnosisAndQuote(supabase: any, context: ChatContext, userId?: string) {
  if (!context.category || !context.description || !context.location || context.risk_flags?.includes('safety')) {
    return context
  }

  const ai = createAICore(supabase, { requestId: crypto.randomUUID(), userId })
  const next = { ...context }

  if (!next.diagnosis) {
    const result = await ai.diagnose({
      category: next.category!,
      description: next.description!,
      media_urls: next.media_urls,
      location: next.location,
    })
    if (result.success) {
      next.diagnosis = result.data
      next.risk_flags = [...new Set([...(next.risk_flags || []), ...(result.data.confidence < 0.5 ? ['low_confidence_diagnosis'] : [])])]
    } else {
      console.error('AI diagnosis failed; using fallback:', result.error)
      next.diagnosis = fallbackDiagnosis(next)
      next.risk_flags = [...new Set([...(next.risk_flags || []), 'ai_fallback'])]
    }
  }

  if (!next.quote && next.diagnosis) {
    const diagnosis = next.diagnosis as { diagnosis?: string; severity?: ChatSlots['urgency'] }
    const result = await ai.estimatePrice({
      category: next.category!,
      diagnosis: diagnosis.diagnosis || next.description!,
      location: next.location,
      urgency: (diagnosis.severity || next.urgency || 'medium') as 'low' | 'medium' | 'high' | 'emergency',
    })
    if (result.success) {
      next.quote = result.data
    } else {
      console.error('AI pricing failed; using fallback:', result.error)
      next.quote = fallbackQuote(next)
      next.risk_flags = [...new Set([...(next.risk_flags || []), 'ai_fallback'])]
    }
  }

  return next
}