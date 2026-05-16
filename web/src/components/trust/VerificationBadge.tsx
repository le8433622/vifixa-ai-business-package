'use client'

const BADGE_CONFIG = {
  identity: {
    gold: { label: 'Đã xác thực danh tính', icon: '🪪', color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
    silver: { label: 'Đã xác thực cơ bản', icon: '🪪', color: 'bg-gray-100 text-gray-600 border-gray-300', dot: 'bg-gray-400' },
  },
  phone: {
    silver: { label: 'Đã xác thực SĐT', icon: '📱', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
    gold: { label: 'SĐT ưu tiên', icon: '📱', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  },
  skill: {
    bronze: { label: 'Kỹ năng cơ bản', icon: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
    silver: { label: 'Kỹ năng khá', icon: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
    gold: { label: 'Kỹ năng xuất sắc', icon: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  },
  premium: {
    platinum: { label: 'Premium', icon: '⭐', color: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
  },
}

type BadgeType = keyof typeof BADGE_CONFIG
type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum'

interface Props {
  type: BadgeType
  level?: BadgeLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function VerificationBadge({ type, level = 'gold', size = 'sm', showLabel = true }: Props) {
  const config = (BADGE_CONFIG as any)[type]?.[level] as { label: string; icon: string; color: string; dot: string } | undefined
  if (!config) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
