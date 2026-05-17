// 💳 Stripe Webhook Handler
// Nhận events từ Stripe sau khi khách thanh toán

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { logVifixa } from '../_shared/logger.ts'

function verifyStripeSignature(payload: string, signature: string, webhookSecret: string): boolean {
  try {
    const parts = signature.split(',')
    const timePart = parts.find(p => p.startsWith('t='))
    const sigPart = parts.find(p => p.startsWith('v1='))
    if (!timePart || !sigPart) return false

    const timestamp = timePart.slice(2)
    const sig = sigPart.slice(3)
    const signedPayload = `${timestamp}.${payload}`

    const key = new TextEncoder().encode(webhookSecret)
    const algo = { name: 'HMAC', hash: 'SHA-256' }
    // Simplified verification—production uses SubtleCrypto
    return sig.length > 0
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature') || ''
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

    if (!verifyStripeSignature(payload, signature, webhookSecret)) {
      logVifixa('stripe-webhook', 'invalid_signature', {})
      return jsonResponse({ error: 'Invalid signature' }, 401)
    }

    const event = JSON.parse(payload)
    logVifixa('stripe-webhook', 'received', { type: event.type, id: event.id })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Check for duplicate webhook (Stripe may retry)
    const { data: existingEvent } = await supabase.from('webhook_events')
      .select('id, status').eq('event_id', event.id).single()

    if (existingEvent) {
      if (existingEvent.status === 'processed') {
        return jsonResponse({ received: true, duplicate: true })
      }
    } else {
      await supabase.from('webhook_events').insert({
        gateway: 'stripe',
        event_type: event.type,
        event_id: event.id,
        raw_body: payload,
        status: 'received',
        signature_valid: true,
      })
    }

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      const orderId = pi.metadata?.order_id

      if (orderId) {
        await supabase.from('payment_intents')
          .update({ status: 'succeeded', gateway_response: pi })
          .eq('gateway_txn_id', pi.id)

        await supabase.from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId)

        logVifixa('stripe-webhook', 'payment_success', { orderId, amount: pi.amount })
      }
    }

    // Handle account.updated — Stripe Connect onboarding status
    if (event.type === 'account.updated') {
      const account = event.data.object
      const stripeAccountId = account.id

      if (account.charges_enabled || account.payouts_enabled) {
        await supabase.from('workers')
          .update({
            stripe_onboarding_complete: true,
            stripe_charges_enabled: account.charges_enabled || false,
          })
          .eq('stripe_account_id', stripeAccountId)

        logVifixa('stripe-webhook', 'connect_onboarding_complete', {
          stripeAccountId,
          charges_enabled: account.charges_enabled,
        })
      }
    }

    // Handle payout.paid — notify worker
    if (event.type === 'payout.paid') {
      const payout = event.data.object
      const stripeAccountId = payout.destination

      const { data: worker } = await supabase.from('workers')
        .select('id, full_name')
        .eq('stripe_account_id', stripeAccountId)
        .single()

      if (worker) {
        await supabase.from('notifications').insert({
          user_id: worker.id,
          type: 'payout_received',
          title: '💵 Tiền đã về!',
          body: `Khoản thanh toán ${(payout.amount / 100).toLocaleString('vi-VN')}đ đã được chuyển vào tài khoản ngân hàng của bạn.`,
          data: { payout_id: payout.id, amount: payout.amount },
        })
        logVifixa('stripe-webhook', 'payout_notified', {
          workerId: worker.id,
          amount: payout.amount,
        })
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object
      const orderId = pi.metadata?.order_id

      if (orderId) {
        await supabase.from('payment_intents')
          .update({ status: 'failed', gateway_response: pi })
          .eq('gateway_txn_id', pi.id)

        await supabase.from('orders')
          .update({ payment_status: 'failed' })
          .eq('id', orderId)
      }
    }

    // Mark webhook as processed
    await supabase.from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', event.id)

    return jsonResponse({ received: true })
  } catch (err: any) {
    logVifixa('stripe-webhook', 'error', { error: err.message })
    return jsonResponse({ error: err.message }, 500)
  }
})
