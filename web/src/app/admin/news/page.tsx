'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'

interface Broadcast {
  id: string
  title: string
  category: string
  priority: string
  status: string
  target_role: string
  view_count: number
  sent_count: number
  created_at: string
  scheduled_at: string | null
  published_at: string | null
  is_ai_generated: boolean
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-800',
}

const CATEGORY_ICON: Record<string, string> = {
  promotion: '🎉',
  news: '📢',
  technology: '🚀',
  maintenance_tip: '🔧',
  policy_update: '📋',
  worker_tip: '🛠️',
}

export default function AdminNews() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const mountedRef = useRef(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      let query = supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter && ['draft', 'scheduled', 'published', 'archived'].includes(filter)) {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      if (mountedRef.current) setItems((data || []) as Broadcast[])
    } catch (err) {
      if (mountedRef.current) toast('Không thể tải bản tin', 'error')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, filter])

  useEffect(() => { queueMicrotask(() => fetch()) }, [fetch])

  const tabs = [
    { value: '', label: 'Tất cả' },
    { value: 'draft', label: 'Nháp' },
    { value: 'scheduled', label: 'Đã lên lịch' },
    { value: 'published', label: 'Đã xuất bản' },
    { value: 'archived', label: 'Lưu trữ' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">📢 Bản tin</h1>
        <Link href="/admin/news/compose"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          ✨ Tạo bản tin
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Chưa có bản tin nào.{' '}
          <Link href="/admin/news/compose" className="text-blue-600 hover:underline">Tạo bản tin đầu tiên →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{CATEGORY_ICON[b.category] || '📄'}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{b.title}</p>
                    <p className="text-xs text-gray-400">
                      {b.is_ai_generated ? '🤖 AI' : '👤 Admin'} · {new Date(b.created_at).toLocaleDateString('vi-VN')}
                      {b.scheduled_at && ` · 📅 ${new Date(b.scheduled_at).toLocaleDateString('vi-VN')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {b.sent_count > 0 && <span className="text-xs text-gray-400">📨 {b.sent_count}</span>}
                  {b.view_count > 0 && <span className="text-xs text-gray-400">👁 {b.view_count}</span>}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[b.status] || 'bg-gray-100'}`}>
                    {b.status === 'draft' ? 'Nháp' : b.status === 'scheduled' ? 'Đã lên lịch' : b.status === 'published' ? 'Đã xuất bản' : b.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
