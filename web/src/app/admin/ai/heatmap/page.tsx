'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

const DANH_MUC = ['air_conditioning', 'plumbing', 'electricity', 'appliance', 'camera', 'painting']
const NHAN_DM: Record<string, string> = {
  air_conditioning: 'Máy lạnh', plumbing: 'Ống nước', electricity: 'Điện',
  appliance: 'Gia dụng', camera: 'Camera', painting: 'Sơn',
}

export default function BanDoNongAI() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => { queueMicrotask(() => taiDuLieu()) }, [filterCat])

  async function taiDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${session.access_token}` }
      const res = await fetch(`${supabaseUrl}/functions/v1/osm-heatmap?action=grid&days=30&category=${filterCat}`, { headers })
      setData(await res.json())
      const analysisRes = await fetch(`${supabaseUrl}/functions/v1/osm-heatmap?action=demand-analysis`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
      })
      setAnalysis(await analysisRes.json())
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const cells = data?.features || []
  const maxCount = Math.max(...cells.map((c: any) => c.properties.order_count), 1)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="🔥 Bản đồ nhu cầu" description="Phân tích nhu cầu dịch vụ theo khu vực địa lý"
        actions={
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Tất cả danh mục</option>
            {DANH_MUC.map(d => <option key={d} value={d}>{NHAN_DM[d] || d}</option>)}
          </select>
        }
      />

      {error && <ErrorAlert message={error} onRetry={taiDuLieu} />}

      {loading ? <LoadingState text="Đang phân tích nhu cầu..." /> : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-600">Tổng đơn (30 ngày)</p>
              <p className="text-2xl font-bold text-blue-600">{data?.metadata?.total_orders || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-600">Khu vực có đơn</p>
              <p className="text-2xl font-bold text-green-600">{data?.metadata?.grid_cells || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-600">Tỷ lệ hoàn thành</p>
              <p className="text-2xl font-bold text-yellow-600">{analysis?.completion_rate || 0}%</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-600">Danh mục</p>
              <p className="text-2xl font-bold text-gray-900">{NHAN_DM[filterCat] || 'Tất cả'}</p>
            </div>
          </div>

          {/* Grid heatmap */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">📍 Phân bố nhu cầu</h2>
            {cells.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu đơn hàng với tọa độ</p>
            ) : (
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-20 gap-1">
                {cells.slice(0, 100).map((c: any, i: number) => {
                  const intensity = c.properties.order_count / maxCount
                  return (
                    <div key={i}
                      className="aspect-square rounded-sm transition-all hover:scale-150 hover:z-10 relative group cursor-pointer"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.9})` }}
                      title={`${c.properties.order_count} đơn`}>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        📍 {c.geometry.coordinates[1].toFixed(3)}, {c.geometry.coordinates[0].toFixed(3)}
                        <br />📋 {c.properties.order_count} đơn · 💰 {(c.properties.avg_revenue / 1000).toFixed(0)}K₫
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
              <span>Thấp</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                  <div key={v} className="w-6 h-3 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${v})` }} />
                ))}
              </div>
              <span>Cao</span>
            </div>
          </div>

          {/* AI Analysis */}
          {analysis?.ai_analysis && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">AI</span>
                <span className="font-bold">Phân tích nhu cầu</span>
              </div>
              {analysis.ai_analysis.hot_zones?.map((z: any, i: number) => (
                <div key={i} className="mb-3 p-3 bg-white rounded-lg border">
                  <p className="font-bold text-sm">🔥 {z.area}</p>
                  <p className="text-xs text-gray-600">{z.demand}</p>
                  <p className="text-xs text-blue-600 mt-1">💡 {z.recommendation}</p>
                </div>
              ))}
              {analysis.ai_analysis.worker_strategy && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-800">🎯 Chiến lược cho thợ</p>
                  <p className="text-xs text-amber-700 mt-1">{analysis.ai_analysis.worker_strategy}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}