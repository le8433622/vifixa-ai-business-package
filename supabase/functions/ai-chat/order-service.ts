import type { ChatContext } from './types.ts';
import { getMissingSlots } from './state-machine.ts';

export function validateOrderCreationContext(context: ChatContext): void {
  const missing = getMissingSlots(context);
  if (missing.length > 0) {
    throw new Error(`Cannot create order from chat. Missing required slots: ${missing.join(', ')}`);
  }
}

export async function createOrderIfConfirmed(
  supabase: any,
  supabaseUrl: string,
  userToken: string,
  userId: string,
  sessionId: string,
  context: ChatContext,
) {
  validateOrderCreationContext(context);

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', userId)
    .eq('chat_session_id', sessionId)
    .maybeSingle();

  if (existingOrder?.id) return existingOrder.id as string;

  const response = await fetch(`${supabaseUrl}/functions/v1/customer-requests`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category: context.category,
      description: context.description,
      media_urls: context.media_urls || [],
      location: context.location,
      chat_session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Order creation failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.request_id as string;
}
