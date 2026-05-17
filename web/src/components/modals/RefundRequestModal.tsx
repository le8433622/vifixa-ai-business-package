'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const REFUND_REASONS = [
  'Dịch vụ không hoàn thành',
  'Chất lượng dịch vụ kém',
  'Báo giá sai so với thực tế',
  'Thợ không đến đúng hẹn',
  'Vật tư kém chất lượng',
  'Không hài lòng với kết quả',
  'Lý do khác',
]

interface RefundRequestModalProps {
  orderId: string
  maxAmount: number
  onClose: () => void
  onSuccess: () => void
}

export default function RefundRequestModal({ orderId, maxAmount, onClose, onSuccess }: RefundRequestModalProps) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(maxAmount)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason || !description.trim()) { setError('Vui lòng điền đầy đủ thông tin'); return }
    if (amount <= 0 || amount > maxAmount) { setError(`Số tiền hoàn từ 0 đến ${maxAmount.toLocaleString()}₫`); return }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('refund_requests').insert({
        order_id: orderId,
        customer_id: session.user.id,
        amount,
        reason: `${reason}: ${description}`,
        status: 'pending',
      })
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">💰 Yêu cầu hoàn tiền</h2>
        <p className="text-sm text-gray-500 mb-4">Số tiền tối đa: <strong className="text-gray-800">{maxAmount.toLocaleString()}₫</strong></p>

        <select value={reason} onChange={e => setReason(e.target.value)}
          className="w-full px-3 py-2 border rounded-xl mb-3">
          <option value="">-- Chọn lý do --</option>
          {REFUND_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Số tiền yêu cầu hoàn</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={maxAmount} step={10000}
              value={amount} onChange={e => setAmount(Number(e.target.value))}
              className="flex-1" />
            <span className="text-sm font-medium w-28 text-right">{amount.toLocaleString()}₫</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0₫</span>
            <button onClick={() => setAmount(Math.round(maxAmount * 0.5))} className="text-blue-600 hover:underline">50%</button>
            <button onClick={() => setAmount(maxAmount)} className="text-blue-600 hover:underline">100%</button>
          </div>
        </div>

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Mô tả chi tiết lý do yêu cầu hoàn tiền..."
          className="w-full px-4 py-3 border rounded-xl mb-4 h-24"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
          <button onClick={handleSubmit} disabled={submitting || !reason || !description.trim()}
            className="flex-1 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 font-medium">
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  )
}