// 🗺️ Service Area — Worker đăng ký vùng phục vụ, AI matching lọc theo vùng

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'get'

    switch (action) {
      case 'get': {
        // Lấy service area của worker hiện tại
        if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)
        const { data } = await supabase.from('service_areas').select('*').eq('worker_id', userId).maybeSingle()
        return jsonResponse(data || { worker_id: userId, geometry: null, center_lat: null, center_lng: null, radius_km: 10 })
      }

      case 'save': {
        // Lưu service area
        if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)
        const body = await req.json()
        const { geometry, center_lat, center_lng, radius_km, name } = body
        if (!geometry) return jsonResponse({ error: 'Thiếu geometry' }, 400)

        await supabase.from('service_areas').upsert({
          worker_id: userId, geometry, center_lat, center_lng,
          radius_km: radius_km || 10, name: name || 'Khu vực của tôi', is_active: true,
        }, { onConflict: 'worker_id' })

        return jsonResponse({ success: true })
      }

      case 'check': {
        // Kiểm tra điểm có trong service area không
        const { worker_id, lat, lng } = await req.json()
        if (!worker_id || lat === undefined || lng === undefined) {
          return jsonResponse({ error: 'Thiếu worker_id, lat, lng' }, 400)
        }
        const { data } = await supabase.rpc('is_in_service_area', { p_worker_id: worker_id, p_lat: lat, p_lng: lng })
        return jsonResponse({ in_area: data })
      }

      case 'nearby-workers': {
        // AI matching: tìm thợ trong khu vực
        const { lat, lng, radius = 10 } = await req.json()
        if (lat === undefined || lng === undefined) return jsonResponse({ error: 'Thiếu lat, lng' }, 400)

        // Lấy thợ có service area chứa điểm này
        const { data: workers } = await supabase
          .from('workers')
          .select('id, profiles!inner(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
          .eq('is_verified', true)
          .limit(50)

        // Lọc theo khoảng cách
        const nearby = (workers || [])
          .map((w: any) => {
            const R = 6371
            const dLat = (w.location_lat - lat) * Math.PI / 180
            const dLng = (w.location_lng - lng) * Math.PI / 180
            const a = Math.sin(dLat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(w.location_lat * Math.PI/180) * Math.sin(dLng/2)**2
            const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            return { ...w, distance_km: Math.round(km * 10) / 10 }
          })
          .filter(w => w.distance_km <= radius)
          .sort((a: any, b: any) => a.distance_km - b.distance_km)

        return jsonResponse({
          workers: nearby.slice(0, 20).map((w: any) => ({
            id: w.id, name: w.profiles?.full_name,
            distance_km: w.distance_km, rating: w.rating,
            skills: w.skills, verified: w.is_verified,
          })),
        })
      }

      case 'delete': {
        if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)
        await supabase.from('service_areas').delete().eq('worker_id', userId)
        return jsonResponse({ success: true })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    console.error('Service area error:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ' }, 500)
  }
})