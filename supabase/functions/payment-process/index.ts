// Payment Process Edge Function
// Handles: create payment, webhook, get status, refund
// Uses PaymentGateway abstraction layer

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import {
  PaymentGateway,
  GatewayConfig,
  CreatePaymentRequest,
  NormalizedEvent,
  PaymentStatus,
} from '../_shared/payment-gateway.ts'

// Import all gateways to register them
import '../_shared/gateways/vnpay.ts'
import '../_shared/gateways/momo.ts'
import '../_shared/gateways/zalopay.ts'
import '../_shared/gateways/stripe.ts'
import '../_shared/gateways/mock.ts'
import {
  getGateway,
  getActiveGateways,
  listRegisteredGateways,
} from '../_shared/payment-gateway.ts'

// ========== SERVE ==========
Deno.serve(async (req: Request) => {
  const optionsResp = handleOptions(req)
  if (optionsResp) return optionsResp

  // Initialize Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Route handling based on path
  const url = new URL(req.url)
  const path = url.pathname.replace('/functions/v1/payment-process', '')
  
  try {
    // POST /create - Create a payment
    if (path === '/create' && req.method === 'POST') {
      return await handleCreatePayment(req, supabase)
    }

    // POST /webhook/:gateway - Handle webhook
    if (path.startsWith('/webhook/') && req.method === 'POST') {
      const gatewayName = path.split('/')[2]
      return await handleWebhook(req, supabase, gatewayName)
    }

    // GET /status - Get payment status
    if (path === '/status' && req.method === 'GET') {
      return await handleGetStatus(req, supabase)
    }

    // POST /refund - Refund payment
    if (path === '/refund' && req.method === 'POST') {
      return await handleRefund(req, supabase)
    }

    // GET /gateways - List available gateways (admin only)
    if (path === '/gateways' && req.method === 'GET') {
      return await handleListGateways(req, supabase)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (error: any) {
    console.error('Payment process error:', error)
    return jsonResponse(
      { error: error.message || 'Internal server error' },
      500
    )
  }
})

// ========== HANDLERS ==========

async function handleCreatePayment(req: Request, supabase: any): Promise<Response> {
  // Verify auth
  let user: any
  try {
    // verifyAuth returns { id, email }
    const auth = await verifyAuth(req)
    user = auth
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // Check if payment_gateway feature is enabled
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'payment_gateway')
    .single()

  if (!flag?.enabled) {
    return jsonResponse({ error: 'Payment gateway feature is disabled' }, 503)
  }

  // Parse request
  const body = await req.json()
  const { order_id, amount, gateway, return_url, description } = body

  if (!order_id || !amount) {
    return jsonResponse({ error: 'Missing order_id or amount' }, 400)
  }

  // Get gateway config
  const { data: config, error: configError } = await supabase
    .from('gateway_configs')
    .select('*')
    .eq('key', gateway || 'mock')
    .eq('active', true)
    .single()

  if (configError || !config) {
    return jsonResponse({ error: 'Gateway not found or not active' }, 404)
  }

  // Create payment request
  const paymentRequest: CreatePaymentRequest = {
    amount: { amount, currency: 'VND' },
    idempotencyKey: `order_${order_id}_${Date.now()}`,
    description: description || `Payment for order ${order_id}`,
    returnUrl: return_url,
    customer: { id: user.id },
    metadata: { order_id, user_id: user.id },
  }

  // Get gateway instance
  const gatewayInstance = getGateway(
    config.key,
    config as any as GatewayConfig
  )

  // Create payment
  const result = await gatewayInstance.createPayment(paymentRequest)

  // Save payment intent
  const { error: saveError } = await supabase
    .from('payment_intents')
    .insert({
      gateway: config.key,
      gateway_payment_id: result.id,
      order_id,
      user_id: user.id,
      amount: paymentRequest.amount.amount,
      currency: paymentRequest.amount.currency,
      status: result.status,
      redirect_url: result.redirectUrl,
      qr_code: result.qrCode,
      deep_link: result.deepLink,
      gateway_response: result.raw,
    })

  if (saveError) {
    console.error('Error saving payment intent:', saveError)
  }

  return jsonResponse({
    payment_id: result.id,
    status: result.status,
    redirect_url: result.redirectUrl,
    qr_code: result.qrCode,
    deep_link: result.deepLink,
  })
}

async function handleWebhook(req: Request, supabase: any, gatewayName: string): Promise<Response> {
  const payload = await req.text()
  const signature = req.headers.get('x-signature') || ''

  // Get gateway config
  const { data: config } = await supabase
    .from('gateway_configs')
    .select('*')
    .eq('key', gatewayName)
    .single()

  if (!config) {
    return jsonResponse({ error: 'Gateway not found' }, 404)
  }

  // Get gateway instance
  const gatewayInstance: PaymentGateway = getGateway(
    config.key,
    config as any as GatewayConfig
  )

  // Verify webhook
  const isValid = gatewayInstance.verifyWebhook(payload, signature)
  if (!isValid) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 401)
  }

  // Normalize event
  const event: NormalizedEvent = gatewayInstance.normalizeWebhook(
    JSON.parse(payload),
    Object.fromEntries(req.headers.entries())
  )

  // Check for duplicate
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('gateway', event.gateway)
    .eq('event_id', event.id)
    .single()

  if (existingEvent) {
    return jsonResponse({ success: true, message: 'Already processed' })
  }

  // Save webhook event
  await supabase
    .from('webhook_events')
    .insert({
      gateway: event.gateway,
      event_id: event.id,
      type: event.type,
      status: event.status,
      payment_intent_id: event.paymentId,
      raw: event.raw,
      processed: false,
    })

  // Update payment intent status
  const { data: paymentIntent } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('gateway_payment_id', event.paymentId)
    .single()

  if (paymentIntent) {
    const updates: any = {
      status: event.status,
      updated_at: new Date().toISOString(),
    }

    if (event.status === 'succeeded') {
      updates.succeeded_at = event.timestamp.toISOString()
    } else if (event.status === 'failed') {
      updates.failed_at = new Date().toISOString()
    }

    await supabase
      .from('payment_intents')
      .update(updates)
      .eq('id', paymentIntent.id)

    // If succeeded, update order and create ledger entries
    if (event.status === 'succeeded' && paymentIntent.order_id) {
      // Update order
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: event.timestamp.toISOString(),
        })
        .eq('id', paymentIntent.order_id)

      // Get order details for ledger
      const { data: order } = await supabase
        .from('orders')
        .select('worker_id, platform_fee, worker_payout_amount')
        .eq('id', paymentIntent.order_id)
        .single()

      if (order) {
        const transactionId = `txn_${Date.now()}`

        // Ledger: Customer payment (credit platform)
        await supabase
          .from('ledger_entries')
          .insert({
            transaction_id: transactionId,
            wallet_id: paymentIntent.user_id, // customer wallet (if exists)
            account: 'platform.revenue',
            direction: 'credit',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            reference_type: 'payment',
            reference_id: paymentIntent.order_id,
            description: `Payment for order ${paymentIntent.order_id}`,
          })

        // Ledger: Platform fee (if any)
        if (order.platform_fee) {
          await supabase
            .from('ledger_entries')
            .insert({
              transaction_id: transactionId,
              account: 'platform.fee',
              direction: 'debit',
              amount: order.platform_fee,
              currency: paymentIntent.currency,
              reference_type: 'fee',
              reference_id: paymentIntent.order_id,
              description: 'Platform fee',
            })
        }

        // Ledger: Worker payout (escrow)
        if (order.worker_id && order.worker_payout_amount) {
          // Credit worker wallet (held in escrow)
          const { data: workerWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', order.worker_id)
            .single()

          if (workerWallet) {
            await supabase
              .from('ledger_entries')
              .insert({
                transaction_id: transactionId,
                wallet_id: workerWallet.id,
                account: 'escrow.held',
                direction: 'credit',
                amount: order.worker_payout_amount,
                currency: paymentIntent.currency,
                reference_type: 'escrow',
                reference_id: paymentIntent.order_id,
                description: `Escrow for order ${paymentIntent.order_id}`,
              })
          }
        }
      }
    }
  }

  // Mark event as processed
  await supabase
    .from('webhook_events')
    .update({ processed: true })
    .eq('event_id', event.id)

  return jsonResponse({ success: true })
}

async function handleGetStatus(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url)
  const paymentId = url.searchParams.get('payment_id')
  const orderId = url.searchParams.get('order_id')

  if (!paymentId && !orderId) {
    return jsonResponse({ error: 'Missing payment_id or order_id' }, 400)
  }

  let query = supabase
    .from('payment_intents')
    .select('*')

  if (paymentId) {
    query = query.eq('gateway_payment_id', paymentId)
  } else {
    query = query.eq('order_id', orderId)
  }

  const { data: payment, error } = await query.single()

  if (error || !payment) {
    return jsonResponse({ error: 'Payment not found' }, 404)
  }

  return jsonResponse({
    payment_id: payment.gateway_payment_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    succeeded_at: payment.succeeded_at,
    failed_at: payment.failed_at,
  })
}

async function handleRefund(req: Request, supabase: any): Promise<Response> {
  // Verify admin
  try {
    await verifyAuth(req)
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const body = await req.json()
  const { payment_id, amount } = body

  if (!payment_id) {
    return jsonResponse({ error: 'Missing payment_id' }, 400)
  }

  // Get payment intent
  const { data: payment } = await supabase
    .from('payment_intents')
    .select('*, gateway_configs(*)')
    .eq('gateway_payment_id', payment_id)
    .single()

  if (!payment) {
    return jsonResponse({ error: 'Payment not found' }, 404)
  }

  // Get gateway instance
  const gatewayInstance: PaymentGateway = getGateway(
    payment.gateway_configs.key,
    payment.gateway_configs as any as GatewayConfig
  )

  // Process refund
  const refundResult = await gatewayInstance.refundPayment(
    payment_id,
    amount ? { amount, currency: payment.currency } : undefined
  )

  // Update payment intent
  await supabase
    .from('payment_intents')
    .update({ status: refundResult.status })
    .eq('id', payment.id)

  return jsonResponse({
    refund_id: refundResult.id,
    status: refundResult.status,
    amount: refundResult.amount,
  })
}

async function handleListGateways(_req: Request, supabase: any): Promise<Response> {
  const { data: configs, error } = await supabase
    .from('gateway_configs')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: true })

  if (error) {
    return jsonResponse({ error: 'Failed to fetch gateways' }, 500)
  }

  return jsonResponse({
    gateways: configs.map((c: any) => ({
      key: c.key,
      display_name: c.display_name,
      priority: c.priority,
      supported_currencies: c.supported_currencies,
      supported_methods: c.supported_methods,
    })),
    registered: listRegisteredGateways(),
  })
}
