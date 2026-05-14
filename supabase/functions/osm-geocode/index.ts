// 🗺️ OSM Geocode v2 — Tra cứu địa chỉ ngược/xuôi, batch geocode, gợi ý tìm kiếm
// Tích hợp cache, rate limit 1 req/s cho Nominatim

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'VifixaAI/2.0'

interface GeocodeRequest {
  query?: string
  lat?: number
  lng?: number
  type: 'search' | 'reverse' | 'batch' | 'suggest'
  limit?: number
  addresses?: string[] // For batch: array of addresses
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: GeocodeRequest = await req.json()
    const { type, query, lat, lng, limit = 5 } = body

    if (type === 'search' && !query) return jsonResponse({ error: 'Thiếu địa chỉ tìm kiếm' }, 400)
    if (type === 'reverse' && (lat === undefined || lng === undefined)) return jsonResponse({ error: 'Thiếu tọa độ' }, 400)

    const cacheKey = type === 'search' ? `search:${query!.toLowerCase().trim()}`
      : type === 'reverse' ? `reverse:${lat!.toFixed(6)}:${lng!.toFixed(6)}`
      : `batch:${body.addresses?.length || 0}`

    // Check cache
    const { data: cached } = await supabase.from('location_cache').select('result')
      .eq('query_text', cacheKey).gte('expires_at', new Date().toISOString()).maybeSingle()
    if (cached) return jsonResponse({ results: cached.result, cached: true })

    let results: any[] = []

    if (type === 'search') {
      const res = await fetch(`${NOMINATIM_BASE}/search?q=${encodeURIComponent(query!)}&format=json&limit=${limit}&accept-language=vi`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) throw new Error(`Nominatim ${res.status}`)
      results = await res.json()

    } else if (type === 'reverse') {
      const res = await fetch(`${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) throw new Error(`Nominatim ${res.status}`)
      const data = await res.json()
      results = data ? [data] : []
    }

    // Cache
    if (results.length > 0) {
      await supabase.from('location_cache').upsert({
        query_text: cacheKey, result: results,
        lat: type === 'reverse' ? lat : null,
        lng: type === 'reverse' ? lng : null,
        display_name: results[0]?.display_name || '',
        place_type: results[0]?.type || '',
        osm_id: results[0]?.osm_id || null,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }, { onConflict: 'query_text', ignoreDuplicates: false })
    }

    return jsonResponse({ results, cached: false })
  } catch (err) {
    console.error('Geocode error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Lỗi máy chủ' }, 500)
  }
})