// AI Chat Service Closer Edge Function
// Converts authenticated customer conversations into safe, auditable service orders.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions, redactPII } from '../_shared/auth-helper.ts';
import type { ChatContext, ChatRequest } from './types.ts';
import { extractSlots } from './slot-extractor.ts';
import { chooseState, getMissingSlots } from './state-machine.ts';
import { buildActions } from './action-builder.ts';
import { buildHandoffSummary, buildReply } from './reply-builder.ts';
import { maybeRunDiagnosisAndQuote } from './ai-service.ts';
import { createOrderIfConfirmed } from './order-service.ts';
import { logChatDecision } from './audit-service.ts';
import { logChatEvents } from './event-service.ts';
import { createApprovalRequest, evaluateAutonomy, resolveAutonomyPolicy } from './autonomy-service.ts';

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

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

    const message = body.message?.trim();
    if (!message) return jsonResponse({ error: 'Missing message' }, 400);

    let sessionId = body.session_id || undefined;
    let isNewSession = false;
    let sessionContext: ChatContext = { ...(body.context || {}) };
    let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) return jsonResponse({ error: 'Session not found' }, 404);

      sessionContext = { ...(session.context || {}), ...(body.context || {}) };

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
      const initialContext: ChatContext = {
        state: 'problem_capture',
        conversion_stage: 'started',
        ...(body.context || {}),
      };
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          session_type: 'booking',
          status: 'active',
          context: initialContext,
        })
        .select()
        .single();

      if (createError || !newSession) {
        return jsonResponse({ error: `Failed to create session: ${createError?.message}` }, 500);
      }

      sessionId = newSession.id;
      isNewSession = true;
      sessionContext = initialContext;
    }

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      metadata: { request_id: body.idempotency_key || null },
    });

    messages.push({ role: 'user', content: message });

    const requestId = body.idempotency_key || crypto.randomUUID();
    let nextContext = extractSlots(message, {
      ...sessionContext,
      idempotency_key: requestId,
    });

    let missingSlots = getMissingSlots(nextContext);
    let state = chooseState(nextContext, missingSlots);

    if (state === 'diagnosis' || state === 'quote' || state === 'confirmation' || state === 'order_creation') {
      try {
        nextContext = await maybeRunDiagnosisAndQuote(nextContext);
      } catch (aiError) {
        console.error('Diagnosis/quote failed in ai-chat:', aiError);
        nextContext.risk_flags = [...new Set([...(nextContext.risk_flags || []), 'ai_fallback'])];
      }
    }

    missingSlots = getMissingSlots(nextContext);
    state = chooseState(nextContext, missingSlots);

    let orderId: string | undefined;
    if (state === 'order_creation') {
      const policy = await resolveAutonomyPolicy(supabase, nextContext.category);
      const evaluation = evaluateAutonomy(nextContext, policy);

      if (evaluation.decision === 'execute') {
        const userToken = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
        orderId = await createOrderIfConfirmed(supabase, supabaseUrl, userToken, user.id, sessionId!, nextContext);
        state = 'handoff';
        nextContext.customer_confirmation = true;
        nextContext.conversion_stage = 'order_created';
      } else {
        await createApprovalRequest(supabase, {
          requestId,
          userId: user.id,
          sessionId: sessionId!,
          actionType: 'create_order',
          context: nextContext,
          evaluation,
        });
        state = evaluation.decision === 'blocked' ? 'escalated' : 'approval_required';
        nextContext.conversion_stage = evaluation.decision === 'blocked' ? 'blocked' : 'approval_required';
        nextContext.risk_flags = [...new Set([...(nextContext.risk_flags || []), evaluation.reason])];
      }
    } else if (state === 'quote' && nextContext.quote) {
      nextContext.conversion_stage = 'quoted';
      state = 'confirmation';
    } else if (state === 'slot_filling') {
      nextContext.conversion_stage = 'qualified';
    }

    nextContext.state = state;
    nextContext.handoff_summary = buildHandoffSummary(nextContext);
    nextContext.lead_score = nextContext.category && nextContext.location ? 80 : 45;
    nextContext.confidence = nextContext.quote ? 0.82 : 0.68;

    const finalMissingSlots = getMissingSlots(nextContext);
    const actions = buildActions(state, finalMissingSlots, nextContext, orderId);
    const reply = buildReply(state, finalMissingSlots, nextContext, orderId);
    const sessionComplete = Boolean(orderId);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: reply,
      metadata: {
        request_id: requestId,
        actions,
        state,
        intent: nextContext.intent,
        slots: nextContext,
        order_id: orderId,
      },
    });

    await supabase
      .from('chat_sessions')
      .update({
        status: sessionComplete ? 'completed' : 'active',
        context: nextContext,
        completed_at: sessionComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const output = {
      session_id: sessionId!,
      reply,
      state,
      intent: nextContext.intent,
      slots: nextContext,
      missing_slots: finalMissingSlots,
      actions,
      next_step: state,
      confidence: nextContext.confidence,
      session_complete: sessionComplete,
      order_id: orderId,
    };

    await logChatDecision(
      supabase,
      redactPII,
      requestId,
      user.id,
      sessionId!,
      { message, context: sessionContext, messages: messages.slice(-8) },
      output,
      orderId,
    );

    await logChatEvents(supabase, {
      isNewSession,
      requestId,
      userId: user.id,
      sessionId: sessionId!,
      state,
      intent: nextContext.intent,
      missingSlots: finalMissingSlots,
      context: nextContext,
      orderId,
    });

    return jsonResponse(output);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Chat error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});
