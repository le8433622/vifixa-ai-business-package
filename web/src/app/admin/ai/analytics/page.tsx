'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, StatCard, LoadingState, EmptyState, ErrorAlert, FilterBar, InfoBadge } from '@/components/admin/AIUI'

interface Overview {
  today_ai_cost_usd: number
  total_revenue_vnd: number
  avg_accuracy_pct: number
  total_orders: number
  total_customers: number
  total_workers: number
  ai_roi: string
}

interface ChurnData {
  churn_rate: number
  at_risk_users: number
  total_users: number
  ai_insights: { churn_rate: number; at_risk_count: number; recommendations: string[]; retention_strategies: { action: string; expected_impact: string }[] } | null
}

interface RevenueData {
  total_revenue: number
  ai_attributed_revenue: number
  ai_attribution_pct: number
  top_categories: { category: string; revenue: number }[]
  ai_insights: { ai_attributed_revenue_pct: number; top_categories: string[]; growth_recommendations: string[] } | null
}

export default function AIAnalyticsPage() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [churn, setChurn] = useState<ChurnData | null>(null)
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => fetchData())
  }, [tab])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lipjakzhzosrhttsltwo.supabase.co'

      if (tab === 'overview') {
        const res = await fetch(`${supabaseUrl}/functions/v1/ai-analytics?action=overview`, { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setOverview(data)
      } else if (tab === 'churn') {
        const res = await fetch(`${supabaseUrl}/functions/v1/ai-analytics?action=churn`, { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setChurn(await res.json())
      } else if (tab === 'revenue') {
        const res = await fetch(`${supabaseUrl}/functions/v1/ai-analytics?action=revenue-attribution`, { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRevenue(await res.json())
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function formatVnd(v: number) { return `${(v / 1000).toFixed(0)}K₫` }
  function numberWithCommas(v: number) { return v.toLocaleString('vi-VN') }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader
        title="Phân tích AI"
        description="Dự đoán khách hàng rời bỏ, phân bổ doanh thu và tổng quan hiệu suất AI"
        actions={
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
            🔄 Làm mới
          </button>
        }
      />

      <FilterBar
        options={[
          { key: 'overview', label: '📊 Tổng quan' },
          { key: 'churn', label: '⚠️ Khách hàng rời bỏ' },
          { key: 'revenue', label: '💰 Doanh thu' },
        ]}
        selected={tab}
        onChange={setTab}
      />

      {error && <ErrorAlert message={error} onRetry={fetchData} />}

      {loading ? <LoadingState /> : tab === 'overview' && overview ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 mt-6">
            <StatCard label="AI Calls Hôm Nay" value={overview.total_orders} color="blue" />
            <StatCard label="Chi phí AI" value={overview.today_ai_cost_usd} color={overview.today_ai_cost_usd > 5 ? 'red' : 'green'} />
            <StatCard label="Doanh thu" value={overview.total_revenue_vnd} color="green" format={formatVnd} />
            <StatCard label="Độ chính xác" value={`${overview.avg_accuracy_pct}%`} color={overview.avg_accuracy_pct >= 80 ? 'green' : 'yellow'} />
            <StatCard label="Khách hàng" value={overview.total_customers} color="blue" />
            <StatCard label="AI ROI" value={overview.ai_roi} color={overview.ai_roi !== 'N/A' ? 'green' : 'gray'} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">📋 Chi tiết</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Tổng đơn:</span> <span className="font-medium">{overview.total_orders}</span></div>
              <div><span className="text-gray-500">Khách hàng:</span> <span className="font-medium">{overview.total_customers}</span></div>
              <div><span className="text-gray-500">Thợ:</span> <span className="font-medium">{overview.total_workers}</span></div>
              <div><span className="text-gray-500">AI ROI:</span> <span className="font-medium">{overview.ai_roi}</span></div>
            </div>
          </div>
        </>
      ) : tab === 'churn' && churn ? (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8 mt-6">
            <StatCard label="Tỷ lệ churn" value={`${churn.churn_rate}%`} color={churn.churn_rate > 30 ? 'red' : churn.churn_rate > 15 ? 'yellow' : 'green'} />
            <StatCard label="User có nguy cơ" value={churn.at_risk_users} color="red" />
            <StatCard label="Tổng users" value={churn.total_users} color="blue" />
          </div>

          {churn.ai_insights?.recommendations && (
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-bold mb-3">🤖 AI Insights</h2>
              <ul className="space-y-2">
                {churn.ai_insights.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {churn.ai_insights?.retention_strategies && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-3">🎯 Chiến lược giữ chân</h2>
              <div className="space-y-3">
                {churn.ai_insights.retention_strategies.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.expected_impact}</p>
                    </div>
                    <InfoBadge label={s.expected_impact.includes('Cao') ? 'High Impact' : 'Medium'} color="green" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : tab === 'revenue' && revenue ? (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8 mt-6">
            <StatCard label="Tổng doanh thu" value={revenue.total_revenue} color="green" format={formatVnd} />
            <StatCard label="AI-attributed" value={revenue.ai_attributed_revenue} color="blue" format={formatVnd} />
            <StatCard label="AI Attribution %" value={`${revenue.ai_attribution_pct}%`} color={revenue.ai_attribution_pct > 50 ? 'green' : 'yellow'} />
          </div>

          {revenue.top_categories.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">📈 Top danh mục</h2>
              <div className="space-y-3">
                {revenue.top_categories.map((c, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-gray-400">#{i + 1}</span>
                    <span className="text-sm font-medium capitalize w-32">{c.category}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${revenue.top_categories.length > 0 ? (c.revenue / revenue.top_categories[0].revenue) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-mono text-right w-24">{formatVnd(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {revenue.ai_insights?.growth_recommendations && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-3">📊 Gợi ý tăng trưởng</h2>
              <ul className="space-y-2">
                {revenue.ai_insights.growth_recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">📈</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : !error ? (
        <EmptyState icon="📊" title="Không có dữ liệu" description="Hãy đảm bảo ai-analytics đã được deploy." />
      ) : null}
    </div>
  )
}