import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const WORKFLOW_ENGINE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/workflow-engine`
  : null

async function triggerWorkflow(orderId: string, event: string, data?: Record<string, unknown>) {
  if (!WORKFLOW_ENGINE_URL) return
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return
  try {
    await fetch(WORKFLOW_ENGINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ order_id: orderId, event, data }),
    })
  } catch (e) {
    console.error('[IPN] workflow trigger failed:', e)
  }
}

async function checkIdempotency(supabase: any, key: string): Promise<{ cached: boolean; response?: any }> {
  const { data } = await supabase
    .from('idempotency_keys')
    .select('response')
    .eq('key', key)
    .single()
  if (data) return { cached: true, response: data.response }
  return { cached: false }
}

async function storeIdempotency(supabase: any, key: string, response: any) {
  await supabase
    .from('idempotency_keys')
    .insert({ key, response })
    .catch(() => {})
}

function buildIdempotencyKey(params: Record<string, string>): string {
  return `vnpay_ipn:${params.vnp_TxnRef || ''}:${params.vnp_TransactionNo || ''}:${params.vnp_ResponseCode || ''}`
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const vnp_ResponseCode = params['vnp_ResponseCode']
  const vnp_TxnRef = params['vnp_TxnRef'] || ''
  const vnp_TransactionNo = params['vnp_TransactionNo'] || ''
  const idempotencyKey = buildIdempotencyKey(params)

  try {
    const supabase = createServerClient()

    const { cached, response } = await checkIdempotency(supabase, idempotencyKey)
    if (cached) {
      return NextResponse.json(response)
    }

    if (vnp_ResponseCode === '00') {
      await supabase
        .from('payment_intents')
        .update({
          status: 'succeeded',
          gateway_txn_id: vnp_TransactionNo,
          gateway_response: params,
          updated_at: new Date().toISOString(),
        })
        .eq('gateway_txn_id', vnp_TxnRef)

      await supabase
        .from('transactions')
        .update({
          status: 'succeeded',
          gateway_txn_id: vnp_TransactionNo,
          succeeded_at: new Date().toISOString(),
          metadata: params,
        })
        .eq('gateway_txn_id', vnp_TxnRef)

      let orderId: string | null = null
      const { data: pi } = await supabase
        .from('payment_intents')
        .select('order_id')
        .eq('gateway_txn_id', vnp_TxnRef)
        .single()
      if (pi) {
        orderId = (pi as any).order_id
      }
      if (!orderId) {
        const { data: txn } = await supabase
          .from('transactions')
          .select('order_id')
          .eq('gateway_txn_id', vnp_TxnRef)
          .single()
        if (txn) orderId = (txn as any).order_id
      }

      if (orderId) {
        await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId)

        triggerWorkflow(orderId, 'payment:succeeded', {
          vnp_TransactionNo,
          vnp_ResponseCode,
        })
      }

      const result = { RspCode: '00', Message: 'Success' }
      await storeIdempotency(supabase, idempotencyKey, result)
      return NextResponse.json(result)
    }

    await supabase
      .from('payment_intents')
      .update({ status: 'failed', gateway_response: params, updated_at: new Date().toISOString() })
      .eq('gateway_txn_id', vnp_TxnRef)

    await supabase
      .from('transactions')
      .update({ status: 'failed', metadata: params })
      .eq('gateway_txn_id', vnp_TxnRef)

    const { data: failedPi } = await supabase
      .from('payment_intents')
      .select('order_id')
      .eq('gateway_txn_id', vnp_TxnRef)
      .single()

    if (failedPi) {
      triggerWorkflow((failedPi as any).order_id, 'payment:failed', {
        vnp_TransactionNo,
        vnp_ResponseCode,
      })
    }

    const failResult = { RspCode: '01', Message: 'Failed' }
    await storeIdempotency(supabase, idempotencyKey, failResult)
    return NextResponse.json(failResult)
  } catch (error) {
    console.error('VNPay IPN error:', error)
    return NextResponse.json({ RspCode: '99', Message: 'Error' })
  }
}
