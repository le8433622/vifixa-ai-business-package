import { createAIProvider } from '../_shared/ai-provider.ts';
import type { ChatContext, ChatSlots } from './types.ts';
import { fallbackDiagnosis, fallbackQuote } from './pricing-fallback.ts';

export async function maybeRunDiagnosisAndQuote(context: ChatContext) {
  if (!context.category || !context.description || !context.location || context.risk_flags?.includes('safety')) {
    return context;
  }

  const ai = createAIProvider(crypto.randomUUID());
  const next = { ...context };

  if (!next.diagnosis) {
    try {
      next.diagnosis = await ai.diagnose({
        category: next.category!,
        description: next.description!,
        media_urls: next.media_urls,
        location: next.location!,
      });
    } catch (error) {
      console.error('AI diagnosis failed; using guarded fallback:', error);
      next.diagnosis = fallbackDiagnosis(next);
      next.risk_flags = [...new Set([...(next.risk_flags || []), 'ai_fallback'])];
    }
  }

  if (!next.quote && next.diagnosis) {
    try {
      const diagnosis = next.diagnosis as { diagnosis?: string; severity?: ChatSlots['urgency'] };
      next.quote = await ai.estimatePrice({
        category: next.category!,
        diagnosis: diagnosis.diagnosis || next.description!,
        location: next.location!,
        urgency: (diagnosis.severity || next.urgency || 'medium') as 'low' | 'medium' | 'high' | 'emergency',
      });
    } catch (error) {
      console.error('AI pricing failed; using guarded fallback:', error);
      next.quote = fallbackQuote(next);
      next.risk_flags = [...new Set([...(next.risk_flags || []), 'ai_fallback'])];
    }
  }

  return next;
}
