// Admin Actions Edge Function
// Handles: daily_brief, kyc_review, resolve_dispute, approve_refund
// POST/GET /functions/v1/admin/admin-actions

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
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.id).single()
    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Admin only' }, 403)
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/admin/admin-actions', '')

    if (path === '/daily-brief' && req.method === 'GET') {
      return await handleDailyBrief(supabase)
    }
    if (path === '/kyc-review' && req.method === 'POST') {
      return await handleKycReview(req, supabase, auth.id)
    }
    if (path === '/resolve-dispute' && req.method === 'POST') {
      return await handleResolveDispute(req, supabase, auth.id)
    }
    if (path === '/approve-refund' && req.method === 'POST') {
      return await handleApproveRefund(req, supabase, auth.id)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('[VIFIXA] admin-actions:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}

async function handleDailyBrief(supabase: any): Promise<Response> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [usersRes, ordersRes, disputesRes, kycRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('estimated_price,status,category').gte('created_at', today),
    supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('kyc_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const orders = (ordersRes.data || []) as any[]
  const revenue = orders.filter(o => o.status === 'completed').reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)
  const catCounts: Record<string, number> = {}
  orders.forEach(o => { catCounts[o.category] = (catCounts[o.category] || 0) + 1 })

  return jsonResponse({
    brief: {
      date: today,
      total_users: usersRes.count || 0,
      new_orders_today: orders.length,
      revenue_today: revenue,
      pending_disputes: disputesRes.count || 0,
      pending_kyc: kycRes.count || 0,
      top_categories: Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => ({ category: c, count: n })),
    },
  })
}

async function handleKycReview(req: Request, supabase: any, adminId: string): Promise<Response> {
  const body = await req.json()
  const { kyc_id, decision, reason } = body
  if (!kyc_id || !decision) return jsonResponse({ error: 'Missing kyc_id or decision' }, 400)

  const { error } = await supabase
    .from('kyc_applications')
    .update({
      status: decision === 'approved' ? 'approved' : 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === 'rejected' ? reason : null,
    })
    .eq('id', kyc_id)

  if (error) return jsonResponse({ error: error.message }, 400)

  if (decision === 'approved') {
    const { data: kyc } = await supabase.from('kyc_applications').select('user_id').eq('id', kyc_id).single()
    if (kyc) await supabase.from('profiles').update({ phone_verified: true }).eq('id', kyc.user_id)
  }

  return jsonResponse({ success: true, decision })
}

async function handleResolveDispute(req: Request, supabase: any, adminId: string): Promise<Response> {
  const body = await req.json()
  const { dispute_id, resolution, refund_amount, note } = body
  if (!dispute_id || !resolution) return jsonResponse({ error: 'Missing dispute_id or resolution' }, 400)

  const { error } = await supabase
    .from('complaints')
    .update({
      status: 'resolved',
      resolution,
      refund_amount: refund_amount || 0,
      admin_note: note,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', dispute_id)

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, resolution })
}

async function handleApproveRefund(req: Request, supabase: any, adminId: string): Promise<Response> {
  const body = await req.json()
  const { payment_id, amount, reason } = body
  if (!payment_id || !amount) return jsonResponse({ error: 'Missing payment_id or amount' }, 400)

  const { error } = await supabase
    .from('refunds')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      reason,
    })
    .eq('id', payment_id)

  if (error) return jsonResponse({ error: error.message }, 400)
  return jsonResponse({ success: true, refunded: amount })
}