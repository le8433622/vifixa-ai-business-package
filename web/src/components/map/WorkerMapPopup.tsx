'use client'

import TrustScoreGauge from '@/components/trust/TrustScoreGauge'
import VerificationBadge from '@/components/trust/VerificationBadge'
import DistanceBadge from './DistanceBadge'

interface WorkerInfo {
  id: string
  full_name: string
  phone?: string
  avatar_url?: string
  skills?: string[]
  trust_score?: number
  is_verified?: boolean
  rating_avg?: number
  order_count?: number
  location_lat: number
  location_lng: number
}

interface Props {
  worker: WorkerInfo
  userLocation: { lat: number; lng: number }
  onBook?: (workerId: string) => void
  onClose?: () => void
}

export default function WorkerMapPopup({ worker, userLocation, onBook, onClose }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-xl border max-w-xs w-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {worker.avatar_url ? <img src={worker.avatar_url} className="w-12 h-12 rounded-full object-cover" /> : (worker.full_name?.[0] || '🔧')}
            </div>
            <div>
              <p className="font-bold text-base">{worker.full_name || 'Thợ'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${worker.is_verified ? 'bg-green-400' : 'bg-gray-400'}`} />
                <span className="text-xs text-white/80">{worker.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Trust + Badge */}
        <div className="flex items-center gap-3">
          {worker.trust_score != null && <TrustScoreGauge score={worker.trust_score} size="sm" showLabel={false} />}
          <div className="flex flex-col gap-1">
            {worker.is_verified && <VerificationBadge type="identity" level="gold" size="sm" />}
            {worker.rating_avg != null && (
              <span className="text-xs text-gray-600">⭐ {worker.rating_avg.toFixed(1)} · {worker.order_count || 0} đơn</span>
            )}
          </div>
        </div>

        {/* Distance */}
        <DistanceBadge from={userLocation} to={{ lat: worker.location_lat, lng: worker.location_lng }} />

        {/* Skills */}
        {worker.skills && worker.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {worker.skills.slice(0, 5).map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s}</span>
            ))}
          </div>
        )}

        {/* Booking button */}
        {onBook && (
          <button onClick={() => onBook(worker.id)}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
            📅 Đặt thợ này
          </button>
        )}
      </div>
    </div>
  )
}
