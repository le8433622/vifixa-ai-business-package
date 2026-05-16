'use client'

interface VFCData {
  balance: number
  tier: string
  multiplier: number
  points_to_next: number
}

const TIER_CONFIG: Record<string, { label: string; icon: string; color: string; min: number }> = {
  bronze: { label: 'Đồng', icon: '🥉', color: 'text-orange-600 bg-orange-50 border-orange-200', min: 0 },
  silver: { label: 'Bạc', icon: '🥈', color: 'text-gray-600 bg-gray-50 border-gray-300', min: 1000 },
  gold: { label: 'Vàng', icon: '🥇', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', min: 5000 },
  platinum: { label: 'Bạch kim', icon: '💎', color: 'text-purple-600 bg-purple-50 border-purple-200', min: 20000 },
}

interface Props {
  data?: VFCData | null
  loading?: boolean
}

export default function VFCBadge({ data, loading }: Props) {
  if (loading) return <div className="animate-pulse h-16 bg-gray-100 rounded-xl" />
  if (!data) return null

  const tier = TIER_CONFIG[data.tier] || TIER_CONFIG.bronze
  const progress = data.tier !== 'platinum' && data.points_to_next > 0
    ? Math.min(100, Math.round((data.balance / (data.balance + data.points_to_next)) * 100))
    : 100

  return (
    <div className={`rounded-xl border p-4 ${tier.color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tier.icon}</span>
          <div>
            <p className="font-bold text-lg">{data.balance.toLocaleString()} VFC</p>
            <p className="text-xs font-medium">{tier.label} · x{data.multiplier} thưởng</p>
          </div>
        </div>
        <span className="text-sm font-bold">{tier.label}</span>
      </div>
      {data.tier !== 'platinum' && data.points_to_next > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>{data.balance.toLocaleString()} VFC</span>
            <span>{data.balance + data.points_to_next >= 0 ? `Cần ${data.points_to_next} điểm nữa` : `Hạng ${tier.label}`}</span>
          </div>
          <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-current opacity-60 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
