// Worker Job Actions Edge Function
// Handles: accept_job, decline_job, start_job, complete_job
// POST /functions/v1/worker/job-actions

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
    const path = url.pathname.replace('/functions/v1/worker/job-actions', '')

    if (path === '/accept-job' && req.method === 'POST') {
      return await handleAcceptJob(req, supabase, userId)
    }
    if (path === '/decline-job' && req.method === 'POST') {
      return await handleDeclineJob(req, supabase, userId)
    }
    if (path === '/start-job' && req.method === 'POST') {
      return await handleStartJob(req, supabase, userId)
    }
    if (path === '/complete-job' && req.method === 'POST') {
      return await handleCompleteJob(req, supabase, userId)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] worker/job-actions:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

async function handleAcceptJob(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { order_id } = body
  if (!order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { data: order, error: checkErr } = await supabase
    .from('orders').select('status').eq('id', order_id).single()
  if (checkErr || !order) return jsonResponse({ error: 'Order not found' }, 404)
  if (order.status !== 'matched') return jsonResponse({ error: 'Order is not available' }, 409)

  const { error } = await supabase
    .from('orders')
    .update({ status: 'in_progress', worker_id: userId, accepted_at: new Date().toISOString() })
    .eq('id', order_id)
    .eq('worker_id', userId)

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, order_id, status: 'in_progress' })
}

async function handleDeclineJob(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { order_id, reason } = body
  if (!order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { error } = await supabase
    .from('orders')
    .update({ worker_id: null, status: 'pending' })
    .eq('id', order_id)
    .eq('worker_id', userId)
    .eq('status', 'matched')

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, order_id, reason: reason || 'Declined' })
}

async function handleStartJob(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { order_id, location } = body
  if (!order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'in_progress',
      start_location: location,
      started_at: new Date().toISOString(),
    })
    .eq('id', order_id)
    .eq('worker_id', userId)
    .eq('status', 'matched')

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, order_id, status: 'in_progress' })
}

async function handleCompleteJob(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { order_id, after_media, checklist, notes } = body
  if (!order_id) return jsonResponse({ error: 'Missing order_id' }, 400)

  const { data: order } = await supabase
    .from('orders').select('status,worker_id').eq('id', order_id).single()
  if (!order) return jsonResponse({ error: 'Order not found' }, 404)
  if (order.worker_id !== userId) return jsonResponse({ error: 'Not your job' }, 403)

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      after_media: after_media || [],
      checklist,
      notes,
      completed_at: new Date().toISOString(),
    })
    .eq('id', order_id)

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, order_id, status: 'completed' })
}