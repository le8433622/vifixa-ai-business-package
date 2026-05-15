'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminCompanionChat from '@/components/companion/AdminCompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'
import WalletDashboard from '@/components/wallet/WalletDashboard'

type AppState = 'idle' | 'analysing' | 'alert' | 'oversight'

export default function AdminDashboard() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')
  const [appState, setAppState] = useState<AppState>('idle')
  const [stats, setStats] = useState({ users: 0, workers: 0, orders: 0, revenue: 0, disputes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

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

    // Check if there are alerts
    if (dRes.count && dRes.count > 0) setAppState('alert')
    setLoading(false)
  }

  const handleAction = useCallback((action: any) => {
    if (action.type === 'view_users') router.push('/admin/users')
    else if (action.type === 'view_orders') router.push('/admin/orders')
    else if (action.type === 'view_integrations') router.push('/admin/integrations')
    else if (action.type === 'view_disputes') router.push('/admin/orders')
  }, [router])

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" /></div>

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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* AI Analyst Chat */}
        <div className="absolute inset-0">
          <AdminCompanionChat onAction={handleAction} />
        </div>

        {/* Stats overlay */}
        <div className="absolute top-3 left-3 right-3 pointer-events-none">
          <div className="grid grid-cols-5 gap-2 pointer-events-auto max-w-2xl mx-auto">
            {[
              { label: 'Users', value: stats.users, color: 'text-blue-400', bg: 'bg-blue-900/30' },
              { label: 'Workers', value: stats.workers, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
              { label: 'Orders', value: stats.orders, color: 'text-amber-400', bg: 'bg-amber-900/30' },
              { label: 'Revenue', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: 'text-violet-400', bg: 'bg-violet-900/30' },
              { label: 'Disputes', value: stats.disputes, color: 'text-rose-400', bg: 'bg-rose-900/30' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center backdrop-blur`}>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Treasury section */}
        {mode === 'auto' && appState === 'idle' && (
          <div className="absolute bottom-20 left-3 right-3 pointer-events-none max-w-lg mx-auto">
            <div className="pointer-events-auto">
              <WalletDashboard userId="admin" role="admin" />
            </div>
          </div>
        )}

        {/* Manual mode menu */}
        {mode === 'manual' && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pointer-events-none">
            <div className="bg-gray-800/95 backdrop-blur rounded-2xl shadow-2xl border border-gray-700 pointer-events-auto p-4 max-w-lg mx-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">📋 Admin Menu</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '📊', name: 'Dashboard', href: '/admin' },
                  { icon: '👥', name: 'Users', count: stats.users, href: '/admin/users' },
                  { icon: '📋', name: 'Orders', count: stats.orders, href: '/admin/orders' },
                  { icon: '💳', name: 'Payments', count: null, href: '/admin/payments' },
                  { icon: '⚖️', name: 'Disputes', count: stats.disputes, href: '/admin/disputes' },
                  { icon: '📈', name: 'Analytics', count: null, href: '/admin/analytics' },
                  { icon: '🔌', name: 'Integrations', href: '/admin/integrations' },
                  { icon: '⚙️', name: 'Settings', href: '/admin/settings' },
                ].map(item => (
                  <button key={item.name} onClick={() => router.push(item.href)}
                    className="flex flex-col items-center p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition relative">
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <span className="text-[10px] font-medium text-gray-400">{item.name}</span>
                    {item.count ? <span className="text-[10px] text-indigo-400 font-bold">{item.count}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alert overlay */}
        {appState === 'alert' && stats.disputes > 0 && mode === 'auto' && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none max-w-lg mx-auto">
            <button onClick={() => router.push('/admin/orders')}
              className="w-full bg-rose-900/90 backdrop-blur rounded-xl border border-rose-700 p-3 flex items-center gap-3 pointer-events-auto hover:bg-rose-800/90 transition">
              <span className="text-2xl">🚨</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-rose-100">{stats.disputes} dispute cần xử lý</p>
                <p className="text-xs text-rose-300">AI đã phân tích sơ bộ — click để xem</p>
              </div>
              <span className="text-rose-300 text-lg">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
