// AI Chat Support Edge Function
// Maintains stateful sessions with full JWT auth, message persistence, and booking

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider, ChatInput, ChatOutput } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ChatRequest {
  session_id?: string;
  message: string;
  context?: {
    category?: string;
    location?: string;
    device_info?: any;
  };
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 30 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const { session_id, message, context } = body;

    if (!message) {
      return jsonResponse({ error: 'Missing message' }, 400);
    }

    let sessionId = session_id;
    let sessionContext = context || {};
    let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        return jsonResponse({ error: 'Session not found' }, 404);
      }

      sessionContext = session.context || {};

      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (chatMessages) {
        messages = chatMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }));
      }
    } else {
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          session_type: 'support',
          status: 'active',
          context: sessionContext,
        })
        .select()
        .single();

      if (createError || !newSession) {
        return jsonResponse({ error: `Failed to create session: ${createError?.message}` }, 500);
      }

      sessionId = newSession.id;
    }

    messages.push({ role: 'user', content: message });

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

    const requestId = crypto.randomUUID();
    const ai = createAIProvider(requestId);
    const chatInput: ChatInput = {
      session_id: sessionId!,
      messages,
      context: {
        ...sessionContext,
        user_id: user.id,
      },
    };

    const chatOutput = await ai.chat(chatInput);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: chatOutput.reply,
      metadata: {
        actions: chatOutput.actions,
        next_step: chatOutput.next_step,
      },
    });

    let orderId: string | undefined;

    if (chatOutput.session_complete) {
      await supabase
        .from('chat_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      try {
        const category = sessionContext.category || 'general';
        const description = `Chat session: ${message}`;
        const location = sessionContext.location || { lat: 10.762622, lng: 106.660172 };

        // Use user's JWT token so customer-requests creates the order for the real customer.
        const userToken = req.headers.get('Authorization')?.replace('Bearer ', '');

        const orderResponse = await fetch(`${supabaseUrl}/functions/v1/customer-requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken || supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            category,
            description,
            location,
            chat_session_id: sessionId,
          }),
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          orderId = orderData.request_id;
        } else {
          console.error('Order creation failed in ai-chat:', await orderResponse.text());
        }
      } catch (orderError) {
        console.error('Error creating order:', orderError);
      }
    }

    return jsonResponse({
      session_id: sessionId,
      reply: chatOutput.reply,
      actions: chatOutput.actions,
      next_step: chatOutput.next_step,
      session_complete: chatOutput.session_complete,
      order_id: orderId,
    });
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Chat error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
