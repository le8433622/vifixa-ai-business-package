// 🗺️ Khách hàng Map-first — Xem thợ gần nhất trên bản đồ
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BanDo from '@/components/map/BanDo'

const DANH_MUC = [
  { id: 'air_conditioning', icon: '❄️', label: 'Máy lạnh' },
  { id: 'plumbing', icon: '🚿', label: 'Ống nước' },
  { id: 'electricity', icon: '⚡', label: 'Điện' },
  { id: 'appliance', icon: '🔧', label: 'Gia dụng' },
  { id: 'camera', icon: '📷', label: 'Camera' },
  { id: 'painting', icon: '🎨', label: 'Sơn' },
]

export default function KhachHangMap() {
  const router = useRouter()
  const [viTri, setViTri] = useState<[number, number]>([10.77, 106.69])
  const [geoJSON, setGeoJSON] = useState<any>(null)
  const [thoGan, setThoGan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Lấy vị trí người dùng
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setViTri([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  // Tải thợ gần nhất
  async function taiThoGanDay() {
    setLoading(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`${supabaseUrl}/functions/v1/osm-map?action=nearby&lat=${viTri[0]}&lng=${viTri[1]}&radius=20`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setGeoJSON(data)
      setThoGan((data.features || []).map((f: any) => ({
        id: f.properties.id, name: f.properties.name,
        distance: f.properties.distance_km, rating: f.properties.rating,
        skills: f.properties.skills || [], verified: f.properties.verified,
      })))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    queueMicrotask(() => taiThoGanDay())
  }, [viTri])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header với map */}
      <div className="relative h-[300px]">
        <BanDo geoJSON={geoJSON} center={viTri} zoom={14} height="300px" showControls={false} className="rounded-none" />
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-4">
          <h1 className="text-white font-bold text-lg">🗺️ Thợ gần bạn</h1>
          <p className="text-white/80 text-xs">Tìm thợ sửa chữa trong khu vực</p>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <button onClick={() => router.push('/customer/chat')}
            className="flex-1 bg-white text-gray-800 rounded-xl py-3 font-bold text-sm shadow-lg hover:bg-gray-50">
            💬 Chat với AI
          </button>
          <button onClick={() => router.push('/customer/map')}
            className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm shadow-lg hover:bg-blue-700">
            🗺️ Xem bản đồ
          </button>
        </div>
      </div>

      {/* Danh mục dịch vụ */}
      <div className="px-4 py-4">
        <h2 className="font-bold text-sm mb-3">📋 Dịch vụ</h2>
        <div className="grid grid-cols-3 gap-3">
          {DANH_MUC.map(dm => (
            <button key={dm.id} onClick={() => router.push(`/customer/chat`)}
              className="bg-white rounded-xl p-4 border text-center hover:border-blue-200 hover:shadow-sm transition-all">
              <span className="text-2xl">{dm.icon}</span>
              <p className="text-xs font-medium mt-1.5 text-gray-700">{dm.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thợ gần đây */}
      <div className="px-4 pb-6">
        <h2 className="font-bold text-sm mb-3">👥 Thợ gần bạn ({thoGan.length})</h2>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Đang tìm thợ...</p>
        ) : thoGan.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-gray-500 text-sm">Chưa có thợ trong khu vực</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thoGan.slice(0, 5).map((tho) => (
              <div key={tho.id} className="bg-white rounded-xl p-4 border flex items-center gap-3 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-lg shrink-0">
                  {tho.verified ? '✅' : '🔧'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{tho.name}</h3>
                  <p className="text-xs text-gray-500">📍 {tho.distance}km · ⭐ {tho.rating}/5</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {tho.skills.slice(0, 3).map((s: string) => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => router.push('/customer/chat')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shrink-0">
                  Đặt ngay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}