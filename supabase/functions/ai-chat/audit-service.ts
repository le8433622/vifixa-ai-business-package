export async function logChatDecision(
  supabase: any,
  redactPII: (value: unknown) => unknown,
  requestId: string,
  userId: string,
  sessionId: string,
  input: unknown,
  output: unknown,
  orderId?: string,
) {
  const { error } = await supabase.from('ai_logs').insert({
    order_id: orderId || null,
    user_id: userId,
    request_id: requestId,
    agent_type: 'chat',
    input: redactPII(input),
    output: redactPII(output),
  });

  if (error) {
    console.error('Failed to log chat AI decision:', { sessionId, requestId, error });
  }
}
