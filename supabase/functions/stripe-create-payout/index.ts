// Stripe Create Payout — Chuyển tiền từ platform → worker via Stripe Connect
// POST: { worker_id: string, amount: number }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

const STRIPE_API = 'https://api.stripe.com/v1'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return jsonResponse({ error: 'Stripe not configured' }, 500)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Check admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Only admins can create payouts' }, 403)
    }

    const { worker_id, amount } = await req.json()
    if (!worker_id || !amount || amount <= 0) {
      return jsonResponse({ error: 'Missing worker_id or invalid amount' }, 400)
    }

    // Get worker's Stripe Connect account
    const { data: worker } = await supabase.from('workers')
      .select('stripe_account_id, full_name')
      .eq('id', worker_id)
      .single()

    if (!worker?.stripe_account_id) {
      return jsonResponse({ error: 'Worker has no Stripe Connect account' }, 400)
    }

    // Create a transfer to the worker's Connect account
    const transferResp = await fetch(`${STRIPE_API}/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount)),
        currency: 'vnd',
        destination: worker.stripe_account_id as string,
        description: `Payout to ${worker.full_name || worker_id}`,
      }),
    })

    if (!transferResp.ok) {
      const errBody = await transferResp.text()
      console.error('[stripe-payout] transfer failed:', errBody)
      return jsonResponse({ error: 'Transfer failed', details: errBody }, 400)
    }

    const transfer = await transferResp.json()

    // Record payout
    await supabase.from('payouts').insert({
      worker_id,
      amount,
      currency: 'VND',
      stripe_transfer_id: transfer.id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    return jsonResponse({
      success: true,
      transfer_id: transfer.id,
      amount,
      status: 'completed',
    })
  } catch (error: any) {
    console.error('[stripe-payout] error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})