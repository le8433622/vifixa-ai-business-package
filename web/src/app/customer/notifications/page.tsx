'use client'

import { useNotifications } from '@/components/notifications/NotificationsContext'
import { NotificationsProvider } from '@/components/notifications/NotificationsContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function NotificationListInner() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archive, loading } = useNotifications()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Thông báo</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo chưa đọc`
              : 'Không có thông báo mới'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter === 'all' ? 'Chưa đọc' : 'Tất cả'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Đã đọc tất cả
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có thông báo</h3>
          <p className="text-gray-600">
            {filter === 'unread' ? 'Bạn đã đọc tất cả thông báo!' : 'Bạn chưa có thông báo nào.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-colors ${
                !n.is_read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <h3 className={`text-base ${n.is_read ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'}`}>
                      {n.title}
                    </h3>
                    {n.priority === 'urgent' && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">Khẩn</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {n.category && (
                      <span className="text-[11px] text-gray-400 capitalize">· {n.category.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Đã đọc
                    </button>
                  )}
                  <button
                    onClick={() => archive(n.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                  >
                    Lưu trữ
                  </button>
                  {n.action_url && (
                    <button
                      onClick={() => router.push(n.action_url!)}
                      className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Xem →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <NotificationsProvider>
      <NotificationListInner />
    </NotificationsProvider>
  )
}
