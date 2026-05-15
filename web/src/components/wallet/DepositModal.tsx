'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const GATEWAYS = [
  { id: 'vnpay', name: 'VNPay', icon: '💳', desc: 'ATM · QR · Internet Banking' },
  { id: 'stripe', name: 'Stripe', icon: '💳', desc: 'Card · Apple Pay · Google Pay' },
  { id: 'mock', name: 'Mock Test', icon: '🧪', desc: 'Test — 90% success rate' },
]

export default function DepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState(100000)
  const [gateway, setGateway] = useState('mock')
  const [loading, setLoading] = useState(false)

  const amounts = [100000, 200000, 500000, 1000000, 2000000, 5000000]

  async function handleDeposit() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deposit', amount, gateway }),
      })
      const data = await res.json()
      
      if (gateway === 'vnpay' && data.redirect_url) {
        window.location.href = data.redirect_url
      } else if (gateway === 'stripe' && data.client_secret) {
        alert('Stripe payment initiated: ' + data.client_secret)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">💳 Nạp tiền</h2>
        <p className="text-sm text-gray-500 mb-4">Chọn số tiền và phương thức thanh toán</p>

        {/* Amount */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {amounts.map(a => (
            <button key={a} onClick={() => setAmount(a)}
              className={`p-3 rounded-xl text-sm font-medium border-2 transition ${amount === a ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
              {a.toLocaleString()}₫
            </button>
          ))}
        </div>
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg text-sm mb-4" min={10000} step={10000} />

        {/* Gateway */}
        <div className="space-y-2 mb-4">
          {GATEWAYS.map(g => (
            <button key={g.id} onClick={() => setGateway(g.id)}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${gateway === g.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{g.icon}</span>
                <div>
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-gray-500">{g.desc}</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 ${gateway === g.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {gateway === g.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
          <button onClick={handleDeposit} disabled={loading || amount < 10000}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'Đang xử lý...' : `Nạp ${amount.toLocaleString()}₫`}
          </button>
        </div>
      </div>
    </div>
  )
}
