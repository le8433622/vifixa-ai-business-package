'use client'

import { useRouter } from 'next/navigation'
import { RankedJob } from '@/hooks/useWorkerAutoMode'

interface WorkerJobRankerProps {
  jobs: RankedJob[]
  onAccept: (jobId: string) => void
  loading: boolean
}

export default function WorkerJobRanker({ jobs, onAccept, loading }: WorkerJobRankerProps) {
  const router = useRouter()

  const CATEGORY_ICONS: Record<string, string> = {
    air_conditioning: '❄️', electricity: '💡', plumbing: '🚿',
    camera: '📷', refrigerator: '🧊', washing_machine: '👕',
    water_heater: '🔥', appliance: '🔌', other: '🔧',
    cleaning: '🧹', delivery: '📦', moving: '🚚',
  }

  const CATEGORY_LABELS: Record<string, string> = {
    air_conditioning: 'Máy lạnh', electricity: 'Điện', plumbing: 'Nước',
    camera: 'Camera', refrigerator: 'Tủ lạnh', washing_machine: 'Máy giặt',
    water_heater: 'Máy nước nóng', appliance: 'Đồ gia dụng', other: 'Khác',
    cleaning: 'Dọn dẹp', delivery: 'Giao hàng', moving: 'Chuyển nhà',
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Rất phù hợp'
    if (score >= 60) return 'Phù hợp'
    if (score >= 40) return 'Tạm ổn'
    return 'Ít phù hợp'
  }

  if (jobs.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <span className="text-3xl">📋</span>
        <p className="text-sm text-gray-500 mt-2">Chưa có việc mới phù hợp</p>
        <p className="text-xs text-gray-400 mt-1">AI sẽ tự động tìm việc khi có đơn mới</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-gray-700">🤖 Việc được xếp hạng bởi AI</h3>
        <span className="text-[10px] text-gray-400">{jobs.length} việc</span>
      </div>

      {jobs.map((job, i) => (
        <div
          key={job.id}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
        >
          {/* Header: Rank + Score */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-lg">{CATEGORY_ICONS[job.category] || '🔧'}</span>
              <span className="text-sm font-semibold text-gray-800">
                {CATEGORY_LABELS[job.category] || job.category}
              </span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(job.match_score)}`}>
              {job.match_score}% — {getScoreLabel(job.match_score)}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{job.description}</p>

          {/* Match reasons */}
          {job.match_reasons && job.match_reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {job.match_reasons.slice(0, 3).map((reason, ri) => (
                <span key={ri} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  ✓ {reason}
                </span>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-3">
              {job.distance_km !== undefined && (
                <span>📍 {job.distance_km.toFixed(1)} km</span>
              )}
              {job.eta_minutes !== undefined && (
                <span>🚗 {job.eta_minutes} phút</span>
              )}
              <span>💰 {(job.estimated_price || 0).toLocaleString()}₫</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/worker/jobs/${job.id}`)}
              className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
            >
              👁️ Xem chi tiết
            </button>
            <button
              onClick={() => onAccept(job.id)}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 transition shadow-sm"
            >
              {loading ? 'Đang xử lý...' : '✅ Nhận việc'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
