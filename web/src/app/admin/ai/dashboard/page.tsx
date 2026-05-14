// 🗺️ Admin Map-first Dashboard — Xem toàn bộ hệ thống trên bản đồ
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BanDo from '@/components/map/BanDo'

export default function TrangChuAdminMap() {
  const router = useRouter()
  const [geoJSON, setGeoJSON] = useState<any>(null)
  const [thongKe, setThongKe] = useState({ tho: 0, don: 0, chiPhi: 0 })
  const [cheDo, setCheDo] = useState('workers')

  async function taiDuLieu() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${session.access_token}` }

      // Lấy dữ liệu bản đồ
      const mapRes = await fetch(`${supabaseUrl}/functions/v1/osm-map?action=${cheDo}`, { headers })
      const mapData = await mapRes.json()
      setGeoJSON(mapData)

      // Thống kê
      const [costRes, orderRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/ai_cost_log?select=cost&order=created_at.desc&limit=100`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/orders?select=id&limit=1`, { headers }),
      ])
      const chiPhi = (await costRes.json() || []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0)
      setThongKe({ tho: mapData?.features?.length || 0, don: 0, chiPhi })
    } catch { /* ignore */ }
  }

  useEffect(() => { queueMicrotask(() => taiDuLieu()) }, [cheDo])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold mb-2">🗺️ Quản trị hệ thống</h1>
          <div className="flex gap-4 text-sm">
            <button onClick={() => setCheDo('workers')}
              className={`px-3 py-1.5 rounded-lg ${cheDo === 'workers' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
              👥 Thợ ({thongKe.tho})
            </button>
            <button onClick={() => setCheDo('orders')}
              className={`px-3 py-1.5 rounded-lg ${cheDo === 'orders' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
              📋 Đơn hàng
            </button>
            <button onClick={() => setCheDo('heatmap')}
              className={`px-3 py-1.5 rounded-lg ${cheDo === 'heatmap' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
              🔥 Nhu cầu
            </button>
            <span className="px-3 py-1.5 bg-white/5 rounded-lg">💰 ${thongKe.chiPhi.toFixed(2)} hôm nay</span>
          </div>
        </div>
      </div>

      {/* Bản đồ chính */}
      <div className="max-w-7xl mx-auto px-6 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <BanDo geoJSON={geoJSON} height="600px" showControls
            onMarkerClick={(id, type, data) => {
              if (type === 'worker') router.push(`/admin/workers?id=${id}`)
              if (type === 'order') router.push(`/admin/orders?id=${id}`)
            }}
          />
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🧠', label: 'Trung tâm AI', href: '/admin/ai', color: 'from-blue-500 to-indigo-500' },
            { icon: '🔥', label: 'Bản đồ nhu cầu', href: '/admin/ai/heatmap', color: 'from-rose-500 to-orange-500' },
            { icon: '📡', label: 'Giám sát AI', href: '/admin/ai/monitor', color: 'from-emerald-500 to-teal-500' },
            { icon: '📊', label: 'Phân tích', href: '/admin/ai/analytics', color: 'from-violet-500 to-purple-500' },
          ].map(m => (
            <button key={m.label} onClick={() => router.push(m.href)}
              className={`bg-gradient-to-br ${m.color} text-white rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}>
              <span className="text-2xl">{m.icon}</span>
              <p className="font-bold text-sm mt-2">{m.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}