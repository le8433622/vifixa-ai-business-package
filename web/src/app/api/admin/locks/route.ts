import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    let query = supabase
      .from('account_locks')
      .select('*, profiles!user_id(email, full_name, role, cancel_count), locker:profiles!locked_by(email)')
      .order('locked_at', { ascending: false })
      .limit(50)

    if (status === 'active') query = query.is('unlocked_at', null)
    else if (status === 'resolved') query = query.not('unlocked_at', 'is', null)

    const { data, error } = await query
    if (error) throw error

    const { count: activeCount } = await supabase
      .from('account_locks')
      .select('*', { count: 'exact', head: true })
      .is('unlocked_at', null)

    const { count: resolvedCount } = await supabase
      .from('account_locks')
      .select('*', { count: 'exact', head: true })
      .not('unlocked_at', 'is', null)

    return NextResponse.json({
      success: true,
      data: data || [],
      stats: { active: activeCount || 0, resolved: resolvedCount || 0 },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { user_id, lock_level, reason, expires_at, locked_by } = body

    if (!user_id || !lock_level || !reason) {
      return NextResponse.json({ error: 'Missing: user_id, lock_level, reason' }, { status: 400 })
    }

    if (!['warning', 'temporary', 'permanent'].includes(lock_level)) {
      return NextResponse.json({ error: 'Invalid lock_level' }, { status: 400 })
    }

    // Insert lock record
    const { data: lock, error } = await supabase.from('account_locks').insert({
      user_id,
      lock_level,
      reason,
      locked_by,
      expires_at: expires_at || (lock_level === 'temporary' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null),
    }).select().single()

    if (error) throw error

    // Update profiles
    await supabase.from('profiles').update({
      is_locked: lock_level !== 'warning',
      locked_at: new Date().toISOString(),
      lock_reason: reason,
    }).eq('id', user_id)

    return NextResponse.json({ success: true, data: lock })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    const { lock_id, user_id, unlock_reason, unlocked_by } = body

    if (!lock_id || !user_id) {
      return NextResponse.json({ error: 'Missing: lock_id, user_id' }, { status: 400 })
    }

    await supabase.from('account_locks').update({
      unlocked_at: new Date().toISOString(),
      unlocked_by,
      unlock_reason: unlock_reason || 'Admin mở khóa',
    }).eq('id', lock_id)

    await supabase.from('profiles').update({
      is_locked: false,
      locked_at: null,
      lock_reason: null,
    }).eq('id', user_id)

    return NextResponse.json({ success: true, message: 'Account unlocked' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
