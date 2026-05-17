// 🏛️ Vifixa Wallet Manager — Atomic Transaction Engine
// Handles: nạp/rút, chuyển tiền, escrow, auto-split, staking

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { logVifixa } from '../_shared/logger.ts'

// ─── IDEMPOTENCY HELPERS ──────────────────────────────────

async function checkIdempotency(supabase: any, key: string): Promise<any | null> {
  const { data } = await supabase.from('idempotency_keys').select('response').eq('key', key).maybeSingle()
  return data?.response || null
}

async function saveIdempotency(supabase: any, key: string, response: any): Promise<void> {
  await supabase.from('idempotency_keys').insert({ key, response }).catch(() => {})
}

async function callWorkflowEngine(supabase: any, orderId: string, event: string, data?: Record<string, unknown>): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return
  fetch(`${supabaseUrl}/functions/v1/workflow-engine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ order_id: orderId, event, data }),
  }).catch(e => console.error('[wallet] workflow call failed:', e))
}
import {
  type WalletType, type TransferRequest, type SplitRequest,
  calculateSplit, calculateFee, calculateDynamicPrice,
  calculateStakingInterest, dynamicInterestRate, calculateTier,
  VFC_TO_VND_RATE, DEFAULT_FEE_RATE, canReleaseEscrow,
} from '../_shared/wallet-core.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  if (req.method === 'OPTIONS') return opt
  const user = await verifyAuth(req)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { action, ...params } = await req.json().catch(() => ({ action: 'balance' }))
  logVifixa('wallet-manager', action, { userId: user.id })

  try {
    switch (action) {
      case 'balance': return await getBalance(supabase, user.id)
      case 'transfer': return await transfer(supabase, user.id, params)
      case 'deposit': return await deposit(supabase, user.id, params)
      case 'withdraw': return await withdraw(supabase, user.id, params)
      case 'escrow:hold': return await escrowHold(supabase, user.id, params)
      case 'escrow:release': return await escrowRelease(supabase, params.orderId, params)
      case 'escrow:refund': return await escrowRefund(supabase, params.orderId, params)
      case 'stake:create': return await stakeCreate(supabase, user.id, params)
      case 'stake:claim': return await stakeClaim(supabase, user.id, params)
      case 'stake:calculate': return await stakeCalculate(supabase, user.id, params)
      case 'split': return await autoSplit(supabase, user.id, params)
      case 'history': return await getHistory(supabase, user.id, params)
      case 'pricing': return await getPricing(supabase, params)
      case 'vfc:balance': return await getVfcBalance(supabase, user.id)
      default: return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (err: any) {
    logVifixa('wallet-manager', 'error', { userId: user.id, error: err.message })
    return jsonResponse({ error: err.message }, 500)
  }
})

// ─── BALANCE ───────────────────────────────────────────────

async function getBalance(supabase: any, userId: string) {
  const { data } = await supabase
    .from('wallets')
    .select('balance, locked, wallet_type')
    .eq('user_id', userId)
  
  const balances: Record<string, number> = { txn: 0, stake: 0, reward: 0, treasury: 0 }
  for (const w of data || []) {
    balances[w.wallet_type] = Number(w.balance)
  }

  const { data: vfc } = await supabase
    .from('vfc_points')
    .select('balance, tier, multiplier')
    .eq('user_id', userId)
    .single()

  return jsonResponse({
    wallets: balances,
    total: Object.values(balances).reduce((a, b) => a + b, 0),
    vfc: vfc || { balance: 0, tier: 'bronze', multiplier: 1.0 },
  })
}

// ─── TRANSFER ──────────────────────────────────────────────

async function transfer(supabase: any, userId: string, params: any) {
  const { toUserId, amount, walletType = 'txn', description } = params as TransferRequest
  
  if (!toUserId || !amount || amount <= 0) {
    return jsonResponse({ error: 'Invalid transfer params' }, 400)
  }

  // Atomic double-entry transaction
  const { data: txn, error } = await supabase.rpc('atomic_transfer', {
    p_from_user: userId,
    p_to_user: toUserId,
    p_amount: amount,
    p_wallet_type: walletType,
    p_description: description || 'Chuyển tiền',
  })

  if (error) throw error
  logVifixa('wallet', 'transfer_success', { userId, toUserId, amount, walletType })
  return jsonResponse({ transaction: txn })
}

// ─── AUTO-SPLIT ────────────────────────────────────────────

async function autoSplit(supabase: any, userId: string, params: any) {
  const { orderId, workerId, totalAmount } = params as SplitRequest & { orderId: string }

  const split = calculateSplit({ totalAmount, customerId: userId, workerId, orderId })
  
  // Execute atomic multi-wallet split
  const { data, error } = await supabase.rpc('auto_split_payment', {
    p_order_id: orderId,
    p_customer_id: userId,
    p_worker_id: workerId,
    p_amount: totalAmount,
    p_worker_payout: split.workerPayout,
    p_platform_fee: split.platformFee,
    p_reward_points: split.rewardPoints,
    p_treasury_amount: split.treasuryAmount,
  })

  if (error) throw error
  logVifixa('wallet', 'auto_split', { orderId, workerPayout: split.workerPayout, fee: split.platformFee })
  return jsonResponse({ split, transaction: data })
}

// ─── ESCROW ────────────────────────────────────────────────

async function escrowHold(supabase: any, userId: string, params: any) {
  const { orderId, workerId, amount } = params
  const fee = calculateFee(amount)
  const workerPayout = amount - fee

  const { error } = await supabase.from('escrow').insert({
    order_id: orderId,
    customer_id: userId,
    worker_id: workerId,
    amount,
    platform_fee: fee,
    worker_payout: workerPayout,
    status: 'pending',
  })

  if (error) throw error
  return jsonResponse({ status: 'pending', amount, fee, workerPayout })
}

async function escrowRelease(supabase: any, orderId: string, params?: any) {
  const idemKey = params?.idempotency_key || `escrow_release_${orderId}`
  const existing = await checkIdempotency(supabase, idemKey)
  if (existing) return jsonResponse(existing)

  // Get escrow + verify conditions
  const { data: escrow } = await supabase
    .from('escrow').select('*').eq('order_id', orderId).single()
  
  if (!escrow || escrow.status !== 'pending') {
    return jsonResponse({ error: 'Escrow not found or already processed' }, 400)
  }

  const check = canReleaseEscrow('completed', true, true)
  if (!check.allowed) return jsonResponse({ error: check.reason }, 400)

  // Release via RPC (atomic)
  const { data, error } = await supabase.rpc('release_escrow', {
    p_order_id: orderId,
    p_worker_payout: escrow.worker_payout,
    p_platform_fee: escrow.platform_fee,
  })

  if (error) throw error
  logVifixa('wallet', 'escrow_released', { orderId, amount: escrow.amount })

  const response = { status: 'released', transaction: data }
  await saveIdempotency(supabase, idemKey, response)

  // Trigger workflow engine after release
  callWorkflowEngine(supabase, orderId, 'quality:passed', { escrow_status: 'released' })

  return jsonResponse(response)
}

async function escrowRefund(supabase: any, orderId: string, params?: any) {
  const idemKey = params?.idempotency_key || `escrow_refund_${orderId}`
  const existing = await checkIdempotency(supabase, idemKey)
  if (existing) return jsonResponse(existing)

  const { data, error } = await supabase.rpc('refund_escrow', {
    p_order_id: orderId,
  })
  if (error) throw error

  const response = { status: 'refunded', transaction: data }
  await saveIdempotency(supabase, idemKey, response)

  // Trigger workflow engine after refund
  callWorkflowEngine(supabase, orderId, 'order:cancelled', { refund_status: 'refunded' })

  return jsonResponse(response)
}

// ─── STAKING ───────────────────────────────────────────────

async function stakeCreate(supabase: any, userId: string, params: any) {
  const { amount, days = 90 } = params
  if (!amount || amount < 10000) return jsonResponse({ error: 'Minimum stake: 10,000₫' }, 400)

  // Get total system staked for dynamic rate
  const { data: systemStaked } = await supabase
    .from('wallets').select('balance').eq('wallet_type', 'stake')
  const totalStaked = (systemStaked || []).reduce((s: number, w: any) => s + Number(w.balance), 0)
  
  const rate = dynamicInterestRate(totalStaked, 0.7, days)

  const { error } = await supabase.from('staking').insert({
    user_id: userId,
    amount,
    interest_rate: rate * 100, // Convert to percentage
    end_date: new Date(Date.now() + days * 86400000).toISOString(),
    status: 'active',
  })

  // Move funds from txn wallet to stake wallet
  await supabase.rpc('move_to_stake', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (error) throw error
  logVifixa('wallet', 'stake_created', { userId, amount, rate, days })
  return jsonResponse({ status: 'active', amount, rate: rate * 100, maturityDate: new Date(Date.now() + days * 86400000).toISOString() })
}

async function stakeClaim(supabase: any, userId: string, params: any) {
  const { stakeId } = params
  const { data: stake } = await supabase
    .from('staking').select('*').eq('id', stakeId).eq('user_id', userId).single()
  
  if (!stake || stake.status !== 'active') {
    return jsonResponse({ error: 'Stake not found or not matured' }, 400)
  }

  const daysStaked = Math.floor((Date.now() - new Date(stake.start_date).getTime()) / 86400000)
  const interest = calculateStakingInterest(stake.amount, stake.interest_rate / 100, daysStaked)

  await supabase.rpc('claim_stake', {
    p_stake_id: stakeId,
    p_interest: interest,
  })

  logVifixa('wallet', 'stake_claimed', { userId, stakeId, interest })
  return jsonResponse({ status: 'matured', principal: stake.amount, interest })
}

async function stakeCalculate(supabase: any, userId: string, params: any) {
  const { amount, days = 90 } = params
  const { data: systemStaked } = await supabase
    .from('wallets').select('balance').eq('wallet_type', 'stake')
  const totalStaked = (systemStaked || []).reduce((s: number, w: any) => s + Number(w.balance), 0)
  
  const rate = dynamicInterestRate(totalStaked, 0.7, days)
  const interest = calculateStakingInterest(amount || 100000, rate, days)

  return jsonResponse({ projectedRate: rate * 100, projectedInterest: interest, days })
}

// ─── DEPOSIT / WITHDRAW ────────────────────────────────────

async function deposit(supabase: any, userId: string, params: any) {
  const { amount, gateway = 'mock' } = params
  if (!amount || amount <= 0) return jsonResponse({ error: 'Invalid amount' }, 400)

  const { data, error } = await supabase.rpc('deposit_to_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_gateway: gateway,
  })

  if (error) throw error
  return jsonResponse({ transaction: data })
}

async function withdraw(supabase: any, userId: string, params: any) {
  const { amount, walletType = 'txn' } = params
  if (!amount || amount <= 0) return jsonResponse({ error: 'Invalid amount' }, 400)

  const fee = calculateFee(amount, 0.02) // 2% gateway fee
  const netAmount = amount - fee

  const { data, error } = await supabase.rpc('withdraw_from_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_fee: fee,
    p_wallet_type: walletType,
  })

  if (error) throw error
  return jsonResponse({ transaction: data, fee, netAmount })
}

// ─── HISTORY ───────────────────────────────────────────────

async function getHistory(supabase: any, userId: string, params: any) {
  const { walletType, limit = 20, offset = 0 } = params
  let query = supabase
    .from('transactions')
    .select('*')
    .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (walletType) query = query.eq('wallet_type', walletType)

  const { data } = await query
  return jsonResponse({ transactions: data || [], total: (data || []).length })
}

// ─── PRICING ───────────────────────────────────────────────

async function getPricing(supabase: any, params: any) {
  // Validate input
  if (!params.basePrice) return jsonResponse({ error: 'basePrice required' }, 400)
  
  const pricing = calculateDynamicPrice({
    basePrice: params.basePrice,
    demandMultiplier: params.demandMultiplier || 1.0,
    distanceKm: params.distanceKm || 0,
    workerTrustScore: params.workerTrustScore || 0.7,
    customerTier: params.customerTier || 'bronze',
    timeOfDay: new Date().getHours(),
    isWeekend: [0, 6].includes(new Date().getDay()),
    customerStakeBalance: params.customerStakeBalance || 0,
  })

  return jsonResponse(pricing)
}

// ─── VFC BALANCE ───────────────────────────────────────────

async function getVfcBalance(supabase: any, userId: string) {
  const { data } = await supabase
    .from('vfc_points')
    .select('*')
    .eq('user_id', userId)
    .single()

  return jsonResponse(data || { balance: 0, tier: 'bronze', multiplier: 1.0 })
}
