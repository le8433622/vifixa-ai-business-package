'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WarrantyModalProps {
  orderId: string
  orderCategory: string
  completedAt: string
  onClose: () => void
  onSuccess: () => void
}

export default function WarrantyModal({ orderId, orderCategory, completedAt, onClose, onSuccess }: WarrantyModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const completedDate = new Date(completedAt)
  const thirtyDays = new Date(completedDate)
  thirtyDays.setDate(thirtyDays.getDate() + 30)
  const eligible = new Date() <= thirtyDays

  async function handleSubmit() {
    if (!reason.trim()) { setError('Vui lòng nhập lý do'); return }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('warranty_claims').insert({
        order_id: orderId, customer_id: session.user.id,
        claim_reason: reason, status: 'pending',
      })
      await (supabase as any).from('orders').update({ status: 'disputed' }).eq('id', orderId)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  if (!eligible) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-xl font-bold mb-2">Hết hạn bảo hành</h2>
          <p className="text-gray-600 mb-4">Đã quá 30 ngày kể từ ngày hoàn thành.</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Đóng</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">🛡️ Yêu cầu bảo hành</h2>

        <div className="p-3 bg-blue-50 rounded-xl mb-4 text-sm">
          <p>{orderCategory} · Hoàn thành: {new Date(completedAt).toLocaleDateString('vi-VN')}</p>
          <p className="text-green-600 font-medium mt-1">✅ Còn hạn bảo hành</p>
        </div>

        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Mô tả vấn đề cần bảo hành..."
          className="w-full px-4 py-3 border rounded-xl mb-4 h-24"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
          <button onClick={handleSubmit} disabled={submitting || !reason.trim()}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  )
}
