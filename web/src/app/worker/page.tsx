'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WorkerCompanionChat from '@/components/companion/WorkerCompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'
import { useAutoMode } from '@/hooks/useAutoMode'

const CATEGORY_LABELS: Record<string, string> = {
  air_conditioning: 'Máy lạnh', electricity: 'Điện', plumbing: 'Nước',
  camera: 'Camera', refrigerator: 'Tủ lạnh', washing_machine: 'Máy giặt',
  water_heater: 'Máy nước nóng', appliance: 'Đồ gia dụng', other: 'Khác',
  cleaning: 'Dọn dẹp', delivery: 'Giao hàng', moving: 'Chuyển nhà',
  elder_care: 'Chăm sóc', child_care: 'Trông trẻ', pet_care: 'Thú cưng',
  tutoring: 'Gia sư', massage: 'Massage',
}

export default function WorkerDashboard() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { appState, context, transition } = useAutoMode(userId, 'worker')
  const { activeOrders, completedOrders } = context

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setUserId(session.user.id)

      const p = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p.error) console.error('Profile fetch error:', p.error)
      setProfile(p.data)
    } catch (err) {
      console.error('WorkerDashboard init failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const activeJob = activeOrders.find(o => o.status === 'in_progress')
  const pendingJobs = activeOrders.filter(o => o.status === 'pending')
  const myJobs = [...activeOrders.filter(o => ['matched', 'in_progress'].includes(o.status)), ...completedOrders]
  const totalEarned = completedOrders.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)
  const todayEarned = completedOrders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)

  const handleAction = useCallback((action: any) => {
    if (action.type === 'view_jobs') router.push('/worker/jobs')
    else if (action.type === 'view_earnings') router.push('/worker/earnings')
    else if (action.type === 'view_profile') router.push('/worker/profile')
    else if (action.type === 'view_job' && action.data?.job_id) router.push(`/worker/jobs/${action.data.job_id}`)
  }, [router])

  if (!userId || loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent" /></div>

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

      {/* Main — Widgets TRÊN, Chat DƯỚI */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* === STATS + MENU (trên cùng) === */}
        
        {/* Auto: Jobs + Stats */}
        {mode === 'auto' && appState !== 'on_job' && (
          <div className="shrink-0 bg-white border-b">
            {pendingJobs.length > 0 && (
              <button onClick={() => router.push('/worker/jobs')}
                className="w-full bg-emerald-50 p-3 flex items-center justify-between hover:bg-emerald-100 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-bold">{pendingJobs.length} việc mới</p>
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS[pendingJobs[0].category] || pendingJobs[0].category} · {pendingJobs[0].estimated_price.toLocaleString()}₫</p>
                  </div>
                </div>
                <span className="text-emerald-600 text-sm font-medium">Xem →</span>
              </button>
            )}
            {(todayEarned > 0 || myJobs.length > 0 || completedOrders.length > 0) && (
              <div className="flex gap-2 p-3">
                {todayEarned > 0 && <StatBox label="Hôm nay" value={`${todayEarned.toLocaleString()}₫`} color="text-emerald-600" />}
                {myJobs.length > 0 && <StatBox label="Việc của tôi" value={String(myJobs.length)} color="text-blue-600" />}
                {completedOrders.length > 0 && <StatBox label="Hoàn thành" value={String(completedOrders.length)} color="text-amber-600" />}
              </div>
            )}
          </div>
        )}

        {/* On-job */}
        {appState === 'on_job' && activeJob && (
          <div className="shrink-0 bg-emerald-50 border-b p-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">🔧 {activeJob.category}</p>
              <p className="text-xs text-gray-500">{activeJob.description?.slice(0, 60)}</p>
            </div>
            <button onClick={() => router.push(`/worker/jobs/${activeJob.id}`)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">📋 Chi tiết</button>
          </div>
        )}

        {/* Manual: Menu */}
        {mode === 'manual' && (
          <div className="shrink-0 bg-white border-b p-4">
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
              <span>{completedOrders.length} hoàn thành</span>
              <span>{totalEarned.toLocaleString()}₫ kiếm được</span>
            </div>
          </div>
        )}

        {/* === AI CHAT (dưới cùng) === */}
        <div className="flex-1 min-h-0">
          <WorkerCompanionChat onAction={handleAction} />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}
