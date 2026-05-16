import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { worker_id, lat, lng, status } = body

    if (!worker_id || lat == null || lng == null) {
      return NextResponse.json({ error: 'Missing: worker_id, lat, lng' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      location_lat: lat,
      location_lng: lng,
      last_seen_at: new Date().toISOString(),
    }

    if (status) {
      updateData.is_online = status === 'online'
      updateData.status = status
    }

    const { error } = await supabase.from('workers').update(updateData).eq('id', worker_id)
    if (error) throw error

    // Record history
    await supabase.from('worker_location_history').insert({
      worker_id,
      lat,
      lng,
    }).maybeSingle()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
