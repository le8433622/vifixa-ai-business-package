'use client'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showHistory?: boolean
}

function getColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 border-emerald-400'
  if (score >= 60) return 'text-amber-600 border-amber-400'
  return 'text-red-600 border-red-400'
}

function getBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

function getLabel(score: number): string {
  if (score >= 80) return 'Cao'
  if (score >= 60) return 'Trung bình'
  return 'Thấp'
}

export default function TrustScoreGauge({ score, size = 'md', showLabel = true }: Props) {
  const sizeClasses = { sm: 'w-14 h-14 text-lg', md: 'w-20 h-20 text-2xl', lg: 'w-28 h-28 text-3xl' }

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} rounded-full border-4 ${getColor(score)} flex items-center justify-center font-bold ${getBg(score)}`}>
        {score}
      </div>
      {showLabel && (
        <div>
          <p className={`font-semibold ${getColor(score).split(' ')[0]}`}>
            {getLabel(score)}
          </p>
          <p className="text-xs text-gray-500">Độ tin cậy</p>
        </div>
      )}
    </div>
  )
}
