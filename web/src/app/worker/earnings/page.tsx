"use client"
// Worker Earnings - Web
// Per user request: Complete worker pages

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type EarningsData = {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
  pending: number
  jobs: {
    id: string
    category: string
    completed_at: string
    actual_price: number
    status: string
  }[]
}

export default function WorkerEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pending: 0,
    jobs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month')
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
      fetchEarnings(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchEarnings(userId: string) {
    try {
      setError(null)
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, category, completed_at, actual_price, estimated_price, status')
        .eq('worker_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

      let total = 0
      let thisMonth = 0
      let thisWeek = 0
      let todayEarnings = 0
      let pending = 0

      const jobs = (orders || []).map(order => {
        const price = order.actual_price || order.estimated_price || 0
        total += price
        
        const completedDate = new Date(order.completed_at || order.created_at)
        
        if (completedDate >= monthAgo) {
          thisMonth += price
        }
        if (completedDate >= weekAgo) {
          thisWeek += price
        }
        if (completedDate >= today) {
          todayEarnings += price
        }

        return {
          id: order.id,
          category: order.category,
          completed_at: order.completed_at || order.created_at,
          actual_price: price,
          status: order.status,
        }
      })

      // Fetch pending payments (in_progress jobs with estimated price)
      const { data: pendingJobs } = await supabase
        .from('orders')
        .select('estimated_price')
        .eq('worker_id', userId)
        .eq('status', 'in_progress')

      pending = (pendingJobs || []).reduce((sum, job) => sum + (job.estimated_price || 0), 0)

      setEarnings({
        today: todayEarnings,
        thisWeek,
        thisMonth,
        total,
        pending,
        jobs: jobs.filter(job => {
          const completedDate = new Date(job.completed_at)
          if (timeframe === 'week') return completedDate >= weekAgo
          if (timeframe === 'month') return completedDate >= monthAgo
          return true
        }),
      })
    } catch (error: any) {
      console.error('fetchEarnings error:', error)
      setError(error.message || 'Không thể tải thu nhập')
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
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
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu nhập</h1>
          <p className="text-gray-600 mt-1">Quản lý thu nhập từ công việc</p>
        </div>
        <Link
          href="/worker"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); checkUser(); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Hôm nay</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(earnings.today)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tuần này</p>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(earnings.thisWeek)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tháng này</p>
          <p className="text-2xl font-bold text-purple-600">{formatPrice(earnings.thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tổng thu nhập</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(earnings.total)}</p>
        </div>
      </div>

      {/* Pending */}
      {earnings.pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">💰 Tiền đang chờ</p>
              <p className="text-sm text-yellow-700 mt-1">
                {formatPrice(earnings.pending)} từ các việc đang làm
              </p>
            </div>
            <Link
              href="/worker/jobs"
              className="text-sm text-yellow-800 hover:underline"
            >
              Xem việc →
            </Link>
          </div>
        </div>
      )}

      {/* Time Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Xem theo:</span>
          {(['week', 'month', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf === 'week' ? '7 ngày' : tf === 'month' ? '30 ngày' : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Chi tiết thu nhập ({earnings.jobs.length} việc)
          </h2>
        </div>

        {earnings.jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-600">Chưa có thu nhập trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {earnings.jobs.map((job) => (
              <div key={job.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(job.category)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{job.category}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.completed_at).toLocaleDateString('vi-VN', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{formatPrice(job.actual_price)}
                    </p>
                    <Link
                      href={`/worker/jobs/${job.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
