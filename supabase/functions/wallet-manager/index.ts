// Wallet Manager Edge Function
// Handles: get balance, request withdrawal, approve/complete payout

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
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

  // Get wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (walletError || !wallet) {
    return jsonResponse({ error: 'Wallet not found' }, 404)
  }

  // Check sufficient balance
  const available = wallet.balance - wallet.locked_amount
  if (available < amount) {
    return jsonResponse({ error: 'Insufficient balance' }, 400)
  }

  // Get platform fee from app_settings
  const { data: feeSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'payout_fee')
    .single()

  const fee = parseInt(feeSetting?.value || '5000')

  // Lock amount in wallet
  const { error: updateError } = await supabase
    .from('wallets')
    .update({ locked_amount: wallet.locked_amount + amount })
    .eq('id', wallet.id)

  if (updateError) throw updateError

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      wallet_id: wallet.id,
      user_id: userId,
      amount,
      fee,
      bank_account,
      status: 'pending',
    })
    .select()
    .single()

  if (payoutError) throw payoutError

  return jsonResponse({ success: true, payout })
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

  // Get payout
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .select('*, wallets(*)')
    .eq('id', payoutId)
    .single()

  if (payoutError || !payout) {
    return jsonResponse({ error: 'Payout not found' }, 404)
  }

  // Update payout status
  const { error: updateError } = await supabase
    .from('payouts')
    .update({
      status: 'completed',
      admin_id: adminId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payoutId)

  if (updateError) throw updateError

  // Update wallet: subtract amount + fee, unlock
  const wallet = payout.wallets
  const newBalance = wallet.balance - payout.amount - payout.fee
  const newLocked = wallet.locked_amount - payout.amount

  await supabase
    .from('wallets')
    .update({
      balance: Math.max(0, newBalance),
      locked_amount: Math.max(0, newLocked),
    })
    .eq('id', wallet.id)

  // Create ledger entry for payout
  const transactionId = `payout_${Date.now()}`
  await supabase
    .from('ledger_entries')
    .insert([
      {
        transaction_id: transactionId,
        wallet_id: wallet.id,
        account: 'wallet.withdrawal',
        direction: 'debit',
        amount: payout.amount,
        currency: wallet.currency,
        reference_type: 'payout',
        reference_id: payoutId,
        description: 'Withdrawal to bank account',
      },
      {
        transaction_id: transactionId,
        wallet_id: wallet.id,
        account: 'fee.payout',
        direction: 'debit',
        amount: payout.fee,
        currency: wallet.currency,
        reference_type: 'fee',
        reference_id: payoutId,
        description: 'Payout fee',
      },
    ])

  return jsonResponse({ success: true })
}
