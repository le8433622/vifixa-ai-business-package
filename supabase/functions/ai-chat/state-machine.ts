import type { ChatContext, ChatState } from './types.ts';

export function getMissingSlots(slots: ChatContext): string[] {
  const missing: string[] = [];
  if (!slots.category) missing.push('category');
  if (!slots.description) missing.push('description');
  if (!slots.location) missing.push('location');
  if (!slots.urgency) missing.push('urgency');
  if (!slots.preferred_time) missing.push('preferred_time');
  if (!slots.customer_confirmation) missing.push('customer_confirmation');
  return missing;
}

export function chooseState(context: ChatContext, missingSlots: string[]): ChatState {
  if (context.risk_flags?.includes('safety') && context.urgency === 'emergency') return 'escalated';
  if (!context.category || !context.description) return 'problem_capture';
  if (missingSlots.some(slot => ['location', 'urgency', 'preferred_time'].includes(slot))) return 'slot_filling';
  if (!context.diagnosis) return 'diagnosis';
  if (!context.quote) return 'quote';
  if (!context.customer_confirmation) return 'confirmation';
  return 'order_creation';
}
