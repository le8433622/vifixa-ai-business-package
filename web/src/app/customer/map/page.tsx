'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BanDo, { type MapPoint } from '@/components/map/BanDo'

export default function BanDoKhachHang() {
  const router = useRouter()
  const [points, setPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [viTri, setViTri] = useState<[number, number]>([10.77, 106.69])
  const [thoGanDay, setThoGanDay] = useState<any[]>([])
  const [timKiem, setTimKiem] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setViTri([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => taiThoGanDay())
  }, [viTri])

  async function taiThoGanDay() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const res = await fetch(`${supabaseUrl}/functions/v1/osm-map?action=nearby&lat=${viTri[0]}&lng=${viTri[1]}&radius=20`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const geo = await res.json()
      const data: MapPoint[] = (geo.features || []).map((f: any) => ({
        id: f.properties.id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
        type: f.properties.verified ? 'worker_verified' as const : 'worker' as const,
        label: f.properties.name,
        description: `📍 ${f.properties.distance_km}km · ⭐ ${f.properties.rating}/5`,
        data: { skills: f.properties.skills, distance_km: f.properties.distance_km },
      }))
      // Thêm vị trí nhà mình
      data.unshift({ id: 'home', lat: viTri[0], lng: viTri[1], type: 'home' as const, label: 'Vị trí của bạn' })
      setPoints(data)
      setThoGanDay(data.filter(d => d.type !== 'home').slice(0, 5))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const raNgoaiTim = useCallback(async () => {
    if (!timKiem.trim()) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const res = await fetch(`${supabaseUrl}/functions/v1/osm-geocode`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: timKiem, type: 'search' }),
      })
      const data = await res.json()
      if (data.results?.[0]) {
        const r = data.results[0]
        setViTri([parseFloat(r.lat), parseFloat(r.lon)])
      }
    } catch { /* ignore */ }
  }, [timKiem])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/80">←</button>
          <div>
            <h1 className="font-bold text-lg">🗺️ Thợ gần bạn</h1>
            <p className="text-blue-200 text-xs">Tìm thợ sửa chữa gần nhất</p>
          </div>
        </div>
      </div>

      {/* Ô tìm kiếm */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex gap-2">
          <input value={timKiem} onChange={e => setTimKiem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && raNgoaiTim()}
            placeholder="Nhập địa chỉ, quận, đường..."
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <button onClick={raNgoaiTim}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">🔍</button>
        </div>
      </div>

      {/* Bản đồ */}
      <div className="h-[400px]">
        <BanDo points={points} center={viTri} zoom={14} height="400px" />
      </div>

      {/* Danh sách thợ gần đây */}
      <div className="p-4">
        <h2 className="font-bold text-sm mb-3">👥 Thợ gần bạn ({thoGanDay.length})</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Đang tìm thợ...</div>
        ) : thoGanDay.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-gray-500 text-sm">Chưa có thợ nào trong khu vực</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thoGanDay.map((tho) => (
              <div key={tho.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg shrink-0">
                  🛠️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm truncate">{tho.label}</h3>
                    {tho.type === 'worker_verified' && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✅</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    📍 {tho.data?.distance_km}km · ⭐ {(tho.data as any)?.rating}/5
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(tho.data?.skills as string[])?.slice(0, 3).map((s: string) => (
                      <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => router.push(`/(customer)/chat`)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shrink-0">
                  📞 Đặt ngay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}