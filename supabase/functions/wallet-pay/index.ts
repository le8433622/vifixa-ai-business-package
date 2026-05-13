// Wallet Pay Edge Function
// Customer pays order from internal wallet via atomic RPC
// SECURITY: Uses lock_wallet_balance() with SELECT FOR UPDATE → no race condition

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  if (req.method === 'GET') {
    return await handleGetBalance(req)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  return await handlePay(req)
})

async function handlePay(req: Request): Promise<Response> {
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

  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return jsonResponse({ error: 'Missing order_id' }, 400)
    }

    // Get order price (server-side lookup, not for auth — that's in RPC)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, actual_price, final_price, estimated_price')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404)
    }

    if (order.customer_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const amount = Number(order.actual_price || order.final_price || order.estimated_price || 0)
    if (amount <= 0) {
      return jsonResponse({ error: 'Invalid order amount' }, 400)
    }

    // Atomic RPC: wallet deduct + order update + ledger — all in one transaction
    const { data: result, error: rpcError } = await supabase
      .rpc('lock_wallet_balance', {
        p_user_id: user.id,
        p_order_id: order.id,
        p_amount: amount,
      })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return jsonResponse({ error: 'Payment failed', detail: rpcError.message }, 500)
    }

    if (!result.success) {
      return jsonResponse({ error: result.error, detail: result }, 400)
    }

    return jsonResponse({
      success: true,
      balance: result.balance,
      locked_amount: result.locked_amount,
    })
  } catch (error: any) {
    console.error('Wallet pay error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
}

// GET handler: customer view balance & wallet info
async function handleGetBalance(req: Request): Promise<Response> {
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

  try {
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return jsonResponse({ balance: 0, locked_amount: 0, currency: 'VND', available: 0 })
    }

    return jsonResponse({
      balance: Number(wallet.balance),
      locked_amount: Number(wallet.locked_amount),
      currency: wallet.currency,
      available: Number(wallet.balance) - Number(wallet.locked_amount),
    })
  } catch (error: any) {
    console.error('Wallet balance error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
}
