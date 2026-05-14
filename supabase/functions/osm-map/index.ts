// 🗺️ OSM Map Data — Tạo GeoJSON cho bản đồ tương tác
// Trả về dữ liệu workers, orders, service areas dạng GeoJSON

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'workers'
    const lat = parseFloat(url.searchParams.get('lat') || '10.77')
    const lng = parseFloat(url.searchParams.get('lng') || '106.69')
    const radius = parseFloat(url.searchParams.get('radius') || '20')

    switch (action) {
      case 'workers': {
        const { data: workers } = await supabase
          .from('workers')
          .select('id, profiles!inner(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified, trust_score')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)
          .limit(200)

        return jsonResponse({
          type: 'FeatureCollection',
          features: (workers || []).map((w: any) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [w.location_lng, w.location_lat] },
            properties: {
              id: w.id, type: 'worker',
              name: w.profiles?.full_name || 'N/A',
              skills: w.skills || [],
              rating: w.rating || 0,
              completed_jobs: w.completed_jobs || 0,
              verified: w.is_verified,
              trust_score: w.trust_score || 50,
            },
          })),
        })
      }

      case 'orders': {
        const status = url.searchParams.get('status') || 'pending,matched,in_progress'
        const statuses = status.split(',')

        const { data: orders } = await supabase
          .from('orders')
          .select('id, category, description, status, estimated_price, final_price, customer_id, worker_id, created_at')
          .in('status', statuses)
          .order('created_at', { ascending: false })
          .limit(200)

        return jsonResponse({
          type: 'FeatureCollection',
          features: (orders || []).map((o: any) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [106.69, 10.77] }, // Default HCMC
            properties: {
              id: o.id, type: 'order',
              category: o.category, status: o.status,
              estimated_price: o.estimated_price,
              final_price: o.final_price,
              customer_id: o.customer_id,
              worker_id: o.worker_id,
              created_at: o.created_at,
            },
          })),
        })
      }

      case 'heatmap': {
        // Density heatmap data for worker availability
        const { data: workers } = await supabase
          .from('workers')
          .select('location_lat, location_lng')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)

        return jsonResponse({
          type: 'FeatureCollection',
          features: (workers || []).map((w: any) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [w.location_lng, w.location_lat] },
            properties: { weight: 1 },
          })),
        })
      }

      case 'nearby': {
        // Workers near a specific location (for customer map)
        const { data: workers } = await supabase
          .from('workers')
          .select('id, profiles!inner(full_name), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)
          .limit(50)

        const nearby = (workers || [])
          .map((w: any) => {
            const R = 6371
            const dLat = (w.location_lat - lat) * Math.PI / 180
            const dLng = (w.location_lng - lng) * Math.PI / 180
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(w.location_lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
            const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return { ...w, distance_km: Math.round(km * 10) / 10 }
          })
          .filter(w => w.distance_km <= radius)
          .sort((a: any, b: any) => a.distance_km - b.distance_km)

        return jsonResponse({
          type: 'FeatureCollection',
          features: nearby.map((w: any) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [w.location_lng, w.location_lat] },
            properties: {
              id: w.id, type: 'worker',
              name: w.profiles?.full_name || 'N/A',
              distance_km: w.distance_km,
              skills: w.skills || [],
              rating: w.rating || 0,
              verified: w.is_verified,
            },
          })),
        })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    console.error('OSM Map error:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})