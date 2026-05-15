// 🧠 Vifixa AI Companion Chat Edge Function
// Implements the AI Companion Engine as specified in docs/COMPANION.md
// Now powered by NVIDIA NIM via AICore with action system

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';
import { createAICore } from '../_shared/ai-core.ts';

interface CompanionChatRequest {
  message: string;
  context: {
    user_id: string;
    persona: 'customer' | 'worker' | 'admin';
    session_id?: string; // null = start new session
    media_urls?: string[]; // optional image URLs for diagnosis
  };
}

interface CompanionChatResponse {
  reply: string;
  actions?: Array<{ type: string; label: string }>;
  memory?: {
    new_facts?: Array<{ key: string; value: string; importance: number }>;
  };
  session_id: string;
}

// Simple intent keywords (in production, replace with AI classifier)
const INTENT_KEYWORDS: Record<string, string[]> = {
  diagnose: ['máy lạnh', 'điều hòa', 'tủ lạnh', 'máy giặt', 'lạnh', 'nóng', 'rò rỉ', 'sự cố', 'hỏng', 'không chạy', 'chữa'],
  estimate_price: ['giá', 'báo giá', 'chi phí', 'etra', 'tiền'],
  create_order: ['đặt', 'order', 'tạo đơn', 'gọi thợ', 'đặt lịch'],
  match_worker: ['tìm thợ', 'thợ gần', 'việc làm', 'công việc', 'tìm việc'],
  process_payment: ['thanh toán', 'trả tiền', 'pay', 'vnpay', 'stripe', 'quét mã']
};

function detectIntent(message: string, persona: 'customer' | 'worker' | 'admin'): string {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return intent;
    }
  }
  // Default intents based on persona
  if (persona === 'customer') return 'general_chat';
  if (persona === 'worker') return 'job_search';
  return 'general_inquiry';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse request body
    let body: CompanionChatRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const { message, context } = body;
    if (!message || !context?.user_id || !context?.persona) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Verify the user matches the context
    if (context.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Initialize Supabase client with service role for backend operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize AICore for NVIDIA NIM processing
    const aiCore = createAICore(supabase, {
      userId: user.id,
      requestId: crypto.randomUUID(),
    });

    // Get or create session
    let sessionId = context.session_id;
    let isNewSession = false;

    if (sessionId) {
      // Verify existing session belongs to user
      const { data: session, error: sessionError } = await supabase
        .from('companion_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        // Session not found or doesn't belong to user, create new one
        sessionId = undefined;
      }
    }

    if (!sessionId) {
      // Create new session
      isNewSession = true;
      const { data: newSession, error: createError } = await supabase
        .from('companion_sessions')
        .insert({
          user_id: user.id,
          persona: context.persona,
          context: {
            ...context,
            started_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (createError || !newSession) {
        return jsonResponse({ error: 'Failed to create session' }, 500);
      }

      sessionId = newSession.id;
    }

    // Get user's companion profile and memories
    const { data: companionProfile } = await supabase
      .from('companion_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: memories } = await supabase
      .from('companion_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get user's knowledge (devices for customer, skills for worker, etc.)
    let knowledge = {};
    if (context.persona === 'customer') {
      const { data: devices } = await supabase
        .from('customer_devices')
        .select('*')
        .eq('customer_id', user.id);
      knowledge = { devices: devices || [] };
    } else if (context.persona === 'worker') {
      const { data: skills } = await supabase
        .from('worker_skills')
        .select('*')
        .eq('worker_id', user.id);
      knowledge = { skills: skills || [] };
    }

    // Detect intent
    const intent = detectIntent(message, context.persona);
    
    // Prepare variables for response
    let reply: string = "Xin lỗi, tôi không hiểu. Bạn có thể mô tả rõ hơn không?";
    let actions: Array<{ type: string; label: string }> = [];
    let newFacts: Array<{ key: string; value: string; importance: number }> = [];

    // Handle different intents
    if (intent === 'diagnose') {
      // For diagnosis, we need description and optionally media_urls
      const description = message;
      const mediaUrls = context.media_urls || [];
      
      if (mediaUrls.length > 0) {
        // Use vision model for image-based diagnosis
        const visionResult = await aiCore.analyzeImages({
          imageUrls: mediaUrls,
          description,
          category: 'general' // Could be improved with category detection
        });
        
        if (visionResult.success) {
          const data = visionResult.data;
          reply = `Tôi đã phân tích ảnh:\n\n${data.diagnosis}\n\nMức độ:${data.severity}\nKỹ năng cần:${data.recommended_skills?.join(', ') || 'Chưa xác định'}\nĐộ tin cậy:${Math.round((data.confidence || 0) * 100)}%`;
          
          // Suggest next actions
          actions.push({ type: 'estimate_price', label: '💰 Đính giá' });
          if (data.recommended_skills?.length) {
            actions.push({ type: 'match_worker', label: '🔧 Tìm thợ có kỹ năng' });
          }
          
          // Store diagnosis fact
          newFacts.push({
            key: 'last_diagnosis',
            value: `${data.diagnosis} - ${data.severity}`,
            importance: 4
          });
        } else {
          // Fallback to text diagnosis
          const diagnosis = await aiCore.diagnose({ description, category: 'general' });
          if (diagnosis.success) {
            const data = diagnosis.data;
            reply = `Chẩn đoán: ${data.diagnosis}\nMức độ:${data.severity}\nKỹ năng cần:${data.recommended_skills?.join(', ') || 'Chưa xác định'}\nĐộ tin cậy:${Math.round((data.confidence || 0) * 100)}%`;
            
            actions.push({ type: 'estimate_price', label: '💰 Đính giá' });
            if (data.recommended_skills?.length) {
              actions.push({ type: 'match_worker', label: '🔧 Tìm thợ có kỹ năng' });
            }
            
            newFacts.push({
              key: 'last_diagnosis',
              value: `${data.diagnosis} - ${data.severity}`,
              importance: 4
            });
          } else {
            reply = 'Không thể chẩn đoán từ ảnh và mô tả. Vui lòng mô tả chi tiết hơn hoặc gửi ảnh rõ ràng hơn.';
          }
        }
      } else {
        // Text-only diagnosis
        const diagnosis = await aiCore.diagnose({ description, category: 'general' });
        if (diagnosis.success) {
          const data = diagnosis.data;
          reply = `Chẩn đoán: ${data.diagnosis}\nMức độ:${data.severity}\nKỹ năng cần:${data.recommended_skills?.join(', ') || 'Chưa xác định'}\nĐộ tin cậy:${Math.round((data.confidence || 0) * 100)}%`;
          
          actions.push({ type: 'estimate_price', label: '💰 Đính giá' });
          if (data.recommended_skills?.length) {
            actions.push({ type: 'match_worker', label: '🔧 Tìm thợ có kỹ năng' });
          }
          
          newFacts.push({
            key: 'last_diagnosis',
            value: `${data.diagnosis} - ${data.severity}`,
            importance: 4
          });
        } else {
          reply = 'Không thể chẩn đoán tự động. Vui lòng mô tả chi tiết hơn hoặc gửi ảnh để tôi có thể giúp bạn tốt hơn.';
        }
      }
    } 
    else if (intent === 'estimate_price') {
      // For price estimate, we need a diagnosis (could be from conversation or ask for it)
      // For simplicity, we'll ask for description first
      reply = 'Để tôi có thể đưa ra báo giá precisa, bạn có thể mô tả sự cố mà bạn gặp phải? (hoặc nếu bạn đã có chẩn đoán từ trước, hãy chia sẻ với tôi)';
      actions.push({ type: 'diagnose', label: '🩺 Chẩn đoán trước' });
    }
    else if (intent === 'create_order') {
      // For creating order, we need to have a service request ready
      // We'll check if we have a recent diagnosis in memory
      const recentDiagnosis = memories?.find(m => 
        m.category === 'ai_learned' && m.key === 'last_diagnosis'
      );
      
      if (recentDiagnosis) {
        reply = `Dựa trên chẩn đoán trước đây: ${recentDiagnosis.value}\n\nBạn có muốn tôi tạo đơn dịch vụ dựa trên chẩn đoán này không?`;
        actions.push({ 
          type: 'confirmation_card', 
          label: '✅ Xác nhận tạo đơn',
          value: recentDiagnosis.value // Store the diagnosis details
        });
      } else {
        reply = 'Để tạo đơn dịch vụ, tôi cần trước tiên chẩn đoán sự cố. Bạn có thể mô tả vấn đề bạn đang gặp?';
        actions.push({ type: 'diagnose', label: '🩺 Chẩn đoán sự cố' });
      }
    }
    else if (intent === 'match_worker') {
      // For matching worker, we need skills and location
      // We'll ask for more details if needed
      reply = 'Tôi có thể giúp bạn tìm thợ phù hợp. Bạn cần làm việc loại gì? (ví dụ: điện lạnh, điện nước, v.v.)';
      actions.push({ type: 'ask_skills', label: '🔧 Chọn kỹ năng' });
    }
    else if (intent === 'process_payment') {
      // For processing payment, we need an order ID or amount
      reply = 'Để xử lý thanh toán, tôi cần biết đơn hàng bạn muốn thanh toán là đơn nào? Bạn có thể cung cấp ID đơn hàng hoặc mô tả đơn hàng đó?';
      // In a real implementation, we would look up recent orders
    }
    else {
      // General chat or fallback - use AI chat function for natural conversation
      try {
        const chatResponse = await aiCore.chat({
          message,
          context: {
            persona: context.persona,
            companionProfile,
            memories: memories || [],
            knowledge,
            timestamp: new Date().toISOString()
          },
          // Include conversation history as messages
          history: memories?.filter(m => m.category === 'conversation')
                        .map(m => ({
                          role: m.key.includes('_user_') ? 'user' : 'assistant',
                          content: m.value
                        })) || []
        });
        
        if (chatResponse.success && chatResponse.data) {
          const data = chatResponse.data as any;
          reply = data.reply || 'Tôi đang xử lý yêu cầu của bạn...';
          
          // Convert AI actions to our format if present
          if (data.actions && Array.isArray(data.actions)) {
            actions = data.actions.map((action: any) => ({
              type: action.type || 'unknown',
              label: action.label || action.type || 'Hành động'
            }));
          }
          
          // Extract any new facts from AI response (if implemented)
          // For now, we'll rely on explicit fact storage above
        } else {
          reply = 'Xin lỗi, tôi đang gặp sự cố xử lý. Vui lòng thử lại sau.';
        }
      } catch (chatError) {
        console.error('AI chat error:', chatError);
        reply = 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.';
      }
    }

    // Store conversation in interactions
    await supabase.from('companion_interactions').insert([
      {
        user_id: user.id,
        session_id: sessionId,
        role: 'user',
        content: message,
        intent: intent,
        sentiment: 0.7, // Placeholder
        metadata: { persona: context.persona }
      },
      {
        user_id: user.id,
        session_id: sessionId,
        role: 'assistant',
        content: reply,
        intent: `${intent}_response`,
        sentiment: 0.8, // Placeholder
        metadata: { persona: context.persona }
      }
    ]);

    // Store new facts in memory
    for (const fact of newFacts) {
      await supabase
        .from('companion_memories')
        .upsert({
          user_id: user.id,
          key: fact.key,
          value: fact.value,
          category: 'ai_learned',
          importance: fact.importance,
          source: 'chat',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }, { onConflict: ['user_id', 'key'] });
    }

    // Update session with latest context
    await supabase
      .from('companion_sessions')
      .update({
        context: {
          ...context,
          last_interaction: new Date().toISOString(),
          message_count: (context.context?.message_count || 0) + 2 // user + assistant
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Build and return response
    const response: CompanionChatResponse = {
      reply,
      session_id: sessionId
    };

    if (actions.length > 0) {
      response.actions = actions;
    }

    if (newFacts.length > 0) {
      response.memory = { new_facts: newFacts };
    }

    return jsonResponse(response);
  } catch (error) {
    console.error('Companion chat error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});