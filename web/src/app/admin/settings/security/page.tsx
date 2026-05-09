// Security Settings Page - Stub
// Will be implemented in Step 3.

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function SecuritySettings() {
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled('maintenance_mode') && !isEnabled('debug_mode') && !isEnabled('rate_limit_strict')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Security Settings</h1>
            <p className="text-gray-600 mt-1">Configure security, rate limiting, and maintenance mode</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>
        <FeatureDisabled
          feature="Security Features"
          message="All security features are currently disabled. Enable them in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable security flags</li>
            <li>Configure rate limiting thresholds</li>
            <li>Set up maintenance mode message</li>
            <li>Enable debug mode for troubleshooting</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-gray-600 mt-1">Configure security, rate limiting, and maintenance mode</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Maintenance Mode</h2>
          <p className="text-gray-600 mb-4">Show maintenance banner to all users.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('maintenance_mode')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Maintenance Mode {isEnabled('maintenance_mode') ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Rate Limiting</h2>
          <p className="text-gray-600 mb-4">Configure API rate limits to prevent abuse.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('rate_limit_strict')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Strict Rate Limiting {isEnabled('rate_limit_strict') ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Mode</h2>
          <p className="text-gray-600 mb-4">Show debug info to admins only.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled('debug_mode')}
              readOnly
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Debug Mode {isEnabled('debug_mode') ? 'ON' : 'OFF'}</span>
          </label>
        </div>
      </div>
    </div>
  )
}
