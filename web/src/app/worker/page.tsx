'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CompanionChat from '@/components/companion/CompanionChat'

export default function WorkerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [worker, setWorker] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(profile)

    const { data: worker } = await supabase
      .from('workers')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setWorker(worker)

    const { data: jobs } = await supabase
      .from('orders')
      .select('id, category, description, status, estimated_price, location_lat, location_lng, created_at')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setJobs(jobs || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const activeJobs = jobs.filter(j => ['pending', 'matched', 'in_progress'].includes(j.status))
  const earnings = jobs.filter(j => j.status === 'completed').reduce((s, j: any) => s + (j.estimated_price || 0), 0)

  return (
    <div className="flex h-screen">
      {/* Main chat — AI Co-pilot */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
            {profile?.full_name?.[0] || '🔧'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{profile?.full_name || 'Thợ'}</p>
            <p className="text-xs text-gray-500">
              AI Co-pilot • Uy tín: {worker?.trust_score || 0}%
            </p>
          </div>
          <button onClick={() => router.push('/worker/jobs')} className="text-sm text-emerald-600 hover:underline">
            📋 Việc {activeJobs.length > 0 && `(${activeJobs.length})`}
          </button>
        </div>
        <CompanionChat persona="worker" placeholder="Hỏi AI Co-pilot..." />
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block w-80 bg-gray-50 border-l p-4 overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeJobs.length}</p>
            <p className="text-xs text-gray-500">Việc đang làm</p>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <p className="text-2xl font-bold text-blue-600">{earnings.toLocaleString()}₫</p>
            <p className="text-xs text-gray-500">Tổng thu nhập</p>
          </div>
        </div>

        {activeJobs.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">🔧 Việc cần xử lý</h3>
            {activeJobs.map((j: any) => (
              <button
                key={j.id}
                onClick={() => router.push(`/worker/jobs/${j.id}`)}
                className="w-full bg-white rounded-xl p-3 border mb-2 text-left hover:shadow-sm transition"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium truncate">{j.category}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    j.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    j.status === 'matched' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{j.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{j.description}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {j.location_lat?.toFixed(4)}, {j.location_lng?.toFixed(4)}</p>
              </button>
            ))}
          </div>
        )}

        {worker?.trust_score > 0 && (
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 mb-1">Điểm uy tín</p>
            <div className="w-full h-2 bg-gray-100 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(worker?.trust_score || 0)}%` }} />
            </div>
            <p className="text-right text-xs text-gray-500 mt-1">{worker?.trust_score || 0}/100</p>
          </div>
        )}

        <button
          onClick={() => router.push('/worker/jobs')}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
        >
          🔧 Tìm việc gần đây
        </button>
      </div>
    </div>
  )
}