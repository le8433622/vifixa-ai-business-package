'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: 'order_status' | 'payment' | 'dispute'
  title: string
  message: string
  orderId?: string
  timestamp: Date
}

const NotificationContext = createContext<{
  notifications: Notification[]
  clearNotification: (id: string) => void
}>({ notifications: [], clearNotification: () => {} })

export function useNotifications() {
  return useContext(NotificationContext)
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserId(data.session.user.id)
        supabase.from('profiles').select('role').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          setRole(profile?.role || null)
        })
      }
    })
  }, [])

  // Subscribe to order changes
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` },
        (payload) => {
          const newStatus = payload.new?.status as string
          const orderId = payload.new?.id as string
          const oldStatus = payload.old?.status as string
          if (newStatus === oldStatus) return

          const statusLabels: Record<string, string> = {
            matched: '🔧 Đã ghép thợ — thợ đang đến!',
            in_progress: '🔨 Thợ đang làm việc',
            completed: '✔️ Hoàn thành! Vui lòng kiểm tra',
          }
          const msg = statusLabels[newStatus]
          if (msg) {
            setNotifications(prev => [{
              id: `order-${orderId}-${newStatus}`,
              type: 'order_status',
              title: 'Cập nhật đơn hàng',
              message: msg,
              orderId,
              timestamp: new Date(),
            }, ...prev.slice(0, 4)])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Auto-remove after 10 seconds
  useEffect(() => {
    if (notifications.length === 0) return
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1))
    }, 10000)
    return () => clearTimeout(timer)
  }, [notifications])

  return (
    <NotificationContext.Provider value={{ notifications, clearNotification: (id: string) => setNotifications(prev => prev.filter(n => n.id !== id)) }}>
      {children}

      {/* Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        {notifications.map(n => (
          <div key={n.id}
            className="bg-white rounded-xl shadow-2xl border border-blue-100 p-4 cursor-pointer hover:shadow-xl transition animate-slide-in"
            onClick={() => { if (n.orderId) router.push(`/customer/orders/${n.orderId}`) }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{n.title.split(' ')[0]}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{n.timestamp.toLocaleTimeString('vi-VN')}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(x => x.id !== n.id)) }}
                className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </NotificationContext.Provider>
  )
}
