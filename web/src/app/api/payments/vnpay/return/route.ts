// 💳 VNPay Return Handler
// Sau khi khách thanh toán xong, VNPay redirect về đây

import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams)
    const vnp_SecureHash = params.vnp_SecureHash
    const orderId = params.vnp_TxnRef
    const responseCode = params.vnp_ResponseCode

    // Verify signature
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: config } = await supabase
      .from('gateway_configs').select('sandbox_keys').eq('key', 'vnpay').single()
    
    const secretKey = (config as any)?.sandbox_keys?.secretKey
    if (secretKey) {
      const signData = Object.keys(params)
        .filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&')
      const computedHash = createHmac('sha512', secretKey).update(signData).digest('hex')
      if (computedHash !== vnp_SecureHash) {
        return NextResponse.redirect(new URL('/customer/orders?payment=fail', req.url))
      }
    }

    // Redirect based on result
    if (responseCode === '00') {
      return NextResponse.redirect(new URL(`/customer/orders/${orderId}?payment=success`, req.url))
    }
    return NextResponse.redirect(new URL(`/customer/orders/${orderId}?payment=fail`, req.url))
  } catch {
    return NextResponse.redirect(new URL('/customer/orders?payment=error', req.url))
  }
}
