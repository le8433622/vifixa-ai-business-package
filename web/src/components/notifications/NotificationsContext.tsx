'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface InAppNotification {
  id: string
  user_id: string
  broadcast_id: string | null
  title: string
  body: string
  category: string | null
  priority: string | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  read_at: string | null
  is_archived: boolean
  created_at: string
}

interface NotificationsContextValue {
  notifications: InAppNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archive: (id: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  archive: async () => {},
})

export function useNotifications() {
  return useContext(NotificationsContext)
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setNotifications(data as InAppNotification[])
        setLoading(false)
      })

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<InAppNotification>) => {
          const newNotif = payload.new as InAppNotification
          setNotifications((prev) => [newNotif, ...prev])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<InAppNotification>) => {
          const updated = payload.new as InAppNotification
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    )
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) =>
      prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() })),
    )
  }, [userId])

  const archive = useCallback(async (id: string) => {
    await supabase
      .from('in_app_notifications')
      .update({ is_archived: true })
      .eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, archive }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
