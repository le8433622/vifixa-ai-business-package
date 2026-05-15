// VNPay IPN — Server-to-server notification from VNPay
// Instant Payment Notification handler

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const vnp_ResponseCode = params['vnp_ResponseCode']
  const vnp_TxnRef = params['vnp_TxnRef'] || ''
  const vnp_TransactionNo = params['vnp_TransactionNo'] || ''

  try {
    const supabase = createServerClient()

    if (vnp_ResponseCode === '00') {
      // Thanh toán thành công
      await supabase
        .from('transactions')
        .update({
          status: 'succeeded',
          gateway_txn_id: vnp_TransactionNo,
          succeeded_at: new Date().toISOString(),
          metadata: params,
        })
        .eq('gateway_txn_id', vnp_TxnRef)

      // Lấy order_id từ transaction
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

      // Trả về VNPay: xác nhận đã nhận IPN
      return NextResponse.json({ RspCode: '00', Message: 'Success' })
    }

    // Thanh toán thất bại
    await supabase
      .from('transactions')
      .update({ status: 'failed', metadata: params })
      .eq('gateway_txn_id', vnp_TxnRef)

    return NextResponse.json({ RspCode: '01', Message: 'Failed' })
  } catch (error) {
    console.error('VNPay IPN error:', error)
    return NextResponse.json({ RspCode: '99', Message: 'Error' })
  }
}