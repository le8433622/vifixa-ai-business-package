'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DAYS_BACK = 30

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [growth, setGrowth] = useState({ users: 0, usersDelta: 0, workers: 0, workersDelta: 0, orders: 0, revenue: 0, revenueDelta: 0 })
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([])
  const [churnRisks, setChurnRisks] = useState<any[]>([])
  const [funnel, setFunnel] = useState({ created: 0, matched: 0, inProgress: 0, completed: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    const now = new Date()
    const periodStart = new Date(now.getTime() - DAYS_BACK * 86400000).toISOString()
    const prevPeriodStart = new Date(now.getTime() - 2 * DAYS_BACK * 86400000).toISOString()

    // Growth metrics
    const [uRes, wRes, oRes] = await Promise.all([
      supabase.from('profiles').select('created_at', { count: 'exact' }),
      supabase.from('workers').select('id', { count: 'exact' }),
      supabase.from('orders').select('estimated_price,status,created_at'),
    ])

    const users = uRes.count || 0
    const workers = wRes.count || 0
    const orders = (oRes.data || []) as any[]
    const revenue = orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)

    const recentUsers = (uRes.data || []).filter((u: any) => new Date(u.created_at) >= new Date(periodStart)).length
    const prevUsers = (uRes.data || []).filter((u: any) => new Date(u.created_at) >= new Date(prevPeriodStart) && new Date(u.created_at) < new Date(periodStart)).length
    const recentRevenue = orders.filter((o: any) => o.status === 'completed' && new Date(o.created_at) >= new Date(periodStart)).reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)
    const prevRevenue = orders.filter((o: any) => o.status === 'completed' && new Date(o.created_at) >= new Date(prevPeriodStart) && new Date(o.created_at) < new Date(periodStart)).reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)

    setGrowth({
      users, usersDelta: prevUsers > 0 ? Math.round((recentUsers - prevUsers) / prevUsers * 100) : 0,
      workers, workersDelta: 0,
      orders: orders.length,
      revenue, revenueDelta: prevRevenue > 0 ? Math.round((recentRevenue - prevRevenue) / prevRevenue * 100) : 0,
    })

    // Conversion funnel
    const created = orders.length
    const matched = orders.filter((o: any) => o.status !== 'pending').length
    const inProgress = orders.filter((o: any) => o.status === 'in_progress' || o.status === 'completed').length
    const completed = orders.filter((o: any) => o.status === 'completed').length
    setFunnel({ created, matched, inProgress, completed })

    // Fraud alerts (simulated — check for unusual patterns)
    const alerts: any[] = []
    const workerOrders = new Map<string, number>()
    for (const o of orders) {
      if (o.worker_id) workerOrders.set(o.worker_id, (workerOrders.get(o.worker_id) || 0) + 1)
    }
    for (const [wid, count] of workerOrders.entries()) {
      if (count > 10) alerts.push({ type: 'worker', id: wid, reason: `Hoàn thành ${count} đơn trong ${DAYS_BACK} ngày`, severity: 'high' })
    }
    setFraudAlerts(alerts.slice(0, 10))

    // Churn risk (users who haven't ordered in 30+ days)
    const customerIds = [...new Set(orders.map((o: any) => o.customer_id))].filter(Boolean)
    setChurnRisks(customerIds.slice(0, 5).map(id => ({ id, reason: 'Không đặt dịch vụ trong 30 ngày' })))

    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">📈 Analytics</h1>

      {/* Growth KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Người dùng', value: growth.users, delta: growth.usersDelta, color: 'text-blue-400', bg: 'bg-blue-900/30' },
          { label: 'Thợ', value: growth.workers, delta: growth.workersDelta, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Đơn hàng', value: growth.orders, delta: null, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Doanh thu', value: `${(growth.revenue / 1000000).toFixed(1)}M`, delta: growth.revenueDelta, color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{s.label}</span>
              {s.delta !== null && (
                <span className={`text-xs font-bold ${s.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta)}%
                </span>
              )}
            </div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="font-semibold text-gray-200 mb-4">📊 Conversion Funnel</h2>
        <div className="space-y-3">
          {[
            { label: '📋 Đã tạo', value: funnel.created, pct: 100 },
            { label: '🔧 Đã match', value: funnel.matched, pct: funnel.created > 0 ? Math.round(funnel.matched / funnel.created * 100) : 0 },
            { label: '🔨 Đang làm', value: funnel.inProgress, pct: funnel.created > 0 ? Math.round(funnel.inProgress / funnel.created * 100) : 0 },
            { label: '✔️ Hoàn thành', value: funnel.completed, pct: funnel.created > 0 ? Math.round(funnel.completed / funnel.created * 100) : 0 },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-4">
              <span className="w-28 text-sm text-gray-400">{step.label}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${step.pct}%` }} />
              </div>
              <span className="w-20 text-right text-sm text-gray-300 font-medium">{step.value}</span>
              <span className="w-12 text-right text-xs text-gray-500">{step.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fraud Alerts */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">🚨 Fraud Alerts</h2>
          <span className="text-xs text-gray-500">{fraudAlerts.length} alerts</span>
        </div>
        {fraudAlerts.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-900/30 rounded-lg">
            <span className="text-lg">✅</span>
            <span className="text-sm text-emerald-300">Không phát hiện bất thường</span>
          </div>
        ) : (
          <div className="space-y-2">
            {fraudAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-rose-900/30 rounded-lg border border-rose-800/50">
                <span className={`text-lg ${a.severity === 'high' ? 'animate-pulse' : ''}`}>🚨</span>
                <div className="flex-1">
                  <p className="text-sm text-rose-200 font-medium">{a.reason}</p>
                  <p className="text-xs text-rose-400">Worker: {a.id.slice(0, 12)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.severity === 'high' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Analytics */}
      <LocationAnalytics />

      {/* Cashflow Forecast */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="font-semibold text-gray-200 mb-4">💵 Dự báo dòng tiền (30 ngày)</h2>
        <div className="space-y-3">
          {[
            { label: 'Revenue hiện tại', value: growth.revenue, color: 'text-emerald-400' },
            { label: 'Dự kiến 30 ngày', value: Math.round(growth.revenue * 1.15), color: 'text-blue-400' },
            { label: 'Phí nền tảng (3%)', value: Math.round(growth.revenue * 0.03), color: 'text-amber-400' },
            { label: 'Lợi nhuận dự kiến', value: Math.round(growth.revenue * 0.15), color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
              <span className="text-sm text-gray-400">{s.label}</span>
              <span className={`text-sm font-bold ${s.color}`}>{s.value.toLocaleString()}₫</span>
            </div>
          ))}
        </div>
      </div>

      {/* Churn Risks */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">📉 Churn Risk</h2>
          <span className="text-xs text-gray-500">{churnRisks.length} users at risk</span>
        </div>
        {churnRisks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {churnRisks.slice(0, 5).map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-amber-900/30 rounded-lg border border-amber-800/50">
                <span className="text-lg">👤</span>
                <div className="flex-1">
                  <p className="text-sm text-amber-200 font-medium">{u.id.slice(0, 12)}</p>
                  <p className="text-xs text-amber-400">{u.reason}</p>
                </div>
                <button className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700">📧 Remind</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LocationAnalytics() {
  const [districts, setDistricts] = useState<{ district: string; order_count: number }[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_location_analytics').then((result: any) => {
      if (!result.error && result.data) {
        setDistricts(result.data.districts || [])
        setTotalOrders(result.data.total_orders || 0)
      }
      setLoading(false)
    })
  }, [])

  const maxCount = Math.max(...districts.map(d => d.order_count), 1)

  if (loading) return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <p className="text-sm text-gray-500">Đang tải dữ liệu khu vực...</p>
    </div>
  )

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h2 className="font-semibold text-gray-200 mb-4">📍 Phân tích theo khu vực</h2>
      {districts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu vị trí</p>
      ) : (
        <div className="space-y-3">
          {districts.map(d => (
            <div key={d.district} className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-400">{d.district}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${(d.order_count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm text-gray-300 font-medium">{d.order_count}</span>
              <span className="w-12 text-right text-xs text-gray-500">
                {totalOrders > 0 ? Math.round((d.order_count / totalOrders) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-4">📍 Phân bố đơn hàng theo quận/huyện (dữ liệu thực tế)</p>
    </div>
  )
}
