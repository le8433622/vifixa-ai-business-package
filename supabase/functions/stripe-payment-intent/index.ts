// 💳 Stripe Payment Intent — Tạo + confirm payment
// Tích hợp với payment-process gateway abstraction

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { logVifixa } from '../_shared/logger.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { order_id, amount, currency = 'vnd', payment_type = 'fixed' } = await req.json()
    if (!order_id || !amount) return jsonResponse({ error: 'order_id and amount required' }, 400)

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return jsonResponse({ error: 'Stripe not configured' }, 500)

    // Create Stripe Payment Intent
    const stripeAmount = currency === 'vnd' ? amount : amount * 100 // cents
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(stripeAmount),
        currency: currency === 'vnd' ? 'vnd' : 'usd',
        'metadata[order_id]': order_id,
        'metadata[user_id]': user.id,
        'metadata[payment_type]': payment_type,
        'automatic_payment_methods[enabled]': 'true',
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Stripe error')

    // Store payment intent in our DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    await supabase.from('payment_intents').insert({
      order_id,
      user_id: user.id,
      gateway: 'stripe',
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      gateway_txn_id: data.id,
      gateway_response: { client_secret: data.client_secret },
    })

    logVifixa('stripe', 'payment_intent_created', { order_id, amount, stripeId: data.id })
    return jsonResponse({
      client_secret: data.client_secret,
      payment_intent_id: data.id,
      amount,
    })
  } catch (err: any) {
    logVifixa('stripe', 'error', { error: err.message })
    return jsonResponse({ error: err.message }, 500)
  }
})
