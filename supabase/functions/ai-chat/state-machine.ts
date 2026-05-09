import type { ChatContext, ChatState } from './types.ts';

export function getMissingSlots(slots: ChatContext): string[] {
  const missing: string[] = [];
  if (!slots.category) missing.push('category');
  if (!slots.description) missing.push('description');
  // Accept either GPS location OR text location (e.g., "quận 7")
  if (!slots.location && !slots.location_text) missing.push('location');
  if (!slots.urgency) missing.push('urgency');
  if (!slots.preferred_time) missing.push('preferred_time');
  if (!slots.customer_confirmation) missing.push('customer_confirmation');
  return missing;
}

export function chooseState(context: ChatContext, missingSlots: string[]): ChatState {
  if (context.risk_flags?.includes('safety') && context.urgency === 'emergency') return 'escalated';
  if (!context.category || !context.description) return 'problem_capture';

  // Only require location + at least one of (urgency, preferred_time) before diagnosis
  const hasLocation = !missingSlots.includes('location');
  const hasTimeInfo = !missingSlots.includes('urgency') || !missingSlots.includes('preferred_time');

  if (!hasLocation) return 'slot_filling';
  // If we have category + description + location, we can proceed even without time
  // (time defaults to "sớm nhất có thể")
  if (!hasTimeInfo && !context.urgency && !context.preferred_time) return 'slot_filling';

  if (!context.diagnosis) return 'diagnosis';
  if (!context.quote) return 'quote';
  if (!context.customer_confirmation) return 'confirmation';
  return 'order_creation';
}

