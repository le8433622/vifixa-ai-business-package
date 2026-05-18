'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminCompanionChat from '@/components/companion/AdminCompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'
import WalletDashboard from '@/components/wallet/WalletDashboard'
import { useAutoMode } from '@/hooks/useAutoMode'
import AdminWorkforcePlanning from '@/components/admin/AdminWorkforcePlanning'

export default function AdminDashboard() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')
  const [stats, setStats] = useState({ users: 0, workers: 0, orders: 0, revenue: 0, disputes: 0 })
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { appState, transition } = useAutoMode(userId, 'admin')

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    setUserId(session.user.id)

    const [uRes, wRes, oRes, dRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('estimated_price,status'),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    const orders = (oRes.data || []) as any[]
    const revenue = orders.filter((o: any) => o.status === 'completed')
      .reduce((s: number, o: any) => s + (o.estimated_price || 0), 0)

    setStats({
      users: uRes.count || 0,
      workers: wRes.count || 0,
      orders: orders.length,
      revenue,
      disputes: dRes.count || 0,
    })

    setLoading(false)
  }

  const handleAction = useCallback((action: any) => {
    if (action.type === 'view_users') router.push('/admin/users')
    else if (action.type === 'view_orders') router.push('/admin/orders')
    else if (action.type === 'view_integrations') router.push('/admin/integrations')
    else if (action.type === 'view_disputes') router.push('/admin/disputes')
  }, [router])

  if (!userId || loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" /></div>

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">A</div>
          <div>
            <p className="font-medium text-sm text-gray-200">Admin</p>
            <p className="text-[10px] text-indigo-400 font-medium">
              {appState === 'alert' ? '🚨 Có vấn đề cần xử lý' : appState === 'oversight' ? '📋 Đang giám sát' : '🤖 AI Analyst'}
            </p>
          </div>
        </div>
        {stats.disputes > 0 && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-rose-900/50 text-rose-300 animate-pulse">🚨 {stats.disputes} dispute</span>
        )}
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Main — Flow Layout (KHÔNG absolute) */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* KPI Cards — trên cùng */}
        <div className="bg-gray-800 p-3">
          <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
            {[
              { label: 'Người dùng', value: stats.users, color: 'text-blue-400', bg: 'bg-blue-900/30' },
              { label: 'Thợ', value: stats.workers, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
              { label: 'Đơn hàng', value: stats.orders, color: 'text-amber-400', bg: 'bg-amber-900/30' },
              { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: 'text-violet-400', bg: 'bg-violet-900/30' },
              { label: 'Khiếu nại', value: stats.disputes, color: 'text-rose-400', bg: 'bg-rose-900/30' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Workforce Planning */}
        <div className="px-3 pt-2">
          <AdminWorkforcePlanning />
        </div>

        {/* AI Analyst Chat — flex-1, không absolute */}
        <div className="flex-1 min-h-0">
          <AdminCompanionChat onAction={handleAction} />
        </div>

        {/* Alert */}
        {appState === 'alert' && stats.disputes > 0 && mode === 'auto' && (
          <div className="bg-rose-900/80 border-t border-rose-700 p-3">
            <button onClick={() => router.push('/admin/orders')}
              className="w-full flex items-center gap-3 text-left">
              <span className="text-2xl">🚨</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-100">{stats.disputes} khiếu nại cần xử lý</p>
                <p className="text-xs text-rose-300">AI đã phân tích sơ bộ — click để xem</p>
              </div>
              <span className="text-rose-300">→</span>
            </button>
          </div>
        )}

        {/* Treasury */}
        {mode === 'auto' && appState === 'idle' && (
          <div className="border-t border-gray-700 bg-gray-800 p-3">
            <WalletDashboard userId="admin" role="admin" />
          </div>
        )}

        {/* Manual mode menu */}
        {mode === 'manual' && (
          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">📋 Admin Menu</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: '📊', name: 'Dashboard', href: '/admin' },
                { icon: '👥', name: 'Người dùng', count: stats.users, href: '/admin/users' },
                { icon: '📋', name: 'Đơn hàng', count: stats.orders, href: '/admin/orders' },
                { icon: '💳', name: 'Thanh toán', href: '/admin/payments' },
                { icon: '⚖️', name: 'Khiếu nại', count: stats.disputes, href: '/admin/disputes' },
                { icon: '📈', name: 'Phân tích', href: '/admin/analytics' },
                { icon: '🔌', name: 'Tích hợp', href: '/admin/integrations' },
                { icon: '🤖', name: 'Agent Audit', href: '/admin/agent-audit' },
                { icon: '⚙️', name: 'Cài đặt', href: '/admin/settings' },
              ].map(item => (
                <button key={item.name} onClick={() => router.push(item.href)}
                  className="flex flex-col items-center p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition">
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <span className="text-[10px] font-medium text-gray-400">{item.name}</span>
                  {item.count ? <span className="text-[10px] text-indigo-400 font-bold">{item.count}</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
