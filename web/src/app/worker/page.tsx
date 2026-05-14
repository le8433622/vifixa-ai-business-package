// 🗺️ Thợ Map-first — Xem đơn hàng gần nhất trên bản đồ
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BanDo from '@/components/map/BanDo'

export default function ThoMap() {
  const router = useRouter()
  const [viTri] = useState<[number, number]>([10.77, 106.69])
  const [points, setPoints] = useState<any[]>([])
  const [donGan, setDonGan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [thongKe, setThongKe] = useState({ hoanThanh: 0, thuNhap: 0 })

  useEffect(() => { queueMicrotask(() => taiDuLieu()) }, [])

  async function taiDuLieu() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Lấy đơn hàng đang chờ gần đây
      const { data: orders } = await supabase
        .from('orders')
        .select('id, category, description, estimated_price, status, created_at')
        .in('status', ['pending', 'matched'])
        .order('created_at', { ascending: false })
        .limit(20)

      // Giả lập tọa độ (thực tế: lấy từ order.location)
      const mapPoints = [{
        id: 'me', lat: viTri[0], lng: viTri[1], type: 'worker_verified' as const,
        label: 'Vị trí của tôi', desc: '📍 Đang ở đây',
      }]

      const dsDon = (orders || []).map((o, i) => ({
        id: o.id, lat: viTri[0] + (Math.random() - 0.5) * 0.06,
        lng: viTri[1] + (Math.random() - 0.5) * 0.06,
        type: 'order_pending' as const, label: o.category,
        desc: `${o.estimated_price?.toLocaleString() || 0}₫ · ${o.status}`,
      }))
      mapPoints.push(...dsDon)
      setPoints(mapPoints)
      setDonGan(dsDon)

      // Thống kê
      const { data: completed } = await supabase
        .from('orders')
        .select('final_price, estimated_price')
        .eq('worker_id', session.user.id)
        .eq('status', 'completed')

      const dsHoanThanh = completed || []
      setThongKe({
        hoanThanh: dsHoanThanh.length,
        thuNhap: dsHoanThanh.reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0),
      })
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header map */}
      <div className="relative h-[350px]">
        <BanDo points={points} center={viTri} zoom={13} height="350px" showControls={false} className="rounded-none"
          onMarkerClick={(id, type) => {
            if (type === 'order_pending') router.push(`/worker/jobs/${id}`)
          }}
        />
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-4">
          <h1 className="text-white font-bold text-lg">🛠️ Việc làm gần đây</h1>
          <p className="text-white/80 text-xs">{donGan.length} đơn đang chờ</p>
        </div>
      </div>

      {/* Thống kê */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{donGan.length}</p>
            <p className="text-xs text-gray-500">Đơn chờ</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{thongKe.hoanThanh}</p>
            <p className="text-xs text-gray-500">Hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-amber-600">{(thongKe.thuNhap / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500">Thu nhập</p>
          </div>
        </div>
      </div>

      {/* Đơn hàng gần đây */}
      <div className="px-4 pb-6">
        <h2 className="font-bold text-sm mb-3">📋 Đơn hàng gần bạn</h2>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Đang tải...</p>
        ) : donGan.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-gray-500 text-sm">Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {donGan.map((don) => (
              <div key={don.id} className="bg-white rounded-xl p-4 border flex items-center gap-3 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-lg shrink-0">📋</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm capitalize">{don.label}</h3>
                  <p className="text-xs text-gray-500">{don.desc}</p>
                </div>
                <button onClick={() => router.push(`/worker/jobs/${don.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shrink-0">
                  Xem
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={() => router.push('/worker/map/optimize')}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-4 text-left">
            <span className="text-2xl">🗺️</span>
            <p className="font-bold text-sm mt-2">Tối ưu tuyến đường</p>
          </button>
          <button onClick={() => router.push('/worker/coach')}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 text-left">
            <span className="text-2xl">🎓</span>
            <p className="font-bold text-sm mt-2">AI Coach</p>
          </button>
        </div>
      </div>
    </div>
  )
}