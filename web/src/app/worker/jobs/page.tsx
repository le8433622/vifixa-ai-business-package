"use client"
// Worker Jobs List - Web
// Per user request: Fix critical error (missing web jobs list)

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

type Job = {
  id: string
  category: string
  description: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  estimated_price: number
}

export default function WorkerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()
  const pathname = usePathname()

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
        .from('orders')
        .select('*')
        .eq('worker_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data as Job[])
    } catch (error: any) {
      console.error('fetchJobs error:', error)
      setError(error.message || 'Không thể tải việc làm')
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'matched': return 'bg-purple-100 text-purple-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'disputed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      'completed': 'Hoàn thành',
      'in_progress': 'Đang làm',
      'matched': 'Đã nhận',
      'pending': 'Chờ xử lý',
      'cancelled': 'Đã hủy',
      'disputed': 'Tranh chấp',
    }
    return labels[status] || status
  }

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  const filteredJobs = jobs.filter(job => {
    return statusFilter === 'all' || job.status === statusFilter
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Việc làm của tôi</h1>
          <p className="text-gray-600 mt-1">{filteredJobs.length} / {jobs.length} việc làm</p>
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
          <span className="text-sm text-gray-600">Lọc:</span>
          {['all', 'matched', 'in_progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Tất cả' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchJobs(); }}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {statusFilter !== 'all' ? 'Không tìm thấy việc làm phù hợp' : 'Chưa có việc làm nào'}
          </h3>
          <p className="text-gray-600 mb-6">Các việc làm đã nhận sẽ hiển thị ở đây</p>
          <Link
            href="/worker"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Quay lại Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/worker/jobs/${job.id}`)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xl">
                      {job.category === 'air_conditioning' ? '❄️' : 
                       job.category === 'plumbing' ? '🚿' :
                       job.category === 'electricity' ? '🔌' :
                       job.category === 'camera' ? '📷' : '🔧'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{job.category}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {getStatusLabel(job.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 text-sm">{job.description}</p>
                </div>
                <div className="text-right sm:min-w-[120px]">
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(job.estimated_price)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(job.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/worker/jobs/${job.id}`)
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
