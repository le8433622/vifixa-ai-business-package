'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  matched: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  disputed: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý', matched: 'Đã ghép thợ', in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành', cancelled: 'Đã hủy', disputed: 'Khiếu nại',
}

export default function CustomerOrders() {
  const router = useRouter()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return [] }
      const { data } = await supabase
        .from('orders').select('*').eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const active = orders.filter((o: any) => ['pending', 'matched', 'in_progress'].includes(o.status))
  const completed = orders.filter((o: any) => ['completed', 'cancelled', 'disputed'].includes(o.status))

  if (isLoading) return (
    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  )

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Đơn hàng</h1>
        <button onClick={() => router.push('/customer')} className="text-sm text-blue-600 hover:underline">← Home</button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-gray-500 mb-4">Chưa có đơn hàng nào</p>
          <button onClick={() => router.push('/customer')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
            💬 Chat với AI để đặt dịch vụ
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Đang xử lý · {active.length}</h2>
              <div className="space-y-2">
                {active.map((o: any) => <OrderCard key={o.id} order={o} router={router} />)}
              </div>
            </div>
          )}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lịch sử · {completed.length}</h2>
            <div className="space-y-2">
              {completed.map((o: any) => <OrderCard key={o.id} order={o} router={router} />)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OrderCard({ order, router }: { order: any; router: any }) {
  const price = order.final_price || order.estimated_price || 0

  return (
    <button onClick={() => router.push(`/customer/orders/${order.id}`)}
      className="w-full bg-white rounded-xl border p-4 text-left hover:shadow-md transition-all active:scale-[0.99]">
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="font-semibold capitalize">{order.category}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <p className="text-sm text-gray-500 line-clamp-1 mb-2">{order.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-blue-600">{price.toLocaleString()}₫</span>
        <span className="text-gray-400">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
      </div>
    </button>
  )
}
