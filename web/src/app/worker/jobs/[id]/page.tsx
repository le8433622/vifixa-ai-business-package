'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkerJobDetail() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { loadJob() }, [jobId])

  async function loadJob() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data } = await supabase
      .from('orders')
      .select('*, customer:customer_id(full_name, phone, email)')
      .eq('id', jobId)
      .single()
    setJob(data)
    setLoading(false)
  }

  async function updateStatus(status: string) {
    setUpdating(true)
    await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', jobId)
    await loadJob()
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔧</p>
        <p className="text-gray-500">Không tìm thấy việc</p>
        <button onClick={() => router.push('/worker/jobs')} className="mt-4 text-emerald-600 hover:underline">
          ← Quay lại
        </button>
      </div>
    )
  }

  const canAccept = job.status === 'pending'
  const canStart = job.status === 'matched' && job.worker_id
  const canComplete = job.status === 'in_progress'

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <button onClick={() => router.push('/worker/jobs')} className="text-sm text-emerald-600 hover:underline">
        ← Danh sách việc
      </button>

      <div className="bg-white rounded-2xl border p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold capitalize">{job.category}</h1>
            <p className="text-gray-500 mt-1">
              {(job as any).customer?.full_name || 'Khách hàng'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            job.status === 'matched' ? 'bg-blue-100 text-blue-700' :
            job.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
            job.status === 'completed' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {job.status === 'pending' ? 'Chờ nhận' :
             job.status === 'matched' ? 'Đã nhận' :
             job.status === 'in_progress' ? 'Đang làm' :
             job.status === 'completed' ? 'Hoàn thành' : job.status}
          </span>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Mô tả</p>
          <p className="text-gray-800">{job.description}</p>
        </div>

        {job.diagnosis && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-700 mb-1">🤖 Chẩn đoán AI</p>
            <p className="text-sm text-blue-900">{job.diagnosis.diagnosis}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Địa chỉ</p>
            <p className="font-medium">{job.address || `${job.location_lat?.toFixed(4)}, ${job.location_lng?.toFixed(4)}`}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Giá trị</p>
            <p className="text-xl font-bold text-emerald-600">{(job.estimated_price || 0).toLocaleString()}₫</p>
          </div>
        </div>

        {(job as any).customer?.phone && (
          <div>
            <p className="text-sm text-gray-500">SĐT khách hàng</p>
            <a href={`tel:${(job as any).customer.phone}`} className="font-medium text-blue-600 hover:underline">
              {(job as any).customer.phone}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {canAccept && (
            <button onClick={() => updateStatus('matched')} disabled={updating}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {updating ? '...' : '✅ Nhận việc'}
            </button>
          )}
          {canStart && (
            <button onClick={() => updateStatus('in_progress')} disabled={updating}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
              {updating ? '...' : '🚀 Bắt đầu'}
            </button>
          )}
          {canComplete && (
            <button onClick={() => updateStatus('completed')} disabled={updating}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {updating ? '...' : '✅ Hoàn thành'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}