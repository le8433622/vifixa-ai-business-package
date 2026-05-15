'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function CustomerOrders() {
  const router = useRouter()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return [] }
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const activeOrders = orders.filter((o: any) => ['pending', 'matched', 'in_progress'].includes(o.status))
  const completedOrders = orders.filter((o: any) => ['completed'].includes(o.status))

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Đơn hàng của tôi</h1>
        <button onClick={() => router.push('/customer')}
          className="text-sm text-blue-600 hover:underline">← Về Dashboard</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-gray-500">Chưa có đơn hàng nào</p>
          <button onClick={() => router.push('/customer')}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            💬 Chat với AI để đặt dịch vụ
          </button>
        </div>
      ) : (
        <>
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">Đang xử lý</h2>
              {activeOrders.map((o: any) => <OrderCard key={o.id} order={o} router={router} />)}
            </div>
          )}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">Đã hoàn thành</h2>
              {completedOrders.map((o: any) => <OrderCard key={o.id} order={o} router={router} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order, router }: { order: any; router: any }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    matched: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-600',
    disputed: 'bg-red-100 text-red-700',
  }
  const paymentLabels: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    paid: '✅ Đã thanh toán',
    refunded: '↩️ Đã hoàn tiền',
    failed: '❌ Thất bại',
  }
  const paymentColors: Record<string, string> = {
    unpaid: 'text-yellow-600',
    paid: 'text-green-600',
    refunded: 'text-orange-600',
    failed: 'text-red-600',
  }

  return (
    <button onClick={() => router.push(`/customer/orders/${order.id}`)}
      className="w-full bg-white rounded-xl border p-4 mb-3 text-left hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold capitalize">{order.category}</h3>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${statusColors[order.status] || 'bg-gray-100'}`}>
            {order.status}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{order.description}</p>
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold">{(order.final_price || order.estimated_price || 0).toLocaleString()}₫</span>
        <span className={`text-xs ${paymentColors[order.payment_status] || ''}`}>
          {paymentLabels[order.payment_status] || ''}
        </span>
      </div>
    </button>
  )
}