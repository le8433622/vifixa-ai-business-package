// 🤖 AI Auto Executor — Tự động hóa luồng công việc
// Nhận sự kiện từ Realtime → tự động thực hiện bước kế tiếp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { createAICore } from '../_shared/ai-core.ts'

interface ExecutorRequest {
  action: 'auto_diagnose' | 'auto_estimate' | 'auto_match' | 'auto_verify_kyc' | 'auto_resolve_dispute' | 'auto_complete'
  data: {
    order_id?: string
    category?: string
    description?: string
    media_urls?: string[]
    worker_id?: string
    customer_id?: string
    customer_lat?: number
    customer_lng?: number
    complaint_id?: string
    worker_kyc_id?: string
    id_front_url?: string
    id_back_url?: string
    selfie_url?: string
  }
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body: ExecutorRequest = await req.json()
    const { action, data } = body

    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const aiCore = createAICore(supabase)

    switch (action) {
      case 'auto_diagnose':
        return await handleDiagnose(supabase, aiCore, data)

      case 'auto_estimate':
        return await handleEstimate(supabase, aiCore, data)

      case 'auto_match':
        return await handleMatch(supabase, aiCore, data)

      case 'auto_verify_kyc':
        return await handleKYC(supabase, aiCore, data)

      case 'auto_resolve_dispute':
        return await handleDispute(supabase, aiCore, data)

      case 'auto_complete':
        return await handleComplete(supabase, data)

      default:
        return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (error: any) {
    console.error('Auto executor error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

async function handleDiagnose(supabase: any, aiCore: any, data: any) {
  if (!data.description) return jsonResponse({ error: 'Missing description' }, 400)

  const diagnosis = await aiCore.diagnose({
    description: data.description,
    category: data.category || '',
  })

  // Store diagnosis in order
  if (data.order_id) {
    await supabase.from('orders').update({
      ai_diagnosis: diagnosis,
      updated_at: new Date().toISOString(),
    }).eq('id', data.order_id)
  }

  // Log AI action
  await supabase.from('ai_logs').insert({
    order_id: data.order_id,
    agent_type: 'diagnosis',
    input: { description: data.description, category: data.category },
    output: diagnosis,
  })

  // If media provided, also analyze images
  let visionResult = null
  if (data.media_urls?.length) {
    try {
      visionResult = await aiCore.analyzeImages({ images: data.media_urls })
    } catch (e) {
      console.warn('Vision analysis failed:', e)
    }
  }

  return jsonResponse({
    success: true,
    action: 'auto_estimate' as string,
    data: { diagnosis, visionResult },
    message: `🔍 Đã chẩn đoán: ${diagnosis.diagnosis}`,
  })
}

async function handleEstimate(supabase: any, aiCore: any, data: any) {
  if (!data.order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { data: order } = await supabase.from('orders').select('*').eq('id', data.order_id).single()
  if (!order) return jsonResponse({ error: 'Order not found' }, 404)

  const price = await aiCore.estimatePrice({
    category: order.category,
    description: order.description,
    diagnosis: order.ai_diagnosis,
  })

  await supabase.from('orders').update({
    estimated_price: price.estimated_price,
    ai_diagnosis: { ...order.ai_diagnosis, estimated_price_range: { min: price.estimated_price * 0.8, max: price.estimated_price * 1.2 } },
    updated_at: new Date().toISOString(),
  }).eq('id', data.order_id)

  await supabase.from('ai_logs').insert({
    order_id: data.order_id,
    agent_type: 'pricing',
    input: { category: order.category, description: order.description },
    output: price,
  })

  return jsonResponse({
    success: true,
    action: 'auto_match' as string,
    data: { price },
    message: `💰 Giá dự kiến: ${price.estimated_price.toLocaleString()}₫`,
  })
}

async function handleMatch(supabase: any, aiCore: any, data: any) {
  if (!data.order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { data: order } = await supabase.from('orders').select('*').eq('id', data.order_id).single()
  if (!order) return jsonResponse({ error: 'Order not found' }, 404)

  // Find nearest worker via RPC
  const { data: nearest } = await supabase.rpc('find_nearest_worker', {
    customer_lat: order.location_lat || data.customer_lat || 10.77,
    customer_lng: order.location_lng || data.customer_lng || 106.69,
    required_skills: [],
    max_distance_km: 20,
  })

  if (!nearest || nearest.length === 0) {
    return jsonResponse({ success: false, error: 'No workers available', data: null })
  }

  const bestWorker = nearest[0]

  // Auto-assign best worker
  await supabase.from('orders').update({
    worker_id: bestWorker.worker_id,
    status: 'matched',
    updated_at: new Date().toISOString(),
  }).eq('id', data.order_id)

  await supabase.from('workers').update({ status: 'busy' }).eq('id', bestWorker.worker_id)

  await supabase.from('ai_logs').insert({
    order_id: data.order_id,
    agent_type: 'matching',
    input: { order_id: data.order_id },
    output: { matched: bestWorker, alternatives: nearest.slice(1) },
  })

  return jsonResponse({
    success: true,
    action: 'auto_complete' as string,
    data: { worker: bestWorker },
    message: `🔧 Đã ghép thợ ${bestWorker.full_name || bestWorker.worker_id} — cách ${bestWorker.distance_km.toFixed(1)}km`,
  })
}

async function handleKYC(supabase: any, aiCore: any, data: any) {
  if (!data.worker_kyc_id) return jsonResponse({ error: 'Missing worker_kyc_id' }, 400)

  const { data: worker } = await supabase.from('workers').select('*').eq('id', data.worker_kyc_id).single()
  if (!worker) return jsonResponse({ error: 'Worker not found' }, 404)

  const hasIdFront = !!(data.id_front_url || worker.id_front_url)
  const hasIdBack = !!(data.id_back_url || worker.id_back_url)
  const hasSelfie = !!(data.selfie_url || worker.selfie_url)

  // Auto-approve if all 3 docs exist (simple rule)
  // In production, use Vision AI to verify document authenticity
  if (hasIdFront && hasIdBack && hasSelfie) {
    await supabase.from('workers').update({
      verification_status: 'verified',
      is_verified: true,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_notes: 'Tự động duyệt: đủ giấy tờ',
    }).eq('id', data.worker_kyc_id)

    await supabase.from('verification_badges').upsert({
      user_id: data.worker_kyc_id,
      badge_type: 'identity',
      badge_level: 'gold',
      issued_at: new Date().toISOString(),
    }, { onConflict: 'user_id, badge_type' })

    await supabase.rpc('calculate_trust_score', { worker_uuid: data.worker_kyc_id })

    return jsonResponse({
      success: true,
      action: 'auto_complete' as string,
      data: { status: 'verified' },
      message: '✅ Tự động duyệt KYC: đủ 3 loại giấy tờ',
    })
  }

  return jsonResponse({
    success: false,
    action: 'manual_review' as string,
    data: { status: 'pending', missing: { id_front: !hasIdFront, id_back: !hasIdBack, selfie: !hasSelfie } },
    message: '⏳ Thiếu giấy tờ, chuyển admin duyệt thủ công',
  })
}

async function handleDispute(supabase: any, aiCore: any, data: any) {
  if (!data.complaint_id) return jsonResponse({ error: 'Missing complaint_id' }, 400)

  const { data: complaint } = await supabase
    .from('complaints')
    .select('*, orders:order_id(*)')
    .eq('id', data.complaint_id)
    .single()

  if (!complaint) return jsonResponse({ error: 'Complaint not found' }, 404)

  const order = complaint.orders || {}

  const resolution = await aiCore.summarizeDispute({
    complaint: complaint.description,
    complaint_type: complaint.complaint_type,
    order_category: order.category,
    order_price: order.final_price || order.estimated_price,
    customer_history: null, // TODO: fetch customer history
  })

  // Auto-resolve if confidence is high
  if (resolution.confidence >= 0.8 && resolution.recommended_action !== 'dismiss') {
    const actionMap: Record<string, string> = {
      refund: 'refund_full',
      partial_refund: 'refund_partial',
      rework: 'rework',
    }

    await supabase.from('complaints').update({
      status: resolution.recommended_action === 'dismiss' ? 'rejected' : 'resolved',
      resolution: actionMap[resolution.recommended_action] || 'refund_full',
      resolved_at: new Date().toISOString(),
    }).eq('id', data.complaint_id)

    // Update order status for rework
    if (resolution.recommended_action === 'rework') {
      await supabase.from('orders').update({ status: 'in_progress' }).eq('id', complaint.order_id)
    }

    await supabase.from('ai_logs').insert({
      order_id: complaint.order_id,
      agent_type: 'dispute',
      input: { complaint_id: data.complaint_id },
      output: resolution,
    })

    return jsonResponse({
      success: true,
      action: 'auto_complete' as string,
      data: { resolution, disputeId: data.complaint_id },
      message: `⚖️ Tự động giải quyết: ${resolution.recommended_action} (độ tin cậy ${Math.round(resolution.confidence * 100)}%)`,
    })
  }

  return jsonResponse({
    success: false,
    action: 'manual_review' as string,
    data: { resolution, disputeId: data.complaint_id },
    message: `⏳ Độ tin cậy thấp (${Math.round(resolution.confidence * 100)}%), chuyển admin xem xét`,
  })
}

async function handleComplete(supabase: any, data: any) {
  if (data.order_id) {
    await supabase.from('orders').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', data.order_id)
  }

  return jsonResponse({
    success: true,
    action: '' as string,
    message: '✅ Hoàn thành tự động',
  })
}
