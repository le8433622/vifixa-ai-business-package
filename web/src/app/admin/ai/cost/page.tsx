'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, StatCard, LoadingState, EmptyState, ErrorAlert, FilterBar } from '@/components/admin/AIUI'

export default function TrangChiPhiAI() {
  const router = useRouter()
  const [ngay, setNgay] = useState(7)
  const [tomTat, setTomTat] = useState<any[]>([])
  const [chiPhiAgent, setChiPhiAgent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { queueMicrotask(() => layDuLieu()) }, [ngay])

  async function layDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: summaryData } = await supabase.rpc('get_ai_cost_summary', { p_days: ngay })
      setTomTat(summaryData || [])
      const { data: costs } = await supabase.from('ai_cost_log').select('agent_type, count:tokens_in, sum:tokens_in, sum:tokens_out, sum:cost')
        .gte('created_at', new Date(Date.now() - ngay * 86400000).toISOString())
      setChiPhiAgent(costs || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const tongChiPhi = tomTat.reduce((s, r) => s + Number(r.total_cost), 0)
  const tongLuotGoi = tomTat.reduce((s, r) => s + r.total_calls, 0)
  const doTreTB = tomTat.length > 0 ? Math.round(tomTat.reduce((s, r) => s + r.avg_latency_ms, 0) / tomTat.length) : 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader
        title="Chi phí AI"
        description="Theo dõi chi phí AI theo thời gian thực"
        actions={
          <FilterBar
            options={[7, 30, 90].map(d => ({ key: String(d), label: `${d} ngày` }))}
            selected={String(ngay)}
            onChange={k => setNgay(Number(k))}
          />
        }
      />

      {error && <ErrorAlert message={error} onRetry={layDuLieu} />}

      {loading ? (
        <LoadingState text="Đang tải chi phí..." />
      ) : tomTat.length === 0 && chiPhiAgent.length === 0 ? (
        <EmptyState icon="💰" title="Chưa có dữ liệu chi phí" description="Chi phí AI sẽ hiển thị sau khi có các cuộc gọi AI." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8 mt-2">
            <StatCard label="Tổng chi phí" value={tongChiPhi} color={tongChiPhi > 5 ? 'red' : tongChiPhi > 1 ? 'yellow' : 'green'} format={(v) => `$${v.toFixed(4)}`} />
            <StatCard label="Tổng số lượt gọi" value={tongLuotGoi} color="blue" />
            <StatCard label="Độ trễ trung bình" value={`${doTreTB}ms`} color={doTreTB > 3000 ? 'red' : doTreTB > 1000 ? 'yellow' : 'green'} />
            <StatCard label="Tỷ lệ cache" value={`${tomTat.length > 0 ? (tomTat.reduce((s, r) => s + r.cache_hit_pct, 0) / tomTat.length).toFixed(1) : 0}%`} color="green" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Chi phí theo ngày</h2>
            <div className="space-y-2">
              {tomTat.map(row => {
                const maxCost = Math.max(...tomTat.map(s => Number(s.total_cost)))
                return (
                  <div key={row.day} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600">{row.day}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(Number(row.total_cost) / maxCost) * 100}%` }} />
                    </div>
                    <span className="w-24 text-sm font-mono text-right">${Number(row.total_cost).toFixed(4)}</span>
                    <span className="w-16 text-xs text-gray-500 text-right">{row.total_calls} cuộc</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <h2 className="text-lg font-bold p-4 border-b">Chi phí theo Agent</h2>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-left font-semibold text-gray-600 text-sm">Agent</th>
                  <th className="p-3 text-right font-semibold text-gray-600 text-sm">Lượt gọi</th>
                  <th className="p-3 text-right font-semibold text-gray-600 text-sm">Tokens Vào</th>
                  <th className="p-3 text-right font-semibold text-gray-600 text-sm">Tokens Ra</th>
                  <th className="p-3 text-right font-semibold text-gray-600 text-sm">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {chiPhiAgent.map(row => (
                  <tr key={row.agent_type} className="border-b hover:bg-gray-50">
                    <td className="p-3 capitalize font-medium text-sm">{row.agent_type}</td>
                    <td className="p-3 text-right text-sm">{row.total_calls}</td>
                    <td className="p-3 text-right font-mono text-sm">{row.total_tokens_in?.toLocaleString() || 0}</td>
                    <td className="p-3 text-right font-mono text-sm">{row.total_tokens_out?.toLocaleString() || 0}</td>
                    <td className="p-3 text-right font-mono text-sm font-bold">${Number(row.total_cost || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}