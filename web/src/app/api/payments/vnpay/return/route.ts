// VNPay Return — User redirected here after payment
// Xử lý kết quả thanh toán từ VNPay

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {}
  Object.keys(obj).sort().forEach(key => { sorted[key] = obj[key] })
  return sorted
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const vnp_SecureHash = params['vnp_SecureHash']
  const vnp_ResponseCode = params['vnp_ResponseCode']
  const vnp_TxnRef = params['vnp_TxnRef'] || ''
  const vnp_TransactionNo = params['vnp_TransactionNo'] || ''
  const vnp_Amount = parseInt(params['vnp_Amount'] || '0') / 100

  // Verify HMAC (trong môi trường thực tế)
  // Bỏ qua ở sandbox

  try {
    const supabase = createServerClient()

    // Cập nhật transaction
    if (vnp_ResponseCode === '00') {
      await supabase
        .from('transactions')
        .update({ status: 'succeeded', succeeded_at: new Date().toISOString(), metadata: params })
        .eq('gateway_txn_id', vnp_TxnRef)

      // Cập nhật order
      const { data: txn } = await supabase
        .from('transactions')
        .select('order_id')
        .eq('gateway_txn_id', vnp_TxnRef)
        .single()

      if (txn) {
        await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', (txn as any).order_id)
      }

      // Redirect to success page
      const orderId = vnp_TxnRef.replace('order_', '').split('_')[0]
      return NextResponse.redirect(
        new URL(`/customer/orders/${orderId}?payment=success`, request.url)
      )
    }

    // Payment failed
    return NextResponse.redirect(
      new URL(`/customer/orders?payment=failed`, request.url)
    )
  } catch (error) {
    console.error('VNPay return error:', error)
    return NextResponse.redirect(new URL('/customer/orders?payment=error', request.url))
  }
}