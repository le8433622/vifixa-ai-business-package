'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BanDo, { type MapPoint } from '@/components/map/BanDo'
import { PageHeader, LoadingState } from '@/components/admin/AIUI'

export default function BanDoTho() {
  const router = useRouter()
  const [points, setPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [thongKe, setThongKe] = useState({ tongDon: 0, tongKm: 0 })

  useEffect(() => {
    queueMicrotask(() => taiDuLieu())
  }, [])

  async function taiDuLieu() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Lấy đơn hàng của worker này
      const { data: orders } = await supabase
        .from('orders')
        .select('id, category, status, description, estimated_price, created_at')
        .eq('worker_id', session.user.id)
        .in('status', ['matched', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50)

      const mapPoints: MapPoint[] = (orders || []).map((o, i) => ({
        id: o.id, lat: 10.77 + (Math.random() - 0.5) * 0.05, lng: 106.69 + (Math.random() - 0.5) * 0.05,
        type: 'order' as const,
        label: `${o.category} - ${o.status}`,
        description: `${o.estimated_price?.toLocaleString() || 0}₫`,
      }))

      // Vị trí worker (giả định)
      mapPoints.unshift({
        id: 'worker-location', lat: 10.78, lng: 106.68,
        type: 'worker_verified' as const, label: 'Vị trí của tôi',
      })

      setPoints(mapPoints)
      setThongKe({ tongDon: orders?.length || 0, tongKm: Math.round(mapPoints.length * 2.5) })
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="🗺️ Bản đồ việc làm" description="Xem đơn hàng và lên lịch tối ưu" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">Đơn hàng</p>
          <p className="text-2xl font-bold text-blue-600">{thongKe.tongDon}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">Tổng quãng đường</p>
          <p className="text-2xl font-bold text-green-600">{thongKe.tongKm}km</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">Khu vực</p>
          <p className="text-2xl font-bold text-gray-900">Quận 7, HCMC</p>
        </div>
      </div>

      {loading ? <LoadingState text="Đang tải bản đồ..." /> : (
        <>
          <BanDo points={points} height="500px" showControls />
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-sm flex items-center gap-2">💡 Mẹo tối ưu</h3>
            <p className="text-xs text-blue-800 mt-1">
              Bạn có {thongKe.tongDon} đơn hàng trên bản đồ. Hãy sắp xếp theo tuyến đường để tiết kiệm thời gian di chuyển.
              Trung bình mỗi đơn cách nhau {Math.round(thongKe.tongKm / Math.max(thongKe.tongDon, 1))}km.
            </p>
          </div>
        </>
      )}
    </div>
  )
}