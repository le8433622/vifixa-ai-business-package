'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkerJobs() {
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: available } = await supabase
      .from('orders')
      .select('*, customer:customer_id(full_name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    setJobs(available || [])
    setLoading(false)
  }

  async function acceptJob(jobId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('orders')
      .update({ worker_id: session.user.id, status: 'matched', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    loadJobs()
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔧 Việc gần đây</h1>
        <button onClick={() => router.push('/worker')}
          className="text-sm text-emerald-600 hover:underline">← Về Dashboard</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔧</p>
          <p className="text-gray-500">Chưa có việc mới</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => (
            <div key={job.id} className="bg-white rounded-xl border p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold capitalize">{job.category}</h3>
                  <p className="text-xs text-gray-500">
                    {(job as any).customer?.full_name || 'Khách hàng'} · {(job as any).customer?.phone || ''}
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-600">
                  {(job.estimated_price || 0).toLocaleString()}₫
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{job.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  📍 {job.location_lat?.toFixed(4)}, {job.location_lng?.toFixed(4)}
                </p>
                <button
                  onClick={() => acceptJob(job.id)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition"
                >
                  Nhận việc
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}