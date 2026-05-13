// Wallet Manager Edge Function
// Handles: get balance, request withdrawal, approve/complete payout

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders as _corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  // Verify auth
  let user: any
  try {
    user = await verifyAuth(req)
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    // GET /?action=balance → Get wallet balance
    if (req.method === 'GET' && action === 'balance') {
      return await handleGetBalance(supabase, user.id)
    }

    // GET /?action=ledger → Get ledger entries
    if (req.method === 'GET' && action === 'ledger') {
      return await handleGetLedger(req, supabase, user.id)
    }

    // POST / → Request withdrawal (worker)
    if (req.method === 'POST') {
      return await handleRequestPayout(req, supabase, user.id)
    }

    // PUT /?action=approve&id=xxx → Approve payout (admin)
    if (req.method === 'PUT' && action === 'approve') {
      const payoutId = url.searchParams.get('id')
      return await handleApprovePayout(supabase, user.id, payoutId)
    }

    // PUT /?action=reject&id=xxx → Reject payout (admin) — unlock locked_amount
    if (req.method === 'PUT' && action === 'reject') {
      const payoutId = url.searchParams.get('id')
      return await handleRejectPayout(supabase, user.id, payoutId)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    console.error('Wallet manager error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})

async function handleGetBalance(supabase: any, userId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  // Return default if not exists
  if (!data) {
    return jsonResponse({
      balance: 0,
      locked_amount: 0,
      currency: 'VND',
    })
  }

  return jsonResponse(data)
}

async function handleGetLedger(req: Request, supabase: any, userId: string): Promise<Response> {
  // Get wallet_id first
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!wallet) {
    return jsonResponse({ entries: [] })
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const { data, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return jsonResponse({ entries: data || [] })
}

async function handleRequestPayout(req: Request, supabase: any, userId: string): Promise<Response> {
  const body = await req.json()
  const { amount, bank_account } = body

  if (!amount || amount <= 0) {
    return jsonResponse({ error: 'Invalid amount' }, 400)
  }

  // Atomic RPC: lock wallet with FOR UPDATE, check balance, lock amount, create payout
  const { data: result, error: rpcError } = await supabase
    .rpc('request_payout', {
      p_user_id: userId,
      p_amount: amount,
      p_fee: 5000,
      p_bank_account: bank_account || {},
    })

  if (rpcError) {
    console.error('Request payout RPC error:', rpcError)
    return jsonResponse({ error: 'Failed to request payout', detail: rpcError.message }, 500)
  }

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400)
  }

  return jsonResponse({ success: true, payout: result })
}

async function handleApprovePayout(supabase: any, adminId: string, payoutId: string | null): Promise<Response> {
  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .single()

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  if (!payoutId) {
    return jsonResponse({ error: 'Missing payout id' }, 400)
  }

  // Atomic RPC: lock payout + wallet with FOR UPDATE, update both, create ledger entries
  const { data: result, error: rpcError } = await supabase
    .rpc('approve_payout', { p_payout_id: payoutId })

  if (rpcError) {
    console.error('Approve payout RPC error:', rpcError)
    return jsonResponse({ error: 'Failed to approve payout', detail: rpcError.message }, 500)
  }

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400)
  }

  // Update admin_id separately (RPC doesn't track admin)
  await supabase
    .from('payouts')
    .update({ admin_id: adminId })
    .eq('id', payoutId)

  return jsonResponse({ success: true })
}

async function handleRejectPayout(supabase: any, adminId: string, payoutId: string | null): Promise<Response> {
  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .single()

  if (profile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  if (!payoutId) {
    return jsonResponse({ error: 'Missing payout id' }, 400)
  }

  // Atomic RPC: unlock locked_amount, mark payout as failed
  const { data: result, error: rpcError } = await supabase
    .rpc('reject_payout', { p_payout_id: payoutId })

  if (rpcError) {
    console.error('Reject payout RPC error:', rpcError)
    return jsonResponse({ error: 'Failed to reject payout', detail: rpcError.message }, 500)
  }

  if (!result.success) {
    return jsonResponse({ error: result.error }, 400)
  }

  return jsonResponse({ success: true, payout_id: payoutId })
}
