import { jsonResponse, handleOptions, verifyAuth, RateLimitConfig } from '../_shared/auth-helper.ts'

const OSRM_BASE = 'https://router.project-osrm.org'
const CACHE_TTL = 300_000
const cache = new Map<string, { data: any; expiry: number }>()

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): { distance: number; duration: number } {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return { distance: dist, duration: (dist / 25000) * 3600 }
}

function makeCacheKey(waypoints: { lat: number; lng: number }[]): string {
  return waypoints.map(w => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join(';')
}

function coordsToObject(c: number[]): { latitude: number; longitude: number } {
  return { latitude: c[1], longitude: c[0] }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req, { maxRequests: 30 } as RateLimitConfig)
  } catch {
    // Allow unauthenticated for route preview
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json()
    const { waypoints, origin_lat, origin_lng, dest_lat, dest_lng } = body

    // Multi-waypoint mode: accepts array of {lat, lng} points
    if (waypoints && Array.isArray(waypoints) && waypoints.length >= 2) {
      const pts = waypoints.map((w: { lat: number; lng: number }) => ({
        lat: Number(w.lat),
        lng: Number(w.lng),
      }))

      if (pts.some(p => isNaN(p.lat) || isNaN(p.lng))) {
        return jsonResponse({ error: 'Invalid waypoint coordinates' }, 400)
      }

      const ckey = `multi:${makeCacheKey(pts)}`
      const cached = cache.get(ckey)
      if (cached && Date.now() < cached.expiry) return jsonResponse(cached.data)

      const coordStr = pts.map(p => `${p.lng},${p.lat}`).join(';')
      const url = `${OSRM_BASE}/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url, { headers: { 'User-Agent': 'VifixaAI/1.0' } })

      if (!res.ok) throw new Error(`OSRM error: ${res.status}`)
      const data = await res.json()
      const route = data?.routes?.[0]

      if (!route) throw new Error('No route found')

      const legCoords = data.waypoints?.map((wp: any) => ({
        latitude: wp.location[1],
        longitude: wp.location[0],
        name: wp.name || '',
      })) || pts.map(p => ({ latitude: p.lat, longitude: p.lng, name: '' }))

      const polyline = route.geometry?.coordinates?.map(coordsToObject) || []

      const totalDistance = route.distance || pts.slice(0, -1).reduce((sum: number, p: { lat: number; lng: number }, i: number) => {
        const n = pts[i + 1]
        return sum + haversine(p.lat, p.lng, n.lat, n.lng).distance
      }, 0)

      const totalDuration = route.duration || pts.slice(0, -1).reduce((sum: number, p: { lat: number; lng: number }, i: number) => {
        const n = pts[i + 1]
        return sum + haversine(p.lat, p.lng, n.lat, n.lng).duration
      }, 0)

      const result = {
        success: true,
        route: polyline,
        waypoints: legCoords,
        distance: totalDistance,
        duration: totalDuration,
        distance_km: (totalDistance / 1000).toFixed(1),
        duration_min: Math.round(totalDuration / 60),
        legs: data.waypoints?.length ? data.waypoints.length - 1 : pts.length - 1,
      }

      cache.set(ckey, { data: result, expiry: Date.now() + CACHE_TTL })
      return jsonResponse(result)
    }

    // Legacy A→B mode
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return jsonResponse({ error: 'Missing origin/dest or waypoints' }, 400)
    }

    const ckey = `${Number(origin_lat).toFixed(4)},${Number(origin_lng).toFixed(4)}-${Number(dest_lat).toFixed(4)},${Number(dest_lng).toFixed(4)}`
    const cached = cache.get(ckey)
    if (cached && Date.now() < cached.expiry) return jsonResponse(cached.data)

    const from = `${origin_lng},${origin_lat}`
    const to = `${dest_lng},${dest_lat}`
    const url = `${OSRM_BASE}/route/v1/driving/${from};${to}?overview=full&geometries=geojson`
    const res = await fetch(url, { headers: { 'User-Agent': 'VifixaAI/1.0' } })
    if (!res.ok) throw new Error(`OSRM error: ${res.status}`)

    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) throw new Error('No route found')

    const coords = route.geometry?.coordinates?.map(coordsToObject) || []

    const result = {
      success: true,
      route: coords,
      distance: route.distance,
      duration: route.duration,
      distance_km: (route.distance / 1000).toFixed(1),
      duration_min: Math.round(route.duration / 60),
    }

    cache.set(ckey, { data: result, expiry: Date.now() + CACHE_TTL })
    return jsonResponse(result)
  } catch {
    const { waypoints, origin_lat, origin_lng, dest_lat, dest_lng } = await req.json().catch(() => ({}))

    if (waypoints && Array.isArray(waypoints) && waypoints.length >= 2) {
      const pts = waypoints.map((w: any) => ({ lat: Number(w.lat) || 0, lng: Number(w.lng) || 0 }))
      let totalDist = 0
      let totalDur = 0
      const legs: { distance: number; duration: number }[] = []
      for (let i = 0; i < pts.length - 1; i++) {
        const seg = haversine(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng)
        totalDist += seg.distance
        totalDur += seg.duration
        legs.push(seg)
      }
      return jsonResponse({
        success: true,
        route: pts.map(p => ({ latitude: p.lat, longitude: p.lng })),
        waypoints: pts.map(p => ({ latitude: p.lat, longitude: p.lng, name: '' })),
        distance: totalDist,
        duration: totalDur,
        distance_km: (totalDist / 1000).toFixed(1),
        duration_min: Math.round(totalDur / 60),
        legs: pts.length - 1,
        fallback: true,
      })
    }

    const fallback = haversine(
      Number(origin_lat) || 0, Number(origin_lng) || 0,
      Number(dest_lat) || 0, Number(dest_lng) || 0,
    )
    return jsonResponse({
      success: true,
      route: [
        { latitude: Number(origin_lat) || 0, longitude: Number(origin_lng) || 0 },
        { latitude: Number(dest_lat) || 0, longitude: Number(dest_lng) || 0 },
      ],
      distance: fallback.distance,
      duration: fallback.duration,
      distance_km: (fallback.distance / 1000).toFixed(1),
      duration_min: Math.round(fallback.duration / 60),
      fallback: true,
    })
  }
})
