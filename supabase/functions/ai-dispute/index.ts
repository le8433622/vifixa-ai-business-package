// AI Dispute Resolution Edge Function
// Per 11_AI_OPERATING_MODEL.md - Dispute Agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

interface DisputeRequest {
  order_id: string;
  complainant_id: string;
  complaint_type: 'quality' | 'pricing' | 'timeliness' | 'damage';
  description: string;
  evidence_urls?: string[];
}

interface DisputeResponse {
  summary: string;
  severity: 'low' | 'medium' | 'high';
  recommended_action: 'refund' | 'rework' | 'partial_refund' | 'dismiss';
  confidence: number;
  explanation: string;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 5 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, complainant_id, complaint_type, description, evidence_urls }: DisputeRequest = await req.json();

    if (!order_id || !complainant_id || !complaint_type || !description) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const requestId = crypto.randomUUID();
    const disputeResult = await createAIProvider(requestId).summarizeDispute({
      order_id, complainant_id, complaint_type, description, evidence_urls,
    });

    // Human review threshold: flag disputes with low confidence or high severity refunds
    const needsHumanReview = disputeResult.confidence < 0.6 ||
      (disputeResult.recommended_action === 'refund' && disputeResult.confidence < 0.8) ||
      disputeResult.severity === 'high';

    const enrichedResult = {
      ...disputeResult,
      needs_human_review: needsHumanReview,
      review_reason: needsHumanReview
        ? (disputeResult.confidence < 0.6 ? 'Low AI confidence' :
           disputeResult.severity === 'high' ? 'High severity' :
           'High-value refund recommendation')
        : null,
    };

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      request_id: requestId,
      agent_type: 'dispute',
      input: { order_id, complainant_id, complaint_type, description, evidence_urls },
      output: enrichedResult,
    });

    // If needs human review, create review task
    if (needsHumanReview) {
      try {
        await supabase.from('admin_review_queue').insert({
          entity_type: 'dispute',
          entity_id: order_id,
          ai_decision: enrichedResult,
          review_status: 'pending',
          created_by: user.id,
        });
      } catch (reviewError) {
        console.error('Failed to create review task:', reviewError);
      }
    }

    return jsonResponse(enrichedResult);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Dispute error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
