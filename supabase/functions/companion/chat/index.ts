// 🧠 Vifixa AI Companion Chat Edge Function
// Implements the AI Companion Engine as specified in docs/COMPANION.md
// Now powered by NVIDIA NIM via AICore with action system

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';
import { createAICore } from '../_shared/ai-core.ts';
import { buildPersonalizedPrompt, getPersonalizedWelcome, type UserData } from '../_shared/personalization-engine.ts';
import { webSearch, fetchWebPage, shouldSearch, extractSearchQuery, formatSearchResults } from '../_shared/web-search.ts';
import { serviceRegistry, type ServiceDefinition } from '../_shared/service-registry.ts';
import { buildCoTPrompt, buildReActPrompt, parseReasoningTrace, formatReasoningForUI } from '../_shared/reasoning-engine.ts';
import { processFeedback, adaptPersonality, consolidateMemory, generateInsights, type FeedbackEvent, type LearnedFact } from '../_shared/learning-engine.ts';

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



export async function handler(req: Request) {
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

    // Backward compatibility: handle old ai-chat request format (session_id at top level)
    if ('session_id' in body && !(body as any).context?.user_id) {
      console.warn('[Companion] Received legacy ai-chat format, mapping to companion format');
      const oldBody = body as any;
      body = {
        message: oldBody.message,
        context: {
          user_id: user.id,
          persona: oldBody.context?.persona || 'customer',
          session_id: oldBody.session_id || undefined,
          ...(oldBody.context || {}),
        },
      } as CompanionChatRequest;
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
        persona: context.persona,
      });

     // Classify intent using AI Core
     let intent = 'general_chat'; // fallback
     try {
       const intentResult = await aiCore.classifyIntent({
         message,
         persona: context.persona,
         availableIntents: ['diagnose', 'estimate_price', 'create_order', 'match_worker', 'process_payment', 'general_chat']
       });
       if (intentResult.success && intentResult.data) {
         intent = intentResult.data.intent;
       }
     } catch (error) {
       console.error('Intent classification failed:', error);
       // Fallback to rule-based detection if AI fails
       const INTENT_KEYWORDS: Record<string, string[]> = {
         diagnose: ['máy lạnh', 'điều hòa', 'tủ lạnh', 'máy giặt', 'lạnh', 'nóng', 'rò rỉ', 'sự cố', 'hỏng', 'không chạy', 'chữa'],
         estimate_price: ['giá', 'báo giá', 'chi phí', 'etra', 'tiền'],
         create_order: ['đặt', 'order', 'tạo đơn', 'gọi thợ', 'đặt lịch'],
         match_worker: ['tìm thợ', 'thợ gần', 'việc làm', 'công việc', 'tìm việc'],
         process_payment: ['thanh toán', 'trả tiền', 'pay', 'vnpay', 'stripe', 'quét mã']
       };
       const lower = message.toLowerCase();
       for (const [key, keywords] of Object.entries(INTENT_KEYWORDS)) {
         if (keywords.some(k => lower.includes(k))) {
           intent = key;
           break;
         }
       }
       // Default intents based on persona
       if (intent === 'general_chat' && context.persona === 'customer') intent = 'general_chat';
       if (intent === 'general_chat' && context.persona === 'worker') intent = 'job_search';
     }

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

     // Intent is already classified above using AI Core
    
    // Build personalized user data for the AI
    const userData: UserData = {
      userId: user.id,
      persona: context.persona,
      name: companionProfile?.full_name || user.email?.split('@')[0] || 'Người dùng',
      email: user.email,
      companionProfile: companionProfile ? {
        personality_traits: companionProfile.personality_traits,
        communication_style: companionProfile.communication_style,
        interests: companionProfile.interests,
        goals: companionProfile.goals,
        tone: companionProfile.tone,
        formality: companionProfile.formality,
        empathy_level: companionProfile.empathy_level,
        autonomy_level: companionProfile.autonomy_level,
      } : undefined,
      memories: (memories || []).map(m => ({
        key: m.key, value: m.value, category: m.category,
        importance: m.importance, created_at: m.created_at,
      })),
      devices: knowledge && 'devices' in knowledge ? (knowledge as any).devices : undefined,
      skills: knowledge && 'skills' in knowledge ? (knowledge as any).skills : undefined,
      orders: undefined, // Will be fetched if needed
      currentTime: new Date().toISOString(),
      sessionCount: await supabase.from('companion_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .then(r => r.count || 0),
      lastSessionDate: memories?.find(m => m.category === 'session_end')?.created_at,
      totalConversations: memories?.filter(m => m.category === 'conversation').length || 0,
    }

    // If new session, send personalized welcome message
    const isFirstMessage = !context.session_id || !memories?.length
    let welcomeReply = ''
    if (isFirstMessage) {
      welcomeReply = getPersonalizedWelcome(userData)
    }

    // Override the AI Core's system prompt with personalized one
    const systemPrompt = buildPersonalizedPrompt('chat', userData)

    // Prepare variables for response
    let reply: string = welcomeReply || "Xin lỗi, tôi không hiểu. Bạn có thể mô tả rõ hơn không?";
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
       // First check if we have a recent diagnosis in memory
       const recentDiagnosis = memories?.find(m => 
         m.category === 'ai_learned' && m.key === 'last_diagnosis'
       );
       
       if (recentDiagnosis) {
         // Use the diagnosis to estimate price
         const priceEstimate = await aiCore.estimatePrice({
           diagnosis: recentDiagnosis.value,
           category: 'general' // Could extract from diagnosis or context
         });
         
         if (priceEstimate.success) {
           const data = priceEstimate.data;
           reply = `Dựa trên chẩn đoán: ${recentDiagnosis.value}\n\nƯớc lượng chi phí: ${data.estimated_price.toLocaleString()} VND\n\nChi tiết:\n${data.price_breakdown.map(b => `- ${b.item}: ${b.cost.toLocaleString()} VND`).join('\n')}\n\nĐộ tin cậy: ${Math.round((data.confidence || 0) * 100)}%`;
           
           actions.push({ type: 'create_order', label: '📝 Tạo đơn dịch vụ' });
           
           // Store price estimate fact
           newFacts.push({
             key: 'last_price_estimate',
             value: `${data.estimated_price} VND`,
             importance: 3
           });
         } else {
           reply = 'Không thể估算价格。请提供更多关于故障的详细描述。';
           actions.push({ type: 'diagnose', label: '🩺 Chẩn đoán sự cố' });
         }
       } else {
         // No diagnosis in memory, ask for description first
         reply = 'Để tôi có thể đưa ra báo giá precisa, bạn có thể mô tả sự cố mà bạn gặp phải? (hoặc nếu bạn đã có chẩn đoán từ trước, hãy chia sẻ với tôi)';
         actions.push({ type: 'diagnose', label: '🩺 Chẩn đoán trước' });
       }
     }
     else if (intent === 'create_order') {
       // For creating order, we need to have a service request ready
       // We'll check if we have a recent diagnosis and price estimate in memory
       const recentDiagnosis = memories?.find(m => 
         m.category === 'ai_learned' && m.key === 'last_diagnosis'
       );
       const recentPriceEstimate = memories?.find(m => 
         m.category === 'ai_learned' && m.key === 'last_price_estimate'
       );

       if (recentDiagnosis && recentPriceEstimate) {
         // We have both diagnosis and price estimate, proceed to create order
         reply = `Dựa trên chẩn đoán: ${recentDiagnosis.value}\n\nƯớc lượng chi phí: ${recentPriceEstimate.value}\n\nBạn có muốn tôi tạo đơn dịch vụ với thông tin trên không?`;
         actions.push({ 
           type: 'confirmation_order', 
           label: '✅ Xác nhận tạo đơn',
           value: { diagnosis: recentDiagnosis.value, priceEstimate: recentPriceEstimate.value }
         });
       } else if (recentDiagnosis) {
         // We have diagnosis but no price estimate, ask for price estimate first
         reply = `Dựa trên chẩn đoán: ${recentDiagnosis.value}\n\nĐể tạo đơn, tôi cần сначалаước lượng chi phí. Bạn có muốn tôi估算价格 cho chẩn đoán này không?`;
         actions.push({ type: 'estimate_price', label: '💰 Đính giá' });
       } else {
         // No diagnosis, ask for description first
         reply = 'Để tạo đơn dịch vụ, tôi cần trước tiên chẩn đoán sự cố. Bạn có thể mô tả vấn đề bạn đang gặp?';
         actions.push({ type: 'diagnose', label: '🩺 Chẩn đoán sự cố' });
       }
     }
     else if (intent === 'match_worker') {
       // For matching worker, we need skills and location
       // First check if we have a recent diagnosis in memory to determine required skills
       const recentDiagnosis = memories?.find(m => 
         m.category === 'ai_learned' && m.key === 'last_diagnosis'
       );
       
       let requiredSkills: string[] = [];
       if (recentDiagnosis) {
         // In a real implementation, we would extract skills from diagnosis
         // For now, we'll use a simple mapping or ask the user
         requiredSkills = ['tự nhiên']; // placeholder
       }
       
       // Get user location from context or profile
       const userLocation = context.location || { lat: 0, lng: 0 }; // fallback
       
       // Use AI Core to match workers
       const matchResult = await aiCore.matchWorker({
         skills_required: requiredSkills,
         location: userLocation,
         urgency: 'medium' // could be extracted from context
       }, []); // candidateWorkers could come from a separate query
       
       if (matchResult.success && matchResult.data) {
         const data = matchResult.data;
         reply = `Tôi đã tìm thấy thợ phù hợp:\n\nTên thợ: ${data.worker_name}\nETA: ${data.eta_minutes} phút\nĐộ tin cậy: ${Math.round((data.confidence || 0) * 100)}%\n\nLý do khuyến nghị:\n${data.match_reasons?.map(r => `- ${r}`).join('\n') || 'Không có'}`;
         
         // Store match fact
         newFacts.push({
           key: 'last_worker_match',
           value: `${data.worker_name} - ${data.eta_minutes} phút`,
           importance: 3
         });
         
         actions.push({ type: 'process_payment', label: '💰 Thanh toán đặt cọc' });
       } else {
         // Fallback to asking for more details
         reply = 'Tôi có thể giúp bạn tìm thợ phù hợp. Bạn cần làm việc loại gì? (ví dụ: điện lạnh, điện nước, v.v.)';
         actions.push({ type: 'ask_skills', label: '🔧 Chọn kỹ năng' });
       }
     }
     else if (intent === 'process_payment') {
       // For processing payment, we need an order ID or amount
       // First, let's see if we have any recent orders in memory or context
       // In a real implementation, we would fetch recent orders from the database
       
       // Check if we have order information in context or memory
       const recentOrder = memories?.find(m => 
         m.category === 'order' && m.key === 'last_order'
       );
       
       if (recentOrder) {
         // We have order information, proceed with payment processing
         reply = `Đơn hàng: ${recentOrder.value}\n\nBạn muốn thanh toán số tiền này bằng phương thức nào?`;
         actions.push({ 
           type: 'payment_method_selection', 
           label: '💳 Chọn phương thức thanh toán',
           value: recentOrder.value
         });
         
         // Store payment intent fact
         newFacts.push({
           key: 'payment_intent',
           value: `Processing payment for order: ${recentOrder.value}`,
           importance: 4
         });
       } else {
         // No order information, ask for details
         reply = 'Để xử lý thanh toán, tôi cần biết đơn hàng bạn muốn thanh toán là đơn nào? Bạn có thể cung cấp ID đơn hàng hoặc mô tả đơn hàng đó?';
         
         // In a real implementation, we would integrate with VNPay or Stripe here
         // For now, we'll just acknowledge and suggest next steps
         actions.push({ type: 'general_chat', label: '💬 Hỗ trợ thêm' });
       }
     }
    else {
      // General chat or fallback
      // Step 1: Service Detection (Service Abstraction Layer)
      let detectedService: ServiceDefinition | undefined
      try {
        const matched = serviceRegistry.detect(message)
        if (matched.length > 0) {
          detectedService = matched[0]
          // Store detected service in memory
          newFacts.push({
            key: 'last_detected_service',
            value: detectedService.name,
            importance: 3
          })
        }
      } catch (svcError) {
        console.warn('[Companion] Service detection error:', svcError)
      }

      // Step 2: Web Search if needed
      let webContext = ''
      try {
        if (shouldSearch(message)) {
          const query = extractSearchQuery(message)
          const searchResults = await webSearch(query, 5)
          if (searchResults.length > 0) {
            webContext = formatSearchResults(searchResults)
            newFacts.push({
              key: 'last_web_search',
              value: `${query}: ${searchResults[0].title}`,
              importance: 2
            })
          }
        }
      } catch (searchError) {
        console.warn('[Companion] Web search error:', searchError)
      }

      // Step 3: Build reasoning prompt (Chain-of-Thought)
      const serviceName = detectedService?.name || 'Tư vấn chung'
      const reasoningPrompt = buildCoTPrompt(serviceName, message, {
        userInfo: companionProfile?.full_name,
        serviceInfo: detectedService?.description,
        memoryHints: (memories || []).filter(m => m.importance >= 3).slice(0, 5).map(m => m.value),
      })

      // Step 4: Call AI with enhanced reasoning
      try {
        const chatResponse = await aiCore.chat({
          systemPrompt: `${systemPrompt}\n\n${reasoningPrompt}`,
          message: webContext ? `${message}\n\n${webContext}` : message,
          context: {
            persona: context.persona,
            companionProfile,
            memories: memories || [],
            knowledge: { ...knowledge, detectedService },
            timestamp: new Date().toISOString()
          },
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
          
          // Extract reasoning trace for UI display
          const trace = parseReasoningTrace(data.reasoning || '')
          if (trace.steps.length > 0) {
            const reasoningUI = formatReasoningForUI(trace)
            reply += reasoningUI
          }

          // Learn from this interaction
          const learningFacts = processFeedback({
            userId: user.id,
            type: 'conversation_end',
            data: {
              outcome: data.session_complete ? 'success' : 'continue',
              summary: message.slice(0, 100),
              detectedService: serviceName,
            },
            timestamp: new Date().toISOString(),
          })
          for (const fact of learningFacts) {
            newFacts.push(fact)
          }
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
        sentiment: 0.7,
        metadata: { persona: context.persona }
      },
      {
        user_id: user.id,
        session_id: sessionId,
        role: 'assistant',
        content: reply,
        intent: `${intent}_response`,
        sentiment: 0.8,
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
    // Route to orchestrator for actionable intents
    const actionableIntents = [
      'diagnose', 'estimate_price', 'create_order', 'match_worker',
      'repair_device', 'cleaning', 'delivery', 'moving', 'massage',
      'tutoring', 'pet_care', 'elder_care', 'child_care',
    ]

    if (actionableIntents.includes(intent) || actions.some(a => ['create_order', 'confirmation_order'].includes(a.type))) {
      try {
        const orchestratorRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/agent-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('CRON_SECRET')}`,
            },
            body: JSON.stringify({ message, persona: context.persona, session_id: sessionId }),
          }
        )

        if (orchestratorRes.ok) {
          const plan = await orchestratorRes.json()
          if (plan.plan && plan.plan.length > 0) {
            reply += '\n\n---\n\n🤖 **Kế hoạch tự động**\n'
            plan.plan.forEach((s: any, i: number) => {
              reply += `\n${i + 1}. ${s.description || s.action_id}`
            })
            if (plan.needs_approval) {
              reply += '\n\n⚠️ Kế hoạch cần bạn xác nhận.'
            }
          }
        }
      } catch (orchErr) {
        console.warn('[Companion] Orchestrator bridge failed:', orchErr)
      }
    }

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
}