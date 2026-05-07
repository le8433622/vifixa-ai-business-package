"use client"
// Worker Job History - Web
// Per user request: Complete worker pages

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Job = {
  id: string
  category: string
  description: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  completed_at?: string
  estimated_price: number
  actual_price?: number
  rating?: number
  feedback?: string
}

export default function WorkerHistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchJobs()
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchJobs() {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('worker_id', session.user.id)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      setJobs(data as Job[])
    } catch (error: any) {
      console.error('fetchJobs error:', error)
      setError(error.message || 'Không thể tải lịch sử')
    } finally {
      setLoading(false)
    }
  }

  function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
      'air_conditioning': '❄️',
      'plumbing': '🚿',
      'electricity': '🔌',
      'camera': '📷',
      'general': '🔧',
    }
    return icons[category] || '🔧'
  }

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return '—'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  function renderStars(rating?: number) {
    if (!rating) return <span className="text-gray-400 text-sm">Chưa đánh giá</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    )
  }

  const filteredJobs = jobs.filter(job => {
    if (timeFilter === 'all') return true
    const completedDate = new Date(job.completed_at || job.created_at)
    const now = new Date()
    const diffDays = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (timeFilter === 'week') return diffDays <= 7
    if (timeFilter === 'month') return diffDays <= 30
    if (timeFilter === 'year') return diffDays <= 365
    return true
  })

  const totalEarnings = filteredJobs
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + (j.actual_price || j.estimated_price || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử công việc</h1>
          <p className="text-gray-600 mt-1">
            {filteredJobs.length} việc • Tổng thu nhập: {formatPrice(totalEarnings)}
          </p>
        </div>
        <Link
          href="/worker"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Thời gian:</span>
          {(['all', 'week', 'month', 'year'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                timeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'Tất cả' : 
               filter === 'week' ? '7 ngày' :
               filter === 'month' ? '30 ngày' : '1 năm'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchJobs(); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lịch sử công việc</h3>
          <p className="text-gray-600">Các việc đã hoàn thành sẽ hiển thị ở đây</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="text-3xl">{getCategoryIcon(job.category)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{job.category}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Hoàn thành</p>
                      <p className="font-medium">
                        {job.completed_at 
                          ? new Date(job.completed_at).toLocaleDateString('vi-VN')
                          : new Date(job.created_at).toLocaleDateString('vi-VN')
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Thu nhập</p>
                      <p className="font-medium text-green-600">
                        {formatPrice(job.actual_price || job.estimated_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Đánh giá</p>
                      {renderStars(job.rating)}
                    </div>
                    <div>
                      <Link
                        href={`/worker/jobs/${job.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                      >
                        Xem chi tiết →
                      </Link>
                    </div>
                  </div>

                  {job.feedback && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 italic">"{job.feedback}"</p>
                    </div>
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
