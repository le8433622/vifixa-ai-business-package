import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { customer_id, worker_id, category, description, location_lat, location_lng, address } = body

    if (!customer_id || !worker_id || !category) {
      return NextResponse.json({ error: 'Missing: customer_id, worker_id, category' }, { status: 400 })
    }

    // Create order
    const { data: order, error } = await supabase.from('orders').insert({
      customer_id,
      worker_id,
      category,
      description: description || `Đặt thợ qua bản đồ: ${category}`,
      location_lat: location_lat || 10.77,
      location_lng: location_lng || 106.69,
      address: address || '',
      status: 'matched',
      estimated_price: 0,
    }).select().single()

    if (error) throw error

    // Mark worker as busy
    await supabase.from('workers').update({
      status: 'busy',
    }).eq('id', worker_id)

    // Record in companion memory
    try {
      await fetch(`${supabaseUrl}/rest/v1/companion_memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: customer_id,
          key: 'last_booking',
          value: JSON.stringify({ order_id: order.id, worker_id, category }),
          category: 'worker_selection',
          importance: 5,
        }),
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Đã đặt thợ thành công',
      order,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
