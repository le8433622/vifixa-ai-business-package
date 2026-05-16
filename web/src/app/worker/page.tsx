'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WorkerCompanionChat from '@/components/companion/WorkerCompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'

type Job = {
  id: string; category: string; description: string; status: string
  estimated_price: number; customer_id?: string; created_at: string
  location_lat?: number; location_lng?: number
}

type AppState = 'idle' | 'chatting' | 'on_job' | 'completed'

export default function WorkerDashboard() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')
  const [appState, setAppState] = useState<AppState>('idle')
  const [profile, setProfile] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const [p, j] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('orders').select('*').or(`worker_id.eq.${session.user.id},status.eq.pending`).order('created_at', { ascending: false }),
    ])
    setProfile(p.data)
    setJobs(j.data || [])

    const active = (j.data || []).find((o: any) => ['in_progress'].includes(o.status))
    if (active) setAppState('on_job')
    setLoading(false)
  }

  const activeJob = jobs.find(j => j.status === 'in_progress')
  const pendingJobs = jobs.filter(j => j.status === 'pending')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const myJobs = jobs.filter(j => ['matched', 'in_progress', 'completed'].includes(j.status))
  const totalEarned = completedJobs.reduce((s, j) => s + (j.estimated_price || 0), 0)
  const todayEarned = completedJobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString())
    .reduce((s, j) => s + (j.estimated_price || 0), 0)

  const handleAction = useCallback((action: any) => {
    if (action.type === 'view_jobs') router.push('/worker/jobs')
    else if (action.type === 'view_earnings') router.push('/worker/earnings')
    else if (action.type === 'view_profile') router.push('/worker/profile')
    else if (action.type === 'view_job' && action.data?.job_id) router.push(`/worker/jobs/${action.data.job_id}`)
  }, [router])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent" /></div>

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {profile?.full_name?.[0] || '🔧'}
          </div>
          <div>
            <p className="font-medium text-sm">{profile?.full_name || 'Thợ'}</p>
            <p className="text-[10px] text-emerald-500 font-medium">
              {appState === 'on_job' ? '🔧 Đang làm việc' : '🤖 AI Co-pilot'}
            </p>
          </div>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Main — Flow Layout (KHÔNG absolute) */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* AI Co-pilot Chat — flex-1, không absolute */}
        <div className="flex-1 min-h-0">
          <WorkerCompanionChat onAction={handleAction} />
        </div>

        {/* Auto mode — Chỉ hiển thị khi có dữ liệu */}
        {mode === 'auto' && appState !== 'on_job' && (
          <div className="border-t bg-white">
            {pendingJobs.length > 0 && (
              <button onClick={() => router.push('/worker/jobs')}
                className="w-full bg-emerald-50 p-3 flex items-center justify-between hover:bg-emerald-100 transition border-b">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-bold">{pendingJobs.length} việc mới</p>
                    <p className="text-xs text-gray-500">{pendingJobs[0].category} · {pendingJobs[0].estimated_price.toLocaleString()}₫</p>
                  </div>
                </div>
                <span className="text-emerald-600 text-sm font-medium">Xem →</span>
              </button>
            )}
            {/* Stats chỉ hiện khi có dữ liệu */}
            {(todayEarned > 0 || myJobs.length > 0 || completedJobs.length > 0) && (
              <div className="flex gap-2 p-3">
                {todayEarned > 0 && (
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{todayEarned.toLocaleString()}₫</p>
                    <p className="text-[10px] text-gray-500">Hôm nay</p>
                  </div>
                )}
                {myJobs.length > 0 && (
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">{myJobs.length}</p>
                    <p className="text-[10px] text-gray-500">Việc của tôi</p>
                  </div>
                )}
                {completedJobs.length > 0 && (
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{completedJobs.length}</p>
                    <p className="text-[10px] text-gray-500">Hoàn thành</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* On-job mode */}
        {appState === 'on_job' && activeJob && (
          <div className="border-t bg-white p-4 text-center">
            <p className="text-4xl mb-2">🔧</p>
            <p className="text-lg font-bold mb-1">Đang thực hiện: {activeJob.category}</p>
            <p className="text-sm text-gray-500 mb-3">{activeJob.description?.slice(0, 60)}...</p>
            <button onClick={() => router.push(`/worker/jobs/${activeJob.id}`)}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
              📋 Mở chi tiết
            </button>
          </div>
        )}

        {/* Manual mode menu */}
        {mode === 'manual' && (
          <div className="border-t bg-white p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">📋 Menu</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { icon: '📋', name: 'Việc mới', count: pendingJobs.length, href: '/worker/jobs' },
                { icon: '🔧', name: 'Đang làm', count: activeJob ? 1 : 0, href: activeJob ? `/worker/jobs/${activeJob.id}` : '/worker/jobs' },
                { icon: '💰', name: 'Thu nhập', href: '/worker/earnings' },
                { icon: '📊', name: 'Lịch sử', href: '/worker/jobs' },
                { icon: '🎓', name: 'Học', href: '/worker/profile' },
                { icon: '👤', name: 'Hồ sơ', href: '/worker/profile' },
              ].map(item => (
                <button key={item.name} onClick={() => router.push(item.href)}
                  className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition relative">
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600">{item.name}</span>
                  {item.count ? <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{item.count}</span> : null}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 pt-2 border-t">
              <span>{myJobs.length} việc</span>
              <span>{completedJobs.length} hoàn thành</span>
              <span>{totalEarned.toLocaleString()}₫ kiếm được</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
