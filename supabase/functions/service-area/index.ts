// Service Area — Polygon containment + worker matching
// GET  /service-area?worker_id=xxx&lat=10.82&lng=106.63 — Check if worker covers point
// POST /service-area/find-workers — Find all workers covering a point
// POST /service-area/save — Save/update worker service area

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  try {
    return await handler(req)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})

export async function handler(req: Request): Promise<Response> {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname.replace('/functions/v1/service-area', '')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // GET / — Check if a worker covers a point
  if (req.method === 'GET' && (path === '/' || path === '')) {
    const workerId = url.searchParams.get('worker_id')
    const lat = url.searchParams.get('lat')
    const lng = url.searchParams.get('lng')

    if (!workerId || !lat || !lng) {
      return jsonResponse({ error: 'Missing worker_id, lat, lng' }, 400)
    }

    const { data, error } = await supabase.rpc('is_in_service_area', {
      p_worker_id: workerId,
      p_lat: Number(lat),
      p_lng: Number(lng),
    })

    if (error) throw error
    return jsonResponse({ in_area: data, worker_id: workerId, lat: Number(lat), lng: Number(lng) })
  }

  // POST /find-workers — Find all workers covering a point
  if (path === '/find-workers') {
    const body = await req.json()
    const { lat, lng, service_type } = body

    if (!lat || !lng) return jsonResponse({ error: 'Missing lat, lng' }, 400)

    const { data, error } = await supabase.rpc('find_workers_in_area', {
      p_lat: Number(lat),
      p_lng: Number(lng),
      p_service_type: service_type || null,
    })

    if (error) throw error
    return jsonResponse({ workers: data || [], count: (data || []).length })
  }

  // POST /save — Save/update worker service area
  if (path === '/save') {
    const user = await verifyAuth(req)
    const body = await req.json()
    const { geometry, name, center_lat, center_lng, radius_km } = body

    if (!geometry && (!center_lat || !center_lng)) {
      return jsonResponse({ error: 'Missing geometry or center coordinates' }, 400)
    }

    const { data: existing } = await supabase
      .from('service_areas')
      .select('id')
      .eq('worker_id', user.id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('service_areas')
        .update({
          geometry: geometry || null,
          name: name || 'Khu vực của tôi',
          center_lat: center_lat || null,
          center_lng: center_lng || null,
          radius_km: radius_km || 10,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return jsonResponse({ service_area: data, updated: true })
    } else {
      const { data, error } = await supabase
        .from('service_areas')
        .insert({
          worker_id: user.id,
          geometry: geometry || null,
          name: name || 'Khu vực của tôi',
          center_lat: center_lat || null,
          center_lng: center_lng || null,
          radius_km: radius_km || 10,
        })
        .select()
        .single()
      if (error) throw error
      return jsonResponse({ service_area: data, created: true })
    }
  }

  return jsonResponse({ error: 'Not found' }, 404)
}
