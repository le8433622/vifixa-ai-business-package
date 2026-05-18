'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const GATEWAYS = [
  { id: 'vnpay', name: 'VNPay', icon: '💳', desc: 'ATM, QR, Internet Banking', color: 'border-blue-200 bg-blue-50', badge: '🇻🇳' },
  { id: 'stripe', name: 'Stripe', icon: '💳', desc: 'Thẻ quốc tế, Apple Pay', color: 'border-purple-200 bg-purple-50', badge: '🌍' },
  { id: 'wallet', name: 'Ví Vifixa', icon: '🏦', desc: 'Số dư ví giao dịch', color: 'border-emerald-200 bg-emerald-50', badge: '⚡' },
]

const PRESET_AMOUNTS = [0, 100000, 200000, 500000, 1000000, 2000000]

export default function PaymentPage() {
  const router = useRouter()
  const params = useSearchParams()
  const orderId = params.get('order_id')
  const amountParam = Number(params.get('amount') || 0)

  const [selectedGateway, setSelectedGateway] = useState('vnpay')
  const [amount, setAmount] = useState(amountParam)
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'done'>('select')
  const [result, setResult] = useState<any>(null)
  const [workerId, setWorkerId] = useState<string>('')

  useEffect(() => {
    if (orderId && amountParam <= 0) {
      loadOrderAmount()
    }
    if (orderId) loadOrderWorker()
    if (selectedGateway === 'wallet') loadWalletBalance()
  }, [selectedGateway, orderId])

  async function loadOrderWorker() {
    const { data } = await supabase.from('orders').select('worker_id').eq('id', orderId).single()
    if (data?.worker_id) setWorkerId(data.worker_id)
  }

  async function loadOrderAmount() {
    const { data } = await supabase.from('orders').select('estimated_price').eq('id', orderId).single()
    if (data?.estimated_price) setAmount(data.estimated_price)
  }

  async function loadWalletBalance() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'balance' }),
    })
    const data = await res.json()
    if (data?.wallets?.txn) setWalletBalance(data.wallets.txn)
  }

  async function handlePay() {
    setStep('processing')
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    try {
      if (selectedGateway === 'wallet') {
        if (amount > walletBalance) {
          alert('Số dư không đủ. Vui lòng nạp thêm.')
          setStep('select'); setLoading(false); return
        }
        if (!workerId) { alert('Chưa có thợ được chỉ định. Vui lòng đợi ghép thợ.'); setStep('select'); setLoading(false); return }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'escrow:hold', orderId, workerId, amount }),
        })
        const data = await res.json()
        if (data.status === 'pending') {
          setResult({ success: true, method: 'wallet' })
          setStep('done')
        }
        return
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-process/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: selectedGateway,
          order_id: orderId, amount,
          return_url: `${window.location.origin}/api/payments/vnpay/return`,
        }),
      })
      const data = await res.json()
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else {
        setResult({ success: true })
        setStep('done')
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
      setStep('select')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Back + Title */}
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Quay lại
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['select', 'confirm', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                : ['processing', 'done'].includes(step) && ['select', 'confirm'].includes(s) && step !== s ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-500'
              }`}>
                {['processing', 'done'].includes(step) && ['select', 'confirm'].includes(s) && step !== s ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-12 h-0.5 ${['processing', 'done'].includes(step) ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 'select' && (
          <div className="bg-white rounded-2xl shadow-xl border p-6 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💳 Thanh toán</h1>
              {orderId && <p className="text-sm text-gray-500 mt-1">Đơn hàng #{orderId.slice(0, 8)}</p>}
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Số tiền</label>
              <div className="text-4xl font-bold text-blue-600 mb-3">
                {(amount || 0).toLocaleString()}₫
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount('') }}
                    className={`p-2 rounded-xl text-sm font-medium border-2 transition ${
                      amount === a && a > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}>
                    {a === 0 ? 'Tùy chọn' : `${(a / 1000).toFixed(0)}k`}
                  </button>
                ))}
              </div>
              {amount === 0 && (
                <input type="number" value={customAmount} onChange={e => setAmount(Number(e.target.value) || 0)}
                  placeholder="Nhập số tiền..."
                  className="w-full mt-2 px-4 py-2 border rounded-xl text-sm" min={10000} />
              )}
            </div>

            {/* Gateway */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Phương thức</label>
              <div className="space-y-2">
                {GATEWAYS.map(g => (
                  <button key={g.id} onClick={() => setSelectedGateway(g.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      selectedGateway === g.id ? g.color + ' border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">{g.name} <span className="text-xs">{g.badge}</span></p>
                        <p className="text-xs text-gray-500">{g.desc}</p>
                      </div>
                      {selectedGateway === g.id && <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet balance hint */}
            {selectedGateway === 'wallet' && (
              <div className={`p-3 rounded-xl text-sm ${amount > walletBalance ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                Số dư ví: <strong>{walletBalance.toLocaleString()}₫</strong>
                {amount > walletBalance && <span className="block text-xs mt-1">⚠️ Không đủ số dư. Vui lòng nạp thêm hoặc chọn phương thức khác.</span>}
              </div>
            )}

            <button onClick={() => setStep('confirm')} disabled={amount < 10000}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200">
              Tiếp tục
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="bg-white rounded-2xl shadow-xl border p-6 space-y-5">
            <h2 className="text-xl font-bold text-gray-900">📋 Xác nhận thanh toán</h2>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Phương thức</span>
                <span className="font-medium">{GATEWAYS.find(g => g.id === selectedGateway)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền</span>
                <span className="font-bold text-xl text-blue-600">{(amount || 0).toLocaleString()}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí giao dịch</span>
                <span className="text-emerald-600 font-medium">Miễn phí</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-medium">Tổng thanh toán</span>
                <span className="font-bold text-xl text-blue-600">{(amount || 0).toLocaleString()}₫</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('select')} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50">
                Quay lại
              </button>
              <button onClick={handlePay} disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg">
                {loading ? '⏳ Đang xử lý...' : `✅ Xác nhận thanh toán`}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-white rounded-2xl shadow-xl border p-10 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Đang xử lý thanh toán...</p>
            <p className="text-sm text-gray-500">Vui lòng không đóng trang này</p>
          </div>
        )}

        {step === 'done' && result?.success && (
          <div className="bg-white rounded-2xl shadow-xl border p-10 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">✅ Thanh toán thành công!</h2>
            <p className="text-gray-500">{(amount || 0).toLocaleString()}₫ qua {GATEWAYS.find(g => g.id === selectedGateway)?.name}</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => router.push(orderId ? `/customer/orders/${orderId}` : '/customer/orders')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                📋 Xem đơn hàng
              </button>
              <button onClick={() => router.push('/customer')}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50">
                🏠 Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
