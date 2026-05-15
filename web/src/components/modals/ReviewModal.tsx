'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ReviewModalProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ReviewModal({ orderId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (rating === 0) { setError('Vui lòng chọn số sao'); return }
    setSubmitting(true)
    try {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ rating, review_comment: comment })
        .eq('id', orderId)
      if (error) throw error
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">⭐ Đánh giá dịch vụ</h2>

        <div className="flex gap-1 mb-4 justify-center">
          {[1,2,3,4,5].map(star => (
            <button key={star} type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-4xl focus:outline-none transition-colors"
              style={{ color: star <= (hoverRating || rating) ? '#FBBF24' : '#D1D5DB' }}
            >★</button>
          ))}
        </div>

        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          className="w-full px-4 py-3 border rounded-xl mb-4 h-24"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={submitting || rating === 0}
            className="flex-1 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 disabled:opacity-50 font-medium">
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  )
}
