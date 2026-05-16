'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Props {
  workerId: string
  workerName: string
  customerLocation: { lat: number; lng: number }
  onClose: () => void
  onSuccess?: () => void
}

const CATEGORIES = [
  { value: 'air_conditioning', label: 'Máy lạnh', icon: '❄️' },
  { value: 'electricity', label: 'Điện', icon: '💡' },
  { value: 'plumbing', label: 'Nước', icon: '🚿' },
  { value: 'appliance', label: 'Đồ gia dụng', icon: '🔧' },
  { value: 'camera', label: 'Camera', icon: '📷' },
  { value: 'other', label: 'Khác', icon: '🏠' },
]

export default function BookWorkerModal({ workerId, workerName, customerLocation, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  async function handleBook() {
    if (!category) { setError('Chọn loại dịch vụ'); return }
    setBooking(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/order/book-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          customer_id: session.user.id,
          worker_id: workerId,
          category,
          description,
          location_lat: customerLocation.lat,
          location_lng: customerLocation.lng,
          address,
        }),
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      onSuccess?.()
      router.push(`/customer/orders/${result.order.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">📅 Đặt thợ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <p className="text-sm text-gray-600">Đặt lịch với <strong>{workerName}</strong></p>

        <div>
          <label className="text-xs text-gray-500 font-medium">Dịch vụ *</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`p-3 rounded-xl border text-center text-sm transition ${category === c.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-xl block mb-1">{c.icon}</span>
                <span className="text-xs">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">Mô tả vấn đề</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ví dụ: Máy lạnh không chạy, remote bị hư..."
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium">Địa chỉ</label>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Số nhà, đường, quận..."
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

        <button onClick={handleBook} disabled={booking || !category}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
          {booking ? 'Đang đặt...' : 'Xác nhận đặt thợ'}
        </button>
      </div>
    </div>
  )
}
