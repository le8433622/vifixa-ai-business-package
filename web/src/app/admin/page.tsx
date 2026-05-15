'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: workerCount } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('is_verified', true)
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: pendingCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { data: recentOrders } = await supabase.from('orders').select('*, customer:customer_id(full_name)').order('created_at', { ascending: false }).limit(10)
    const { data: revenue } = await supabase.from('transactions').select('amount').eq('status', 'succeeded')

    setStats({
      users: userCount || 0,
      workers: workerCount || 0,
      orders: orderCount || 0,
      pending: pendingCount || 0,
      revenue: (revenue || []).reduce((s: number, t: any) => s + (t.amount || 0), 0),
      recentOrders: recentOrders || [],
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🛡️ Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Người dùng" value={stats.users} color="blue" />
        <StatCard label="Thợ đã xác thực" value={stats.workers} color="emerald" />
        <StatCard label="Đơn hàng" value={stats.orders} color="purple" />
        <StatCard label="Đơn chờ xử lý" value={stats.pending} color="amber" />
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-bold mb-1">💰 Doanh thu</h2>
        <p className="text-3xl font-bold text-emerald-600">{stats.revenue.toLocaleString()}₫</p>
        <p className="text-xs text-gray-500">Từ các giao dịch đã hoàn thành</p>
      </div>

      <div>
        <h2 className="font-bold mb-3">📋 Đơn hàng gần đây</h2>
        <div className="space-y-2">
          {stats.recentOrders?.length > 0 ? stats.recentOrders.map((o: any) => (
            <div key={o.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
              <div>
                <p className="font-medium capitalize">{o.category}</p>
                <p className="text-xs text-gray-500">{(o as any).customer?.full_name || '?'} · {o.status}</p>
              </div>
              <span className="font-bold">{(o.estimated_price || 0).toLocaleString()}₫</span>
            </div>
          )) : (
            <p className="text-gray-500 text-sm">Chưa có đơn hàng</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => router.push('/admin/users')}
          className="bg-white border rounded-xl p-4 text-left hover:shadow-md transition">
          <span className="text-2xl">👥</span>
          <p className="font-medium text-sm mt-1">Người dùng</p>
        </button>
        <button onClick={() => router.push('/admin/workers')}
          className="bg-white border rounded-xl p-4 text-left hover:shadow-md transition">
          <span className="text-2xl">🔧</span>
          <p className="font-medium text-sm mt-1">Quản lý thợ</p>
        </button>
        <button onClick={() => router.push('/admin/orders')}
          className="bg-white border rounded-xl p-4 text-left hover:shadow-md transition">
          <span className="text-2xl">📋</span>
          <p className="font-medium text-sm mt-1">Đơn hàng</p>
        </button>
        <button onClick={() => router.push('/admin/settings/payments')}
          className="bg-white border rounded-xl p-4 text-left hover:shadow-md transition">
          <span className="text-2xl">💳</span>
          <p className="font-medium text-sm mt-1">Cấu hình Payment</p>
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  )
}