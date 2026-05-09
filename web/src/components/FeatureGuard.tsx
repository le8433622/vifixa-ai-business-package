// FeatureGuard Component
// Wrapper component to guard UI features with feature flags

'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import type { FeatureFlagGuardProps } from '@/types/featureFlags'

export function FeatureGuard({ flag, fallback, children }: FeatureFlagGuardProps) {
  const { isEnabled, loading, error } = useFeatureFlag(flag)

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded p-4 text-center text-gray-400">
        Loading...
      </div>
    )
  }

  // Error state → render nothing (safe)
  if (error) {
    console.warn(`FeatureGuard error for '${flag}':`, error)
    return null
  }

  // Feature disabled → show fallback or nothing
  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  // Feature enabled → render children
  return <>{children}</>
}

// Disabled State Component (reusable)
export function FeatureDisabled({ feature, message }: { feature: string; message?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">🚫</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {feature}
      </h3>
      <p className="text-gray-500 text-sm">
        {message || 'Tính năng này đang được phát triển. Vui lòng quay lại sau.'}
      </p>
    </div>
  )
}
