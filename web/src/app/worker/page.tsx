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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* AI Co-pilot Chat — base layer */}
        <div className="absolute inset-0">
          <WorkerCompanionChat onAction={handleAction} />
        </div>

        {/* Auto mode widgets */}
        {mode === 'auto' && appState !== 'on_job' && (
          <div className="absolute bottom-20 left-3 right-3 pointer-events-none">
            <div className="space-y-2 pointer-events-auto max-w-lg mx-auto">
              {/* Available jobs */}
              {pendingJobs.length > 0 && (
                <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 flex items-center justify-between gap-3 hover:shadow-xl transition cursor-pointer"
                  onClick={() => router.push('/worker/jobs')}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="text-sm font-bold">{pendingJobs.length} việc mới</p>
                      <p className="text-xs text-gray-500">{pendingJobs[0].category} · {pendingJobs[0].estimated_price.toLocaleString()}₫</p>
                    </div>
                  </div>
                  <span className="text-emerald-600 text-sm font-medium">Xem →</span>
                </div>
              )}

              {/* Today's stats */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{todayEarned.toLocaleString()}₫</p>
                  <p className="text-[10px] text-gray-500">Hôm nay</p>
                  {todayEarned === 0 && <p className="text-[8px] text-gray-400 mt-0.5">Chưa có</p>}
                </div>
                <div className="flex-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 text-center">
                  <p className={`text-lg font-bold ${myJobs.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{myJobs.length}</p>
                  <p className="text-[10px] text-gray-500">Việc của tôi</p>
                  {myJobs.length === 0 && <p className="text-[8px] text-gray-400 mt-0.5">Nhận việc mới</p>}
                </div>
                <div className="flex-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 text-center">
                  <p className={`text-lg font-bold ${completedJobs.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{completedJobs.length}</p>
                  <p className="text-[10px] text-gray-500">Hoàn thành</p>
                  {completedJobs.length === 0 && <p className="text-[8px] text-gray-400 mt-0.5">Bắt đầu thôi</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* On-job mode */}
        {appState === 'on_job' && activeJob && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
              <div>
                <p className="font-bold text-sm">🔧 Đang làm: {activeJob.category}</p>
                <p className="text-xs text-gray-500">{activeJob.description?.slice(0, 60)}...</p>
              </div>
              <button onClick={() => router.push(`/worker/jobs/${activeJob.id}`)} className="text-xs text-emerald-600 font-medium hover:underline">
                Chi tiết →
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center p-6">
                <div className="text-6xl mb-4">🔧</div>
                <p className="text-lg font-bold mb-2">Đang thực hiện job</p>
                <p className="text-gray-500 mb-6">Mở chi tiết để cập nhật trạng thái</p>
                <button onClick={() => router.push(`/worker/jobs/${activeJob.id}`)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium">
                  📋 Mở chi tiết
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual mode menu */}
        {mode === 'manual' && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pointer-events-none">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border pointer-events-auto p-4 max-w-lg mx-auto">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">📋 Menu</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: '📋', name: 'Việc mới', count: pendingJobs.length, href: '/worker/jobs' },
                  { icon: '🔧', name: 'Đang làm', count: activeJob ? 1 : 0, href: activeJob ? `/worker/jobs/${activeJob.id}` : '/worker/jobs' },
                  { icon: '💰', name: 'Thu nhập', count: null, href: '/worker/earnings' },
                  { icon: '📊', name: 'Lịch sử', count: null, href: '/worker/jobs' },
                  { icon: '🎓', name: 'Học', count: null, href: '/worker/profile' },
                  { icon: '👤', name: 'Hồ sơ', count: null, href: '/worker/profile' },
                ].map(item => (
                  <button key={item.name} onClick={() => router.push(item.href)}
                    className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition relative">
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <span className="text-[10px] font-medium text-gray-600">{item.name}</span>
                    {item.count && item.count > 0 ? (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{item.count}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 pt-2 border-t">
                <span>{myJobs.length} việc</span>
                <span>{completedJobs.length} hoàn thành</span>
                <span>{totalEarned.toLocaleString()}₫ kiếm được</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
