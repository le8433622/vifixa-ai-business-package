'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, ErrorAlert } from '@/components/admin/AIUI'
import BanDo, { type MapPoint } from '@/components/map/BanDo'

export default function ToiUuTuyenDuong() {
  const router = useRouter()
  const [points, setPoints] = useState<MapPoint[]>([])
  const [tuyenDuong, setTuyenDuong] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thongKe, setThongKe] = useState({ km: 0, phut: 0 })

  async function taiDonHang() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: orders } = await supabase
        .from('orders')
        .select('id, category, description, estimated_price, status, worker_id')
        .eq('worker_id', session.user.id)
        .in('status', ['matched', 'in_progress'])
        .limit(20)

      // Giả lập tọa độ (thực tế: lấy từ order location)
      const baseLat = 10.77, baseLng = 106.69
      const mapPoints: MapPoint[] = [
        { id: 'me', lat: baseLat, lng: baseLng, type: 'worker_verified' as const, label: '📍 Vị trí của tôi' },
        ...(orders || []).map((o, i) => ({
          id: o.id, lat: baseLat + (Math.random() - 0.5) * 0.08, lng: baseLng + (Math.random() - 0.5) * 0.08,
          type: 'order' as const, label: `${o.category}`,
          description: `${o.estimated_price?.toLocaleString() || 0}₫`,
        })),
      ]
      setPoints(mapPoints)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function toiUu() {
    setOptimizing(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      const diemDen = points.filter(p => p.type === 'order').map(p => ({ viDo: p.lat, kinhDo: p.lng }))

      const res = await fetch(`${supabaseUrl}/functions/v1/osm-route`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diemDi: { viDo: points[0].lat, kinhDo: points[0].lng },
          diemDen, phuongTien: 'driving', toiUu: true,
        }),
      })
      const data = await res.json()
      if (data.thanhCong) {
        setTuyenDuong(data.tuyenDuong || [])
        setThongKe({ km: data.tongKhoangCach || 0, phut: data.tongThoiGian || 0 })
      }
    } catch { setError('Không thể tối ưu tuyến đường') }
    finally { setOptimizing(false) }
  }

  useEffect(() => { queueMicrotask(() => taiDonHang()) }, [])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="🗺️ Tối ưu tuyến đường" description="Sắp xếp đơn hàng theo lộ trình tối ưu"
        actions={
          <button onClick={toiUu} disabled={optimizing || points.length <= 1}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-violet-700 disabled:opacity-50">
            {optimizing ? '⏳ Đang tối ưu...' : '🚀 Tối ưu tuyến đường'}
          </button>
        }
      />

      {error && <ErrorAlert message={error} />}

      {tuyenDuong.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-600">Tổng quãng đường</p>
            <p className="text-2xl font-bold text-blue-600">{thongKe.km}km</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-600">Tổng thời gian</p>
            <p className={`text-2xl font-bold ${thongKe.phut > 120 ? 'text-red-600' : 'text-green-600'}`}>
              {thongKe.phut} phút ({Math.round(thongKe.phut / 60)}h{thongKe.phut % 60}m)
            </p>
          </div>
        </div>
      )}

      {loading ? <LoadingState text="Đang tải đơn hàng..." /> : (
        <>
          <BanDo points={points} height="500px" showControls />

          {tuyenDuong.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-4">📋 Lộ trình tối ưu</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">🏁</span>
                  <div><p className="font-medium text-sm">Bắt đầu</p><p className="text-xs text-gray-500">Vị trí hiện tại</p></div>
                </div>
                {tuyenDuong.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">Đơn #{i + 1}</p>
                      <p className="text-xs text-gray-500">{t.khoangCachKm}km · {t.thoiGianPhut} phút</p>
                    </div>
                    <span className="text-xs text-gray-400">→</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">✅</span>
                  <div><p className="font-medium text-sm">Kết thúc</p><p className="text-xs text-gray-500">Tổng: {thongKe.km}km · {thongKe.phut} phút</p></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}