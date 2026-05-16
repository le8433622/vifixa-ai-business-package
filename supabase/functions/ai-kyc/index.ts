import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { AICore } from '../_shared/ai-core.ts'

interface KYCRequestBody {
  worker_id: string
  id_front_url: string
  id_back_url?: string
  selfie_url?: string
  auto_approve_on_high_confidence?: boolean
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body: KYCRequestBody = await req.json()
    const { worker_id, id_front_url, id_back_url, selfie_url, auto_approve_on_high_confidence = true } = body

    if (!worker_id || !id_front_url) {
      return jsonResponse({ error: 'Missing worker_id or id_front_url' }, 400)
    }

    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const aiCore = new AICore({ supabase, userId: worker_id })

    const imageUrls = [id_front_url]
    if (id_back_url) imageUrls.push(id_back_url)

    const visionResult = await aiCore.verifyKYCDocuments({
      imageUrls,
      selfieUrl: selfie_url,
    })

    if (!visionResult.success) {
      return jsonResponse({ success: false, error: visionResult.error }, 500)
    }

    const analysis = visionResult.data

    const shouldAutoApprove = auto_approve_on_high_confidence && analysis.auto_approved && analysis.confidence >= 0.7
    const newStatus = shouldAutoApprove ? 'verified' : 'pending'

    await supabase.from('workers').update({
      verification_status: newStatus,
      is_verified: shouldAutoApprove || false,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_notes: JSON.stringify({
        ai_verified_at: new Date().toISOString(),
        auto_approved: shouldAutoApprove,
        confidence: analysis.confidence,
        document_valid: analysis.document_valid,
        selfie_matches: analysis.selfie_matches,
        flags: analysis.flags || [],
        explanation: analysis.explanation,
      }),
    }).eq('id', worker_id)

    await supabase.from('ai_logs').insert({
      agent_type: 'kyc',
      input: { worker_id, id_front_url, id_back_url: id_back_url || null, selfie_url: selfie_url || null },
      output: analysis,
    })

    if (shouldAutoApprove) {
      await supabase.from('verification_badges').upsert({
        user_id: worker_id,
        badge_type: 'identity',
        badge_level: 'gold',
        issued_at: new Date().toISOString(),
      }, { onConflict: 'user_id, badge_type' })

      await supabase.rpc('calculate_trust_score', { worker_uuid: worker_id })
    }

    return jsonResponse({
      success: true,
      data: {
        status: newStatus,
        auto_approved: shouldAutoApprove,
        confidence: analysis.confidence,
        document_valid: analysis.document_valid,
        selfie_matches: analysis.selfie_matches,
        flags: analysis.flags || [],
        explanation: analysis.explanation,
      },
      message: shouldAutoApprove
        ? 'Tự động duyệt KYC qua AI Vision'
        : 'KYC cần admin xem xét',
    })
  } catch (error: any) {
    console.error('AI KYC error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
