// 🗺️ V4 MAP — Một màn hình duy nhất cho Khách + Thợ + Admin
// Khách: thấy thợ gần ● → click → chat → đặt
// Thợ: thấy đơn gần ● → click → nhận → hoàn thành
// Admin: thấy tất cả ● → click → detail → manage

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BanDo = dynamic(() => import('@/components/map/BanDo'), { ssr: false })

export default function V4Map() {
  const router = useRouter()
  const [role, setRole] = useState<string>('customer')
  const [points, setPoints] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [stats, setStats] = useState({ tong: 0, gan: 0 })
  const [cheDo, setCheDo] = useState('nearby')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
        setRole((data as any)?.role || 'customer')
        taiDuLieu(session.access_token, (data as any)?.role || 'customer')
      })
    })
  }, [cheDo])

  async function taiDuLieu(token: string, userRole: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const headers = { Authorization: `Bearer ${token}` }

    try {
      if (userRole === 'customer' || cheDo === 'nearby') {
        const res = await fetch(`${supabaseUrl}/functions/v1/v4-navigator`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hanhDong: 'tim_gan_day',
            viTri: { viDo: 10.77, kinhDo: 106.69 },
            banKinh: 20,
          }),
        })
        const data = await res.json()
        if (data.danhSach) {
          setPoints([
            { id: 'me', lat: 10.77, lng: 106.69, type: 'home', label: '📍 Vị trí của bạn' },
            ...data.danhSach.map((w: any) => ({
              id: w.id, lat: 10.77 + (Math.random() - 0.5) * 0.05,
              lng: 106.69 + (Math.random() - 0.5) * 0.05,
              type: 'worker', label: w.ten,
              desc: `📍 ${w.khoangCachKm}km · ⏱ ${w.thoiGianPhut}ph · ⭐ ${w.diemDanhGia}/5`,
              data: w,
            })),
          ])
          setStats({ tong: data.tongSo, gan: data.danhSach.length })
        }
      } else if (userRole === 'worker') {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, category, description, estimated_price, status')
          .in('status', ['pending', 'matched'])
          .limit(20)

        setPoints([
          { id: 'me', lat: 10.77, lng: 106.69, type: 'worker_verified', label: '📍 Vị trí của tôi' },
          ...(orders || []).map((o: any, i: number) => ({
            id: o.id, lat: 10.77 + (Math.random() - 0.5) * 0.06,
            lng: 106.69 + (Math.random() - 0.5) * 0.06,
            type: 'order', label: o.category,
            desc: `${o.estimated_price?.toLocaleString() || 0}₫ · ${o.status}`,
            data: o,
          })),
        ])
        setStats({ tong: orders?.length || 0, gan: orders?.length || 0 })
      } else if (userRole === 'admin') {
        const res = await fetch(`${supabaseUrl}/functions/v1/v4-navigator`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hanhDong: 'nhiet_do', viTri: { viDo: 10.77, kinhDo: 106.69 } }),
        })
        const data = await res.json()
        if (data.features) {
          setPoints(data.features.map((f: any, i: number) => ({
            id: `heat-${i}`, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
            type: 'worker', label: `${f.properties.soDon} đơn`,
            desc: `💰 ${(f.properties.doanhThu / 1000).toFixed(0)}K₫`,
            radius: f.properties.nhietDo * 5,
          })))
          setStats({ tong: data.metadata?.tongDon || 0, gan: data.metadata?.oNhuom || 0 })
        }
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Stats bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 text-sm">
        <span className="font-medium">
          {role === 'customer' ? `👥 ${stats.tong} thợ trong khu vực` :
           role === 'worker' ? `📋 ${stats.tong} đơn đang chờ` :
           `🔥 ${stats.tong} đơn, ${stats.gan} khu vực`}
        </span>
        <span className="text-gray-300">|</span>
        <button onClick={() => router.push('/v4/chat')} className="text-blue-600 hover:underline">
          💬 Chat với AI
        </button>
      </div>

      {/* Map */}
      <div className="flex-1">
        <BanDo
          points={points}
          height="100%"
          showControls
          onMarkerClick={(id, type, data) => {
            if (type === 'worker') setSelectedItem(data)
            if (type === 'order') router.push(`/worker/jobs/${id}`)
          }}
        />
      </div>

      {/* Detail panel (slide up) */}
      {selectedItem && (
        <div className="bg-white border-t rounded-t-2xl shadow-lg p-4 -mt-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">{selectedItem.ten}</h3>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">📍</span> {selectedItem.khoangCachKm}km</div>
            <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">⏱</span> {selectedItem.thoiGianPhut} phút</div>
            <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">⭐</span> {selectedItem.diemDanhGia}/5</div>
            <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">📋</span> {selectedItem.kyNang?.slice(0, 2).join(', ')}</div>
          </div>
          <button onClick={() => router.push('/v4/chat')}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
            💬 Chat với {selectedItem.ten}
          </button>
        </div>
      )}
    </div>
  )
}