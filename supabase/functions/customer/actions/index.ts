// Customer Actions Edge Function
// Handles: add_device, schedule_maintenance
// POST /functions/v1/customer/actions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../../_shared/auth-helper.ts'

export async function handler(req: Request) {
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
    const path = url.pathname.replace('/functions/v1/customer/actions', '')

    if (path === '/add-device' && req.method === 'POST') {
      return await handleAddDevice(req, supabase, userId)
    }
    if (path === '/my-devices' && req.method === 'GET') {
      return await handleMyDevices(supabase, userId)
    }
    if (path === '/schedule-maintenance' && req.method === 'POST') {
      return await handleScheduleMaintenance(req, supabase, userId)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] customer/actions:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

async function handleAddDevice(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { device_type, brand, model, purchase_date, warranty_expiry, notes } = body

  if (!device_type) return jsonResponse({ error: 'Missing device_type' }, 400)

  const { data, error } = await supabase
    .from('device_profiles')
    .insert({
      user_id: userId,
      device_type,
      brand,
      model,
      purchase_date,
      warranty_expiry,
      notes,
    })
    .select()
    .single()

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, device: data }, 201)
}

async function handleMyDevices(supabase: any, userId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('device_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ devices: data || [] })
}

async function handleScheduleMaintenance(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { device_id, maintenance_type, scheduled_date, notes } = body

  if (!device_id || !maintenance_type || !scheduled_date) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  const { data: device } = await supabase
    .from('device_profiles')
    .select('id')
    .eq('id', device_id)
    .eq('user_id', userId)
    .single()

  if (!device) return jsonResponse({ error: 'Device not found' }, 404)

  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert({
      user_id: userId,
      device_id,
      maintenance_type,
      scheduled_date,
      notes,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, schedule: data }, 201)
}