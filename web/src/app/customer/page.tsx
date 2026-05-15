'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CompanionChat from '@/components/companion/CompanionChat'

export default function CustomerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(profile)

    const { data: orders } = await supabase
      .from('orders')
      .select('id, category, description, status, estimated_price, payment_status, created_at')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setOrders(orders || [])
    setLoading(false)
  }

  async function handleAction(action: any) {
    if (action.type === 'view_orders') {
      router.push('/customer/orders')
    } else if (action.type === 'diagnose' && action.data?.request_id) {
      // Do nothing — AI already handled it
    } else if (action.type === 'process_payment') {
      router.push(`/customer/orders/${action.data?.order_id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const activeOrders = orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status))
  const completedOrders = orders.filter(o => o.status === 'completed')
  const totalSpent = completedOrders.reduce((s, o: any) => s + (o.estimated_price || 0), 0)

  return (
    <div className="flex h-screen">
      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {profile?.full_name?.[0] || '?'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{profile?.full_name || 'Khách hàng'}</p>
            <p className="text-xs text-gray-500">AI Companion • Trực tuyến</p>
          </div>
          <button onClick={() => router.push('/customer/orders')} className="text-sm text-blue-600 hover:underline">
            📋 Đơn hàng
          </button>
        </div>
        <CompanionChat persona="customer" onAction={handleAction} />
      </div>

      {/* Sidebar — orders + stats */}
      <div className="hidden lg:block w-80 bg-gray-50 border-l p-4 overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-2xl font-bold text-blue-600">{activeOrders.length}</p>
            <p className="text-xs text-gray-500">Đang xử lý</p>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedOrders.length}</p>
            <p className="text-xs text-gray-500">Hoàn thành</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-gray-500">Tổng chi tiêu</p>
          <p className="text-xl font-bold">{totalSpent.toLocaleString()}₫</p>
        </div>

        {activeOrders.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">📋 Đơn đang xử lý</h3>
            {activeOrders.map((o: any) => (
              <button
                key={o.id}
                onClick={() => router.push(`/customer/orders/${o.id}`)}
                className="w-full bg-white rounded-xl p-3 border mb-2 text-left hover:shadow-sm transition"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium truncate">{o.category}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'matched' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{o.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{o.description}</p>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push('/customer/orders')}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          📋 Tất cả đơn hàng
        </button>
      </div>
    </div>
  )
}