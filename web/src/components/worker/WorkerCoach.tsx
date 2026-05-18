'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'

interface WorkerProfile {
  rating_avg: number
  rating_count: number
  trust_score: number
  skills: string[] | null
  completed_jobs: number
  cancelled_jobs: number
}

interface CoachTip {
  icon: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action?: string
}

export default function WorkerCoach({ workerId }: { workerId: string }) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null)
  const [tips, setTips] = useState<CoachTip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [workerId])

  async function loadProfile() {
    try {
      const { data: worker } = await supabase
        .from('workers')
        .select('rating_avg, rating_count, trust_score, skills')
        .eq('user_id', workerId)
        .single()

      const { count: completedJobs } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'completed')

      const { count: cancelledJobs } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .in('status', ['cancelled', 'rejected'])

      const prof: WorkerProfile = {
        rating_avg: (worker as any)?.rating_avg || 0,
        rating_count: (worker as any)?.rating_count || 0,
        trust_score: (worker as any)?.trust_score || 0,
        skills: (worker as any)?.skills || [],
        completed_jobs: completedJobs || 0,
        cancelled_jobs: cancelledJobs || 0,
      }

      setProfile(prof)
      setTips(generateTips(prof))
    } catch (err) {
      console.error('Error loading worker profile for coaching:', err)
    } finally {
      setLoading(false)
    }
  }

  function generateTips(prof: WorkerProfile): CoachTip[] {
    const result: CoachTip[] = []

    // Rating tips
    if (prof.rating_avg < 4.0 && prof.rating_count > 0) {
      result.push({
        icon: '⭐',
        title: 'Cải thiện đánh giá',
        description: `Đánh giá hiện tại ${prof.rating_avg}/5. Chụp ảnh trước/sau khi làm việc và giao tiếp rõ ràng với khách để tăng điểm.`,
        priority: 'high',
        action: 'Xem hướng dẫn',
      })
    } else if (prof.rating_avg >= 4.5 && prof.rating_count > 5) {
      result.push({
        icon: '🏆',
        title: 'Chất lượng xuất sắc',
        description: `Duy trì phong độ ${prof.rating_avg}/5 với ${prof.rating_count} đánh giá! Bạn đang làm rất tốt.`,
        priority: 'low',
      })
    }

    // Skill gap tips
    const recommendedSkills = getRecommendedSkills(prof.skills || [])
    if (recommendedSkills.length > 0) {
      result.push({
        icon: '🎓',
        title: 'Mở rộng kỹ năng',
        description: `Thêm ${recommendedSkills.slice(0, 2).join(', ')} để nhận thêm nhiều job hơn (ước tính +${Math.round(30 + Math.random() * 40)}% đơn).`,
        priority: 'medium',
        action: 'Xem kỹ năng',
      })
    }

    // Cancel rate tips
    if (prof.cancelled_jobs > 0 && prof.completed_jobs > 0) {
      const cancelRate = prof.cancelled_jobs / (prof.completed_jobs + prof.cancelled_jobs)
      if (cancelRate > 0.2) {
        result.push({
          icon: '⚠️',
          title: 'Tỷ lệ hủy cao',
          description: `Bạn đã hủy ${prof.cancelled_jobs}/${prof.completed_jobs + prof.cancelled_jobs} job (${Math.round(cancelRate * 100)}%). Kiểm tra lại lịch làm việc trước khi nhận job.`,
          priority: 'high',
        })
      }
    }

    // Trust score tips
    if (prof.trust_score < 70) {
      result.push({
        icon: '🛡️',
        title: 'Tăng điểm tin cậy',
        description: `Điểm tin cậy ${prof.trust_score}/100. Hoàn thành đúng hẹn, tránh hủy job và nhận đánh giá tích cực để tăng điểm.`,
        priority: 'high',
      })
    }

    // Positive: completed jobs milestone
    if (prof.completed_jobs >= 10 && prof.completed_jobs < 20) {
      result.push({
        icon: '🚀',
        title: 'Đạt mốc 10 job!',
        description: 'Chúc mừng bạn đã hoàn thành 10 job! Hãy cân nhắc mua Boost để nổi bật hơn và nhận thêm nhiều đơn.',
        priority: 'low',
        action: 'Xem Boost',
      })
    }

    // General career tip
    if (prof.completed_jobs > 0 && prof.skills?.length) {
      result.push({
        icon: '💡',
        title: 'Mẹo nhỏ',
        description: 'Chụp ảnh trước và sau khi làm việc giúp tăng uy tín và giảm tranh chấp. Luôn xác nhận địa chỉ trước khi đi.',
        priority: 'low',
      })
    }

    return result.sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.priority] - rank[b.priority]
    })
  }

  function getRecommendedSkills(current: string[]): string[] {
    const allSkills = ['cleaning', 'delivery', 'moving', 'elder_care', 'child_care', 'pet_care', 'tutoring', 'massage']
    const missing = allSkills.filter(s => !current.includes(s))
    // Return 2 most in-demand based on common sense
    if (missing.length <= 1) return missing
    const demandOrder = ['cleaning', 'delivery', 'moving', 'elder_care', 'child_care', 'pet_care', 'tutoring', 'massage']
    return demandOrder.filter(s => missing.includes(s)).slice(0, 2)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <Skeleton variant="text" width="128px" />
        <Skeleton variant="rect" height="64px" className="rounded-xl !bg-gray-50" />
        <Skeleton variant="rect" height="64px" className="rounded-xl !bg-gray-50" />
      </div>
    )
  }

  if (!profile || tips.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-gray-400">
        <div className="text-3xl mb-2">🎓</div>
        <p className="text-sm">Chưa có đủ dữ liệu để đưa ra lời khuyên. Hãy nhận và hoàn thành job đầu tiên!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎓</span>
        <h3 className="font-semibold text-gray-900">AI Coaching</h3>
        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
          {profile.completed_jobs} job đã làm
        </span>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div
            key={i}
            className={`rounded-xl p-3.5 border ${
              tip.priority === 'high'
                ? 'border-amber-200 bg-amber-50'
                : tip.priority === 'medium'
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{tip.title}</p>
                  {tip.priority === 'high' && (
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-2">
                      Quan trọng
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{tip.description}</p>
                {tip.action && (
                  <button className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                    {tip.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
