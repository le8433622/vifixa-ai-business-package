'use client'

import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  compact?: boolean
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact,
}: EmptyStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-16'}`}>
      <div className={`${compact ? 'text-3xl' : 'text-5xl'} mb-${compact ? '2' : '4'}`}>{icon}</div>
      <h3 className={`font-semibold text-gray-500 ${compact ? 'text-sm' : 'text-lg'} mb-1`}>{title}</h3>
      {description && <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'} text-center max-w-xs`}>{description}</p>}
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref} className={`mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition`}>
            {actionLabel}
          </Link>
        ) : onAction ? (
          <button onClick={onAction} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            {actionLabel}
          </button>
        ) : null
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {content}
    </div>
  )
}
