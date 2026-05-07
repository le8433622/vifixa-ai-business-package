// AI Chat Support Edge Function
// Handles multi-turn conversations with customers for service diagnosis and booking

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider, ChatInput, ChatOutput } from '../_shared/ai-provider.ts';

// CORS headers
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

interface ChatResponse {
  session_id: string;
  reply: string;
  actions?: ChatOutput['actions'];
  next_step?: string;
  session_complete?: boolean;
  order_id?: string; // Return order_id if created
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: ChatRequest;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session_id, message, context } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create chat session
    let sessionId = session_id;
    let sessionContext = context || {};
    let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

    if (sessionId) {
      // Fetch existing session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      sessionContext = session.context || {};
      
      // Fetch previous messages
      const { data: chatMessages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!msgError && chatMessages) {
        messages = chatMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }));
      }
    } else {
      // Create new session
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
        throw new Error(`Failed to create session: ${createError?.message}`);
      }

      sessionId = newSession.id;
    }

    // Add user message to history
    messages.push({ role: 'user', content: message });

    // Save user message to database
    const { error: saveMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      });

    if (saveMsgError) {
      console.error('Failed to save user message:', saveMsgError);
    }

    // Call AI provider
    const ai = createAIProvider();
    const chatInput: ChatInput = {
      session_id: sessionId!,
      messages: messages,
      context: {
        ...sessionContext,
        user_id: user.id,
      },
    };

    const chatOutput = await ai.chat(chatInput);

    // Save AI response to database
    const { error: saveAIError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId!,
        role: 'assistant',
        content: chatOutput.reply,
        metadata: {
          actions: chatOutput.actions,
          next_step: chatOutput.next_step,
        },
      });

    if (saveAIError) {
      console.error('Failed to save AI message:', saveAIError);
    }

    let orderId: string | undefined = undefined;

    // Update session if complete
    if (chatOutput.session_complete) {
      await supabase
        .from('chat_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId!);

      // Try to create order automatically
      try {
        const category = sessionContext.category || 'general';
        const description = `Chat session: ${message}`;
        const location = sessionContext.location || { lat: 10.762622, lng: 106.660172 };

        const orderResponse = await fetch(`${supabaseUrl}/functions/v1/customer-requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category,
            description,
            location,
            chat_session_id: sessionId,
          }),
        });

        const orderData = await orderResponse.json();

        if (orderResponse.ok && orderData.request_id) {
          orderId = orderData.request_id;
        } else {
          console.error('Failed to create order:', orderData.error);
        }
      } catch (orderError) {
        console.error('Error creating order:', orderError);
      }
    }

    // Return response
    const response: ChatResponse = {
      session_id: sessionId!,
      reply: chatOutput.reply,
      actions: chatOutput.actions,
      next_step: chatOutput.next_step,
      session_complete: chatOutput.session_complete,
      order_id: orderId,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Chat error ===:', error);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
