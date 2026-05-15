'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const WALLET_TYPES = [
  { id: 'txn', name: 'Ví giao dịch', icon: '💳' },
  { id: 'stake', name: 'Ví đầu tư', icon: '🏦' },
  { id: 'reward', name: 'Ví thưởng (VFC)', icon: '🎁' },
]

export default function WithdrawModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState(0)
  const [walletType, setWalletType] = useState('txn')
  const [loading, setLoading] = useState(false)

  async function handleWithdraw() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', amount, walletType }),
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      alert('Lỗi: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-2">💰 Rút tiền</h2>
        <p className="text-sm text-gray-500 mb-4">Phí rút: 2% · Tối thiểu: 50,000₫</p>

        <div className="space-y-2 mb-4">
          {WALLET_TYPES.map(w => (
            <button key={w.id} onClick={() => setWalletType(w.id)}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${walletType === w.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="text-xl mr-2">{w.icon}</span>
              <span className="font-medium text-sm">{w.name}</span>
            </button>
          ))}
        </div>

        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
          placeholder="Số tiền rút..."
          className="w-full px-4 py-2 border rounded-lg text-sm mb-4" min={50000} step={10000} />

        {amount >= 50000 && (
          <div className="p-3 bg-gray-50 rounded-lg mb-4 text-sm">
            <p className="text-gray-600">Số tiền: <strong>{amount.toLocaleString()}₫</strong></p>
            <p className="text-gray-600">Phí (2%): <strong className="text-red-500">-{Math.round(amount * 0.02).toLocaleString()}₫</strong></p>
            <p className="text-gray-600">Nhận: <strong className="text-emerald-600">{(amount - Math.round(amount * 0.02)).toLocaleString()}₫</strong></p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
          <button onClick={handleWithdraw} disabled={loading || amount < 50000}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {loading ? 'Đang xử lý...' : `Rút ${amount.toLocaleString()}₫`}
          </button>
        </div>
      </div>
    </div>
  )
}
