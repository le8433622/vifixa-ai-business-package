"use client"
// Worker Job Detail - Web
// Per user request: Complete worker pages

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type Job = {
  id: string
  category: string
  description: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  created_at: string
  updated_at: string
  completed_at?: string
  estimated_price: number
  actual_price?: number
  address?: string
  customer_id?: string
  worker_id?: string
  rating?: number
  feedback?: string
  customer_name?: string
  customer_phone?: string
}

export default function WorkerJobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (jobId) {
      checkUser()
    }
  }, [jobId])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchJob()
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchJob() {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await (supabase as any)
        .from('orders')
        .select(`
          *,
          profiles:customer_id (full_name, phone)
        `)
        .eq('id', jobId)
        .eq('worker_id', session.user.id)
        .single()

      if (error) throw error
      const row = data as (Job & { profiles?: { full_name?: string; phone?: string } }) | null
      if (!row) throw new Error('Không tìm thấy công việc')
      
      setJob({
        ...row,
        customer_name: row.profiles?.full_name,
        customer_phone: row.profiles?.phone,
      })
    } catch (error: any) {
      console.error('fetchJob error:', error)
      setError(error.message || 'Không tìm thấy công việc')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    try {
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { error } = await (supabase as any)
        .from('orders')
        .update(updates)
        .eq('id', jobId)

      if (error) throw error

      // Call AI quality check when marking complete
      if (newStatus === 'completed') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-quality`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order_id: jobId,
                worker_id: session.user.id,
              }),
            })
            if (aiRes.ok) {
              const aiData = await aiRes.json()
              if (!aiData.passed) {
                alert(`Chất lượng: ${aiData.quality_score}/100. ${aiData.recommendations?.join(' ') || ''}`)
              }
            }
          }
        } catch (aiError) {
          console.warn('AI quality check failed:', aiError)
        }
      }

      alert('Cập nhật thành công!')
      fetchJob()
    } catch (error: any) {
      console.error('updateStatus error:', error)
      alert('Lỗi: ' + error.message)
    } finally {
      setUpdating(false)
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
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy công việc</h3>
        <p className="text-gray-600 mb-6">{error || 'Công việc không tồn tại hoặc bạn không có quyền truy cập'}</p>
        <Link
          href="/worker/jobs"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/worker/jobs"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Chi tiết công việc</h1>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCategoryIcon(job.category)}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{job.category}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                {getStatusLabel(job.status)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatPrice(job.estimated_price)}</p>
            {job.actual_price && job.actual_price !== job.estimated_price && (
              <p className="text-sm text-gray-600">Thực tế: {formatPrice(job.actual_price)}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Mô tả vấn đề</h3>
          <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{job.description}</p>
        </div>

        {/* Customer Info */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Thông tin khách hàng</h3>
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="text-gray-900"><span className="font-medium">Tên:</span> {job.customer_name || 'Ẩn danh'}</p>
            <p className="text-gray-900"><span className="font-medium">SĐT:</span> {job.customer_phone || 'Không có'}</p>
            {job.address && (
              <p className="text-gray-900"><span className="font-medium">Địa chỉ:</span> {job.address}</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Thời gian</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Tạo đơn:</span> {new Date(job.created_at).toLocaleString('vi-VN')}</p>
            <p><span className="text-gray-500">Cập nhật:</span> {new Date(job.updated_at).toLocaleString('vi-VN')}</p>
            {job.completed_at && (
              <p><span className="text-gray-500">Hoàn thành:</span> {new Date(job.completed_at).toLocaleString('vi-VN')}</p>
            )}
          </div>
        </div>

        {/* Rating */}
        {job.rating && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Đánh giá từ khách hàng</h3>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-xl">
                  {'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)}
                </span>
                <span className="font-medium">{job.rating}/5</span>
              </div>
              {job.feedback && <p className="text-gray-700 italic">"{job.feedback}"</p>}
            </div>
          </div>
        )}

        {/* Actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">Cập nhật trạng thái</h3>
            <div className="flex flex-wrap gap-3">
              {job.status === 'matched' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={updating}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Bắt đầu làm việc
                </button>
              )}
              {job.status === 'in_progress' && (
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={updating}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Hoàn thành công việc
                </button>
              )}
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Hủy việc
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
