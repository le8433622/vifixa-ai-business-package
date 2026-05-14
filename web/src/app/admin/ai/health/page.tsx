'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, StatCard, LoadingState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

export default function TrangGiamSatSanXuat() {
  const router = useRouter()
  const [health, setHealth] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { queueMicrotask(() => taiDuLieu()) }, [])

  async function taiDuLieu() {
    setLoading(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      // Health check
      const healthRes = await fetch(`${supabaseUrl}/functions/v1/ai-healthcheck`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setHealth(await healthRes.json())

      // Cost history 7 days
      const { data: costData } = await supabase.rpc('get_ai_cost_summary', { p_days: 7 })
      setHistory(costData || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const checks = health?.checks || {}
  const metrics = health?.metrics || {}

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="🏥 Giám sát sản xuất" description="Uptime, health, performance toàn bộ hệ thống"
        actions={
          <button onClick={taiDuLieu} disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            🔄 Làm mới
          </button>
        }
      />

      {error && <ErrorAlert message={error} onRetry={taiDuLieu} />}
      {loading ? <LoadingState text="Đang kiểm tra hệ thống..." /> : (
        <>
          {/* Status banner */}
          <div className={`mb-6 p-4 rounded-xl text-white font-bold text-sm ${
            health?.status === 'healthy' ? 'bg-green-500' :
            health?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            {health?.status === 'healthy' ? '🟢 Hệ thống hoạt động bình thường' :
             health?.status === 'degraded' ? '🟡 Hệ thống có vấn đề' :
             '🔴 Hệ thống gặp sự cố'}
            {' '}· v{health?.version} · {new Date(health?.timestamp).toLocaleString('vi-VN')}
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard label="Lượt AI hôm nay" value={metrics.calls_today || 0} color="blue" />
            <StatCard label="Chi phí hôm nay" value={metrics.cost_today || 0} color={metrics.cost_today > 5 ? 'red' : 'green'} format={(v) => `$${v.toFixed(4)}`} />
            <StatCard label="Độ trễ TB" value={`${metrics.avg_latency || 0}ms`} color={metrics.avg_latency > 3000 ? 'red' : 'green'} />
            <StatCard label="Cache hit" value={`${metrics.cache_hit_rate || 0}%`} color={metrics.cache_hit_rate > 20 ? 'green' : 'yellow'} />
          </div>

          {/* System checks */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: '🗄️ Database', check: checks.database },
              { label: '🧠 AI Core', check: checks.ai_core },
              { label: '🔌 NVIDIA API', check: checks.nvidia_api },
              { label: '⚡ Edge Functions', check: checks.edge_functions },
              { label: '⚠️ Lỗi hôm nay', check: checks.recent_errors },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.check?.latency_ms ? `${item.check.latency_ms}ms` : ''}
                    {item.check?.count !== undefined ? `${item.check.count} lỗi` : ''}
                    {item.check?.model ? `Model: ${item.check.model}` : ''}
                    {item.check?.healthy ? `${item.check.healthy}/${item.check.total}` : ''}
                  </p>
                </div>
                <InfoBadge label={item.check?.status || 'unknown'}
                  color={item.check?.status === 'healthy' ? 'green' :
                         item.check?.status === 'warning' || item.check?.status === 'degraded' ? 'yellow' :
                         item.check?.status === 'error' ? 'red' : 'gray'} />
              </div>
            ))}
          </div>

          {/* Cost history bar chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">📈 Chi phí 7 ngày</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2">
                {history.map(row => {
                  const maxCost = Math.max(...history.map(h => Number(h.total_cost)))
                  return (
                    <div key={row.day} className="flex items-center gap-4">
                      <span className="w-24 text-xs text-gray-600">{row.day}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(Number(row.total_cost) / maxCost) * 100}%` }} />
                      </div>
                      <span className="w-20 text-xs font-mono text-right">${Number(row.total_cost).toFixed(4)}</span>
                      <span className="w-12 text-xs text-gray-500 text-right">{row.total_calls}c</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}