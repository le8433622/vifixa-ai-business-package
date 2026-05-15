'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const GATEWAYS = [
  { id: 'vnpay', name: 'VNPay', icon: '💳', desc: 'Thanh toán qua ATM, QR, Internet Banking', color: 'from-blue-600 to-blue-700' },
  { id: 'stripe', name: 'Stripe', icon: '💳', desc: 'Thanh toán qua thẻ quốc tế, Apple Pay', color: 'from-purple-600 to-purple-700' },
  { id: 'wallet', name: 'Ví Vifixa', icon: '🏦', desc: 'Thanh toán bằng số dư ví giao dịch', color: 'from-emerald-600 to-emerald-700' },
]

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const amount = Number(searchParams.get('amount') || 0)
  
  const [selectedGateway, setSelectedGateway] = useState('vnpay')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handlePay() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    try {
      if (selectedGateway === 'wallet') {
        // Internal wallet payment
        const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'escrow:hold', orderId, workerId: 'pending', amount }),
        })
        const data = await res.json()
        if (data.status === 'pending') setResult({ success: true })
        return
      }

      // External gateway payment
      const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          gateway: selectedGateway,
          order_id: orderId,
          amount,
          return_url: `${window.location.origin}/api/payments/vnpay/return`,
        }),
      })
      const data = await res.json()

      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else if (data.qr_code) {
        setResult({ qr: data.qr_code, url: data.redirect_url })
      } else if (data.client_secret) {
        setResult({ clientSecret: data.client_secret })
      } else {
        setResult({ success: true })
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">← Quay lại</button>
      <h1 className="text-2xl font-bold">💳 Thanh toán</h1>

      {orderId && <p className="text-sm text-gray-500">Đơn hàng: {orderId.slice(0, 8)}...</p>}
      {amount > 0 && <p className="text-3xl font-bold text-blue-600">{amount.toLocaleString()}₫</p>}

      {/* Gateway Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Chọn phương thức thanh toán</p>
        {GATEWAYS.map(g => (
          <button key={g.id} onClick={() => setSelectedGateway(g.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedGateway === g.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1">
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-gray-500">{g.desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedGateway === g.id ? 'border-blue-500' : 'border-gray-300'}`}>
                {selectedGateway === g.id && <div className="w-3 h-3 rounded-full bg-blue-500" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Result */}
      {result?.qr && (
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="font-medium mb-2">Quét mã QR để thanh toán</p>
          <p className="text-xs text-gray-500 break-all">{result.qr}</p>
        </div>
      )}
      {result?.success && (
        <div className="p-4 bg-green-50 rounded-xl text-center">
          <p className="text-green-700 font-medium">✅ Thanh toán thành công!</p>
          <button onClick={() => router.push('/customer/orders')} className="mt-3 text-blue-600 hover:underline text-sm">Xem đơn hàng</button>
        </div>
      )}

      {/* Pay Button */}
      <button onClick={handlePay} disabled={loading}
        className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg">
        {loading ? 'Đang xử lý...' : `Thanh toán ${amount.toLocaleString()}₫`}
      </button>
    </div>
  )
}
