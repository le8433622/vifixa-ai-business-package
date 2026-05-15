// 📊 V4 DASHBOARD — AI-generated insights, không có table, không có form
// Mọi dữ liệu được AI phân tích và tóm tắt

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function V4Dashboard() {
  const router = useRouter()
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data: profile }) => {
        setRole((profile as any)?.role || 'customer')
        taiInsights(session.access_token, (profile as any)?.role || 'customer', session.user.id)
      })
    })
  }, [])

  async function taiInsights(token: string, userRole: string, userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const headers = { Authorization: `Bearer ${token}` }

    try {
      // Lấy dữ liệu thô
      let duLieu: any = {}

      if (userRole === 'customer') {
        const { data: orders } = await supabase.from('orders').select('id, status, final_price, estimated_price, category').eq('customer_id', userId)
        duLieu = { don: orders || [], role: 'customer' }
      } else if (userRole === 'worker') {
        const { data: orders } = await supabase.from('orders').select('id, status, final_price, estimated_price, category, rating').eq('worker_id', userId)
        duLieu = { don: orders || [], role: 'worker' }
      } else if (userRole === 'admin') {
        const [costRes, orderRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/ai_cost_log?select=cost&order=created_at.desc&limit=100`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/orders?select=id,status,category,final_price&limit=5`, { headers }),
        ])
        duLieu = { chiPhi: await costRes.json(), don: await orderRes.json(), role: 'admin' }
      }

      // Gửi lên AI để phân tích
      const res = await fetch(`${supabaseUrl}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'phan_tich', noiDung: JSON.stringify(duLieu) }),
      })
      const data = await res.json()
      setInsights(data.ketQuaCuoi || data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const INSIGHTS_MAC: Record<string, Array<{ icon: string; label: string; color: string }>> = {
    customer: [
      { icon: '📋', label: 'Đặt dịch vụ mới', color: 'from-blue-500 to-indigo-500' },
      { icon: '🗺️', label: 'Xem bản đồ', color: 'from-emerald-500 to-teal-500' },
      { icon: '💬', label: 'Chat với AI', color: 'from-violet-500 to-purple-500' },
      { icon: '📊', label: 'Đơn hàng', color: 'from-amber-500 to-orange-500' },
    ],
    worker: [
      { icon: '📋', label: 'Việc làm mới', color: 'from-blue-500 to-indigo-500' },
      { icon: '🗺️', label: 'Tối ưu tuyến', color: 'from-emerald-500 to-teal-500' },
      { icon: '💰', label: 'Thu nhập', color: 'from-violet-500 to-purple-500' },
      { icon: '🎓', label: 'AI Coach', color: 'from-amber-500 to-orange-500' },
    ],
    admin: [
      { icon: '🧠', label: 'Trung tâm AI', color: 'from-blue-500 to-indigo-500' },
      { icon: '📡', label: 'Giám sát', color: 'from-emerald-500 to-teal-500' },
      { icon: '🔥', label: 'Nhu cầu', color: 'from-violet-500 to-purple-500' },
      { icon: '💰', label: 'Chi phí', color: 'from-amber-500 to-orange-500' },
    ],
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* AI Insights hero */}
      {loading ? (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white animate-pulse">
          <p className="text-lg">AI đang phân tích...</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <p className="text-sm text-blue-200 mb-1">🤖 AI Insights</p>
          <p className="text-lg font-bold">
            {insights?.phanTich || insights?.deXuat?.[0] || 'Chào mừng bạn đến với Vifixa AI!'}
          </p>
          {insights?.deXuat && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(insights.deXuat as string[]).slice(0, 3).map((d: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-white/20 rounded-lg text-xs">{d}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">⚡ Hành động nhanh</p>
        <div className="grid grid-cols-2 gap-3">
          {(INSIGHTS_MAC[role] || INSIGHTS_MAC.customer).map((item, i) => (
            <button key={i} onClick={() => router.push(i === 0 ? '/v4/chat' : i === 1 ? '/v4' : i === 2 ? '/v4/chat' : `/v4${role === 'admin' ? '/dashboard' : ''}`)}
              className={`bg-gradient-to-br ${item.color} rounded-xl p-4 text-white text-left hover:opacity-90 transition-opacity`}>
              <span className="text-2xl">{item.icon}</span>
              <p className="font-bold text-sm mt-2">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">📈 Thống kê nhanh</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-2xl font-bold text-blue-600">
              {role === 'customer' ? '—' : role === 'worker' ? '—' : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Tổng số</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-2xl font-bold text-green-600">—</p>
            <p className="text-xs text-gray-500 mt-1">Hôm nay</p>
          </div>
        </div>
      </div>

      {/* Bottom spacer for navigation */}
      <div className="h-4" />
    </div>
  )
}