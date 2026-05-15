'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const COMPLAINT_TYPES = [
  'Chất lượng kém', 'Thợ đến muộn', 'Báo giá sai',
  'Thiếu chuyên nghiệp', 'Vật tư không đúng', 'Chưa hoàn thành',
  'Thái độ không tốt', 'Khác',
]

interface ComplaintModalProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ComplaintModal({ orderId, onClose, onSuccess }: ComplaintModalProps) {
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!type || !description.trim()) { setError('Vui lòng điền đầy đủ'); return }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('complaints').insert({
        order_id: orderId, customer_id: session.user.id,
        complaint_type: type, description, status: 'pending',
      })
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">⚠️ Khiếu nại</h2>

        <select value={type} onChange={e => setType(e.target.value)}
          className="w-full px-3 py-2 border rounded-xl mb-4">
          <option value="">-- Chọn loại --</option>
          {COMPLAINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Mô tả chi tiết..."
          className="w-full px-4 py-3 border rounded-xl mb-4 h-24"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">Hủy</button>
          <button onClick={handleSubmit} disabled={submitting || !type || !description.trim()}
            className="flex-1 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium">
            {submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>
        </div>
      </div>
    </div>
  )
}
