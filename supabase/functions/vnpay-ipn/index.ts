// 💳 VNPay IPN (Instant Payment Notification) Handler
// Nhận callback từ VNPay sau khi khách thanh toán xong

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { logVifixa } from '../_shared/logger.ts'
import { createHmac } from 'node:crypto'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const params = Object.fromEntries(new URL(req.url).searchParams)
    logVifixa('vnpay-ipn', 'received', { params: Object.keys(params) })

    // Verify VNPay signature
    const { data: config } = await supabase
      .from('gateway_configs').select('sandbox_keys').eq('key', 'vnpay').single()
    
    const secretKey = config?.sandboxKeys?.secretKey
    if (!secretKey) throw new Error('VNPay secret key not configured')

    // Build signature string
    const signData = Object.keys(params)
      .filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')

    const secureHash = createHmac('sha512', secretKey).update(signData).digest('hex')
    
    if (secureHash !== params.vnp_SecureHash) {
      logVifixa('vnpay-ipn', 'invalid_signature', {})
      return new Response('{"RspCode":"97","Message":"Invalid signature"}',
        { headers: { 'Content-Type': 'application/json' } })
    }

    // Check transaction exists
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('gateway', 'vnpay')
      .eq('event_id', params.vnp_TransactionNo)
      .single()
      .catch(() => ({ data: null }))

    if (existing) {
      return new Response('{"RspCode":"02","Message":"Transaction already processed"}',
        { headers: { 'Content-Type': 'application/json' } })
    }

    // Store webhook event
    await supabase.from('webhook_events').insert({
      gateway: 'vnpay',
      event_type: 'payment',
      event_id: params.vnp_TransactionNo,
      raw_body: JSON.stringify(params),
      status: 'received',
      signature_valid: true,
    })

    // Update payment intent
    const orderId = params.vnp_TxnRef
    const success = params.vnp_ResponseCode === '00'
    const newStatus = success ? 'succeeded' : 'failed'

    await supabase.from('payment_intents')
      .update({ status: newStatus, gateway_txn_id: params.vnp_TransactionNo, gateway_response: params })
      .eq('order_id', orderId)

    // Update order payment status
    await supabase.from('orders')
      .update({ payment_status: success ? 'paid' : 'failed' })
      .eq('id', orderId)

    // Update webhook status
    await supabase.from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', params.vnp_TransactionNo)

    logVifixa('vnpay-ipn', success ? 'success' : 'failed', { orderId, txnNo: params.vnp_TransactionNo })

    return new Response(`{"RspCode":"00","Message":"${success ? 'Success' : 'Failed'}"}`,
      { headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    logVifixa('vnpay-ipn', 'error', { error: err.message })
    return new Response('{"RspCode":"99","Message":"Unknown error"}',
      { headers: { 'Content-Type': 'application/json' } })
  }
})
