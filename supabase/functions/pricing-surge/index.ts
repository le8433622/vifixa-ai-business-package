// Pricing Surge Engine — Dynamic pricing based on demand vs supply
// POST /pricing-surge
// Input: { service_type, lat, lng, base_price, currency }
// Output: { adjusted_price, multiplier, reason, demand_score, supply_score, currency }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

// Exchange rates (VND base — approximate)
const EXCHANGE_RATES: Record<string, number> = {
  VND: 1,
  USD: 25450,
  THB: 695,
  IDR: 1.58,
}

function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const inVnd = from === 'VND' ? amount : amount * (EXCHANGE_RATES[from] || 1)
  if (to === 'VND') return Math.round(inVnd)
  return Math.round(inVnd / (EXCHANGE_RATES[to] || 1))
}

const SURGE_CONFIGS: Record<string, { max_multiplier: number; radius_km: number }> = {
  cleaning: { max_multiplier: 1.5, radius_km: 5 },
  deep_cleaning: { max_multiplier: 1.3, radius_km: 5 },
  ac_cleaning: { max_multiplier: 1.8, radius_km: 8 },
  delivery: { max_multiplier: 2.0, radius_km: 3 },
  moving: { max_multiplier: 1.4, radius_km: 10 },
  elder_care: { max_multiplier: 1.3, radius_km: 5 },
  child_care: { max_multiplier: 1.3, radius_km: 5 },
  pet_care: { max_multiplier: 1.2, radius_km: 5 },
  tutoring: { max_multiplier: 1.2, radius_km: 5 },
  massage: { max_multiplier: 1.6, radius_km: 5 },
  repair: { max_multiplier: 1.8, radius_km: 8 },
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const { service_type, lat, lng, base_price, currency, order_id } = await req.json()

    if (!service_type || !lat || !lng || !base_price) {
      return jsonResponse({ error: 'Missing required fields: service_type, lat, lng, base_price' }, 400)
    }

    const inCurrency = (currency || 'VND').toUpperCase()

    const config = SURGE_CONFIGS[service_type] || { max_multiplier: 1.5, radius_km: 5 }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Demand: count pending orders in the area
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id, latitude, longitude')
      .in('status', ['pending', 'diagnosed', 'quoted'])
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(100)

    let demandCount = 0
    if (pendingOrders) {
      for (const o of pendingOrders as any[]) {
        const d = haversineKm(lat, lng, Number(o.latitude), Number(o.longitude))
        if (d <= config.radius_km) demandCount++
      }
    }

    // Supply: count available workers with matching service area
    const { data: workers } = await supabase
      .from('workers')
      .select('user_id')
      .contains('skills', [service_type])
      .limit(50)

    // Count workers with service areas near the location
    const { data: serviceAreas } = await supabase
      .from('service_areas')
      .select('worker_id, center_lat, center_lng, radius_km')
      .eq('is_active', true)
      .limit(100)

    let supplyCount = 0
    if (serviceAreas) {
      for (const area of serviceAreas as any[]) {
        const d = haversineKm(lat, lng, Number(area.center_lat), Number(area.center_lng))
        if (d <= Number(area.radius_km || 10)) supplyCount++
      }
    }

    // Also count workers without service areas but with matching skills
    const workerIds = new Set((serviceAreas as any[])?.map((a: any) => a.worker_id) || [])
    if (workers) {
      for (const w of workers as any[]) {
        if (!workerIds.has(w.user_id)) {
          // Rough estimate: assume they're available
          supplyCount += 0.5
        }
      }
    }

    // Calculate surge
    const ratio = supplyCount > 0 ? demandCount / supplyCount : demandCount + 1
    let multiplier = 1.0

    if (ratio > 0.5 && ratio <= 1) multiplier = 1.1 + (ratio - 0.5) * 0.4
    else if (ratio > 1 && ratio <= 2) multiplier = 1.3 + (ratio - 1) * 0.3
    else if (ratio > 2) multiplier = Math.min(1.6 + (ratio - 2) * 0.2, config.max_multiplier)

    // Minimum surge if there are pending orders but very few workers
    if (demandCount > 0 && supplyCount === 0) multiplier = 1.3

    const baseInCurrency = convertCurrency(Number(base_price), 'VND', inCurrency)
    const adjustedInCurrency = convertCurrency(Math.round(Number(base_price) * multiplier), 'VND', inCurrency)
    const surgeActive = multiplier > 1.05

    let reason = 'Giá tiêu chuẩn'
    if (surgeActive) {
      if (ratio > 2) reason = `Cao điểm: ${demandCount} đơn đang chờ, ${supplyCount} thợ khả dụng`
      else if (ratio > 1) reason = `Nhu cầu cao: ${demandCount} đơn, ${supplyCount} thợ`
      else reason = `Nhu cầu tăng: ${demandCount} đơn gần đây`
    }

    return jsonResponse({
      success: true,
      currency: inCurrency,
      base_price: baseInCurrency,
      adjusted_price: adjustedInCurrency,
      multiplier: Math.round(multiplier * 100) / 100,
      surge_active: surgeActive,
      reason,
      demand_score: demandCount,
      supply_score: supplyCount,
      ratio: Math.round(ratio * 100) / 100,
      config: { max_multiplier: config.max_multiplier, radius_km: config.radius_km },
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
