'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const CATEGORIES = [
  { id: 'air_conditioning', name: 'Máy lạnh', icon: '❄️', desc: 'Sửa, lắp, vệ sinh máy lạnh' },
  { id: 'electricity', name: 'Điện', icon: '💡', desc: 'Sửa điện, lắp đặt thiết bị điện' },
  { id: 'plumbing', name: 'Nước', icon: '🚿', desc: 'Sửa ống nước, thông tắc, rò rỉ' },
  { id: 'camera', name: 'Camera', icon: '📷', desc: 'Lắp đặt camera, khóa cửa thông minh' },
  { id: 'refrigerator', name: 'Tủ lạnh', icon: '🧊', desc: 'Sửa tủ lạnh, thay gas, vệ sinh' },
  { id: 'washing_machine', name: 'Máy giặt', icon: '🔄', desc: 'Sửa máy giặt, lỗi không vắt' },
]

const TIME_OPTIONS = [
  { value: 'asap', label: '⚡ ASAP (gấp)', desc: 'Trong vòng 2 giờ' },
  { value: 'today', label: '📅 Hôm nay', desc: 'Trong ngày hôm nay' },
  { value: 'scheduled', label: '🗓 Hẹn giờ', desc: 'Chọn ngày giờ cụ thể' },
]

export default function ServiceRequestPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1: Category
  const [category, setCategory] = useState('')

  // Step 2: Description
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Time & Location
  const [timeOption, setTimeOption] = useState('asap')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState(10.8231)
  const [lng, setLng] = useState(106.6297)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  async function handleGetLocation() {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setUseCurrentLocation(true) },
      () => alert('Không lấy được vị trí'),
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Upload images
    const mediaUrls: string[] = []
    for (const img of images) {
      const res = await fetch(img)
      const blob = await res.blob()
      const fileName = `sr-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const { data } = await supabase.storage.from('service-media').upload(fileName, blob)
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('service-media').getPublicUrl(data.path)
        mediaUrls.push(publicUrl)
      }
    }

    // Create order directly (manual mode — bypass AI)
    const { data: order, error } = await supabase.from('orders').insert({
      customer_id: session.user.id,
      category,
      description,
      media_urls: mediaUrls,
      location_lat: lat,
      location_lng: lng,
      address,
      estimated_price: 0,
      status: 'pending',
      metadata: { time_option: timeOption, scheduled_date: scheduledDate, scheduled_time: scheduledTime },
    }).select().single()

    if (error) { alert('Lỗi: ' + error.message); setSubmitting(false); return }
    router.push(`/customer/orders/${(order as any).id}`)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    for (const f of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = ev => ev.target?.result && setImages(prev => [...prev, ev.target.result as string])
      reader.readAsDataURL(f)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Back */}
      <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {step > 1 ? 'Quay lại' : '← Home'}
      </button>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">📋 Đặt dịch vụ thủ công</h1>

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Chọn loại dịch vụ</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setCategory(c.id); setStep(2) }}
                className={`p-4 rounded-xl border-2 text-left transition ${category === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="font-semibold text-gray-900">{c.name}</div>
                <div className="text-xs text-gray-500 mt-1">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Description */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Mô tả vấn đề</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl h-32 text-sm focus:ring-2 focus:ring-blue-500/30" />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Hình ảnh (tùy chọn)</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition">
              📷 Thêm ảnh
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            {images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} className="w-16 h-16 object-cover rounded-lg border" />
                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setStep(3)} disabled={!description.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
            Tiếp tục
          </button>
        </div>
      )}

      {/* Step 3: Time & Location */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Thời gian</p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map(t => (
              <button key={t.value} onClick={() => setTimeOption(t.value)}
                className={`p-3 rounded-xl border-2 text-center transition ${timeOption === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-[10px] text-gray-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>

          {timeOption === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm" />
              <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm" />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">📍 Địa điểm</p>
            <button onClick={handleGetLocation}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${useCurrentLocation ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {useCurrentLocation ? '✅ Đã lấy vị trí' : '📍 Dùng vị trí hiện tại'}
            </button>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ chi tiết..."
              className="w-full mt-2 px-4 py-2 border rounded-xl text-sm" />
            <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 font-mono">
              Tọa độ: {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg">
            {submitting ? 'Đang gửi...' : '✅ Gửi yêu cầu dịch vụ'}
          </button>
        </div>
      )}
    </div>
  )
}
