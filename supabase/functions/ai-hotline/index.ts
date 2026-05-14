import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Emergency Hotline — 24/7 AI-powered dispatch
// Routes: emergency detection → nearest available worker → SMS/notification

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { caller_phone, description, location, category } = await req.json()
    if (!description) return jsonResponse({ error: 'Missing description' }, 400)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase)

    // 1. Determine if truly emergency
    const result = await ai.orchestrateInternal('diagnosis', async () => ({
      systemPrompt: `Bạn là hệ thống sàng lọc khẩn cấp cho Vifixa.
Phân tích mô tả và xác định mức độ khẩn cấp.
Trả về JSON: {is_emergency: bool, severity: low|medium|high|critical, requires_immediate_dispatch: bool, recommended_skills: string[], message: string}`,
      userPrompt: `Mô tả sự cố: ${description}
Loại: ${category || 'general'}
Vị trí: ${JSON.stringify(location || {})}
Phân tích và trả về JSON:`,
    }))

    const isEmergency = result.success && result.data?.is_emergency
    const severity = result.success ? result.data.severity : 'low'

    // 2. Find nearest available workers
    const { data: workers } = await supabase
      .from('workers')
      .select('id, profiles!inner(full_name, phone), skills, rating, location_lat, location_lng')
      .eq('is_verified', true)
      .limit(20)

    const sortedWorkers = (workers || [])
      .map((w: any) => {
        if (!location) return { ...w, distance_km: 999 }
        const dLat = (w.location_lat - location.lat) * Math.PI / 180
        const dLng = (w.location_lng - location.lng) * Math.PI / 180
        const a = Math.sin(dLat/2)**2 + Math.cos(location.lat * Math.PI/180) * Math.cos(w.location_lat * Math.PI/180) * Math.sin(dLng/2)**2
        return { ...w, distance_km: Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) }
      })
      .sort((a: any, b: any) => a.distance_km - b.distance_km)

    const nearestWorker = sortedWorkers[0]
    let dispatchResult = null

    // 3. Dispatch (for emergencies: immediately notify nearest worker)
    if (isEmergency && nearestWorker) {
      await supabase.from('in_app_notifications').insert({
        user_id: nearestWorker.id, title: '🚨 Yêu cầu khẩn cấp!', category: 'emergency',
        body: `Sự cố khẩn cấp gần bạn: ${description}. Khoảng cách: ${nearestWorker.distance_km}km.`,
        priority: 'high',
        metadata: { type: 'emergency_dispatch', caller_phone, description, severity, request_id: requestId },
      })

      dispatchResult = {
        dispatched: true,
        worker: { name: nearestWorker.profiles?.full_name, phone: nearestWorker.profiles?.phone, distance_km: nearestWorker.distance_km },
        eta_minutes: Math.round(nearestWorker.distance_km * 2 + 10),
      }
    }

    // 4. Log + create order if emergency
    if (isEmergency) {
      await supabase.from('orders').insert({
        category: category || 'emergency',
        description: `[KHẨN CẤP-Hotline] ${description}`,
        status: 'pending',
        estimated_price: 500000,
        customer_id: null,
        ai_diagnosis: { severity, is_emergency: true, source: 'hotline' },
      })
    }

    return jsonResponse({
      request_id: requestId,
      is_emergency: isEmergency,
      severity,
      dispatch: dispatchResult,
      message: isEmergency
        ? 'Đã tiếp nhận yêu cầu khẩn cấp. Thợ gần nhất đang được điều động.'
        : 'Yêu cầu của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ trong ít phút.',
    })
  } catch (error: any) {
    console.error('Hotline error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})