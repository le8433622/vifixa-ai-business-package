import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    // Collect user data
    const [profile, orders, devices, transactions] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user_id).maybeSingle(),
      supabase.from('orders').select('*').or(`customer_id.eq.${user_id},worker_id.eq.${user_id}`),
      supabase.from('device_profiles').select('*').eq('user_id', user_id),
      supabase.from('payment_intents').select('*').or(`customer_id.eq.${user_id},worker_id.eq.${user_id}`),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      orders: orders.data || [],
      devices: devices.data || [],
      transactions: transactions.data || [],
    }

    // Store export URL (in production, upload to storage)
    const { data: deletionReq } = await supabase
      .from('deletion_requests')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (deletionReq) {
      await supabase.from('deletion_requests').update({
        export_url: JSON.stringify(exportData),
      }).eq('id', deletionReq.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Dữ liệu đã được xuất',
      data: exportData,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
