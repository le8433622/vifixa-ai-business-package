'use client'

import { haversineDistance, formatDistance, formatDuration } from '@/lib/haversine'

interface DistanceBadgeProps {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  className?: string
}

export default function DistanceBadge({ from, to, className = '' }: DistanceBadgeProps) {
  const km = haversineDistance(from.lat, from.lng, to.lat, to.lng)
  const minutes = Math.round((km / 30) * 60)

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium ${className}`}>
      <span>📍</span>
      <span>{formatDistance(km)}</span>
      <span className="text-blue-400">·</span>
      <span>~{minutes} phút</span>
    </span>
  )
}
