import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { customer_lat, customer_lng, required_skills, max_distance_km, order_id, assign } = body

    if (customer_lat == null || customer_lng == null) {
      return NextResponse.json({ error: 'Missing: customer_lat, customer_lng' }, { status: 400 })
    }

    // Find nearest workers
    const { data: nearest, error } = await supabase.rpc('find_nearest_worker', {
      customer_lat,
      customer_lng,
      required_skills: required_skills || [],
      max_distance_km: max_distance_km || 20,
    })

    if (error) throw error

    // Auto-assign if requested
    if (assign && order_id && nearest && nearest.length > 0) {
      const bestWorker = nearest[0]
      await supabase.from('orders').update({
        worker_id: bestWorker.worker_id,
        status: 'matched',
        updated_at: new Date().toISOString(),
      }).eq('id', order_id)

      await supabase.from('workers').update({
        status: 'busy',
        is_online: true,
      }).eq('id', bestWorker.worker_id)

      return NextResponse.json({
        success: true,
        assigned: bestWorker,
        message: `Đã gán thợ ${bestWorker.full_name || bestWorker.worker_id}`,
      })
    }

    return NextResponse.json({ success: true, workers: nearest || [] })
  } catch (error: any) {
    console.error('Geo-match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
