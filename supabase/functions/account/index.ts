// Account Edge Function
// Handles: update_profile, update_address, update_phone
// POST /functions/v1/account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const auth = await verifyAuth(req)
    const userId = auth.id

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/account', '')

    // GET / — Read profile
    if (path === '' && req.method === 'GET') {
      return await handleReadProfile(supabase, userId)
    }

    // POST /update-profile
    if (path === '/update-profile' && req.method === 'POST') {
      return await handleUpdateProfile(req, supabase, userId)
    }

    // POST /update-address
    if (path === '/update-address' && req.method === 'POST') {
      return await handleUpdateAddress(req, supabase, userId)
    }

    // POST /update-phone
    if (path === '/update-phone' && req.method === 'POST') {
      return await handleUpdatePhone(req, supabase, userId)
    }

    // POST /verify-otp
    if (path === '/verify-otp' && req.method === 'POST') {
      return await handleVerifyOtp(req, supabase, userId)
    }

    // POST /export-data
    if (path === '/export-data' && req.method === 'POST') {
      return await handleExportData(supabase, userId)
    }

    // POST /delete-request
    if (path === '/delete-request' && req.method === 'POST') {
      return await handleDeleteRequest(supabase, userId)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] account error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function handleReadProfile(supabase: any, userId: string): Promise<Response> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, avatar_url, bio, address, created_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return jsonResponse({ error: 'Profile not found' }, 404)
  }

  return jsonResponse(profile)
}

async function handleUpdateProfile(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { full_name, avatar_url, bio } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (full_name !== undefined) updates.full_name = full_name
  if (avatar_url !== undefined) updates.avatar_url = avatar_url
  if (bio !== undefined) updates.bio = bio

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({ success: true, profile: data })
}

async function handleUpdateAddress(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { address, lat, lng } = body

  if (!address) {
    return jsonResponse({ error: 'Missing address' }, 400)
  }

  const updates: Record<string, unknown> = {
    address,
    updated_at: new Date().toISOString(),
  }
  if (lat !== undefined) updates.location_lat = lat
  if (lng !== undefined) updates.location_lng = lng

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse({
    success: true,
    address: data.address,
    formatted_address: data.address,
  })
}

async function handleUpdatePhone(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { new_phone, otp_code } = body

  if (!new_phone || !otp_code) {
    return jsonResponse({ error: 'Missing new_phone or otp_code' }, 400)
  }

  // Verify OTP
  const { data: otpRecord } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', new_phone)
    .eq('code', otp_code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .single()
    .catch(() => null)

  if (!otpRecord) {
    return jsonResponse({ error: 'Invalid or expired OTP' }, 401)
  }

  // Check phone uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', new_phone)
    .neq('id', userId)
    .single()
    .catch(() => null)

  if (existing) {
    return jsonResponse({ error: 'Phone number already in use' }, 409)
  }

  // Update phone
  const { data, error } = await supabase
    .from('profiles')
    .update({ phone: new_phone, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  // Mark OTP as used
  await supabase
    .from('otp_verifications')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', otpRecord.id)

  return jsonResponse({ success: true, phone: data.phone })
}

async function handleVerifyOtp(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { phone, code } = body
  if (!phone || !code) return jsonResponse({ error: 'Missing phone or code' }, 400)

  const { data: otp } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phone)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (!otp) return jsonResponse({ error: 'Invalid OTP' }, 401)

  await supabase.from('otp_verifications').update({ used: true, used_at: new Date().toISOString() }).eq('id', otp.id)
  return jsonResponse({ verified: true, phone })
}

async function handleExportData(supabase: any, userId: string): Promise<Response> {
  const [profileRes, ordersRes, devicesRes, memoriesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('orders').select('*').eq('customer_id', userId),
    supabase.from('device_profiles').select('*').eq('user_id', userId),
    supabase.from('companion_memories').select('*').eq('user_id', userId),
  ])

  return jsonResponse({
    exported_at: new Date().toISOString(),
    data: {
      profile: profileRes.data,
      orders: ordersRes.data || [],
      devices: devicesRes.data || [],
      memories: memoriesRes.data || [],
    },
  })
}

async function handleDeleteRequest(supabase: any, userId: string): Promise<Response> {
  const { error } = await supabase
    .from('account_deletion_requests')
    .insert({ user_id: userId, status: 'pending', requested_at: new Date().toISOString() })

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, message: 'Yêu cầu xóa tài khoản đã được ghi nhận. Admin sẽ xử lý trong 30 ngày.' })
}
