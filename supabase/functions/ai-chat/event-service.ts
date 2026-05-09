import type { ChatContext, ChatEventType, ChatIntent, ChatState } from './types.ts';

export interface ChatEventDerivationInput {
  isNewSession: boolean;
  state: ChatState;
  intent?: ChatIntent;
  missingSlots: string[];
  context: ChatContext;
  orderId?: string;
}

export interface ChatEventLogInput extends ChatEventDerivationInput {
  requestId: string;
  userId: string;
  sessionId: string;
}

export function deriveChatEventTypes(input: ChatEventDerivationInput): ChatEventType[] {
  const events = new Set<ChatEventType>();

  if (input.isNewSession) events.add('chat_started');
  if (input.state === 'slot_filling') events.add('slot_updated');
  if (input.context.quote) events.add('quote_shown');
  if (input.context.customer_confirmation && input.intent === 'confirm') events.add('confirmation_clicked');
  if (input.state === 'confirmation') events.add('confirmation_shown');
  if (input.state === 'approval_required') events.add('approval_requested');
  if (input.state === 'handoff' && input.orderId) events.add('order_created');
  if (input.state === 'escalated') events.add('escalated');

  return [...events];
}

export function buildChatEventRows(input: ChatEventLogInput) {
  return deriveChatEventTypes(input).map(eventType => ({
    session_id: input.sessionId,
    user_id: input.userId,
    event_type: eventType,
    state: input.state,
    intent: input.intent || null,
    metadata: {
      request_id: input.requestId,
      order_id: input.orderId || null,
      category: input.context.category || null,
      missing_slots: input.missingSlots,
      risk_flags: input.context.risk_flags || [],
      confidence: input.context.confidence || null,
      conversion_stage: input.context.conversion_stage || null,
    },
  }));
}

export async function logChatEvents(supabase: any, input: ChatEventLogInput) {
  const rows = buildChatEventRows(input);
  if (rows.length === 0) return;

  const { error } = await supabase.from('chat_events').insert(rows);
  if (error) {
    console.error('Failed to log chat events:', {
      sessionId: input.sessionId,
      requestId: input.requestId,
      events: rows.map(row => row.event_type),
      error,
    });
  }
}
