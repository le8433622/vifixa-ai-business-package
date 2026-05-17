'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { InAppNotification } from '@/components/notifications/NotificationsContext'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setNotifications(data as InAppNotification[] || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await supabase.from('in_app_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('in_app_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', session.user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications
  const unread = notifications.filter(n => !n.is_read).length

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">🔔 Thông báo</h1>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              Đánh dấu tất cả đã đọc
            </button>
          )}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(['unread', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${filter === f ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                {f === 'unread' ? `Chưa đọc (${unread})` : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-3">🔔</div>
          <p>Không có thông báo {filter === 'unread' ? 'chưa đọc' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n.id}
              className={`bg-gray-800 rounded-xl border ${n.is_read ? 'border-gray-700' : 'border-indigo-700'} p-4 transition hover:bg-gray-750 cursor-pointer`}
              onClick={() => !n.is_read && markRead(n.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[n.priority || 'normal']}`}>
                      {n.priority || 'normal'}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <h3 className="font-semibold text-gray-200 text-sm">{n.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{n.body}</p>
                  {n.action_url && (
                    <span className="text-xs text-indigo-400 mt-2 inline-block hover:underline">{n.action_label || 'Xem chi tiết'} →</span>
                  )}
                </div>
                <span className="text-xs text-gray-500 shrink-0">{new Date(n.created_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}