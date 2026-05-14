'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'
import BanDo, { type MapPoint } from '@/components/map/BanDo'

export default function BanDoAdmin() {
  const router = useRouter()
  const [points, setPoints] = useState<MapPoint[]>([])
  const [filter, setFilter] = useState('workers')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ tongTho: 0, gầnNhất: 0 })

  useEffect(() => {
    queueMicrotask(() => taiDuLieu())
  }, [filter])

  async function taiDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      let data: MapPoint[] = []

      if (filter === 'workers') {
        const res = await fetch(`${supabaseUrl}/functions/v1/osm-map?action=workers`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const geo = await res.json()
        data = (geo.features || []).map((f: any) => ({
          id: f.properties.id,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          type: f.properties.verified ? 'worker_verified' as const : 'worker' as const,
          label: f.properties.name,
          description: `⭐ ${f.properties.rating}/5 · ${f.properties.completed_jobs} đơn`,
          data: { skills: f.properties.skills, distance_km: 0 },
        }))
        setStats({ tongTho: data.length, gầnNhất: data.length })
      } else if (filter === 'orders') {
        const res = await fetch(`${supabaseUrl}/functions/v1/osm-map?action=orders`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const geo = await res.json()
        data = (geo.features || []).map((f: any) => ({
          id: f.properties.id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
          type: 'order' as const,
          label: `${f.properties.category} - ${f.properties.status}`,
          description: `${f.properties.estimated_price?.toLocaleString() || 0}₫`,
          data: { status: f.properties.status },
        }))
      }

      setPoints(data)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="🗺️ Bản đồ AI" description="Xem thợ, đơn hàng và AI matching trên bản đồ tương tác"
        actions={
          <div className="flex gap-2">
            {['workers', 'orders'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>{f === 'workers' ? '👥 Thợ' : '📋 Đơn hàng'}</button>
            ))}
            <button onClick={taiDuLieu} disabled={loading}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">🔄</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">{filter === 'workers' ? 'Tổng thợ trên bản đồ' : 'Tổng đơn'}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.tongTho}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">{filter === 'workers' ? 'Thợ đã xác thực' : 'Đơn đang xử lý'}</p>
          <p className="text-2xl font-bold text-green-600">{stats.gầnNhất}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-600">Khu vực</p>
          <p className="text-2xl font-bold text-gray-900">TP. Hồ Chí Minh</p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={taiDuLieu} />}
      {loading ? <LoadingState text="Đang tải bản đồ..." /> : (
        <BanDo points={points} height="600px" showControls
          onMarkerClick={(p) => {
            if (p.type === 'worker' || p.type === 'worker_verified') {
              router.push(`/admin/workers?id=${p.id}`)
            }
          }}
        />
      )}
    </div>
  )
}