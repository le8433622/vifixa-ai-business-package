// Wallet Settings Page - Stub
// Will be implemented in Step 3

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function WalletSettings() {
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled('internal_wallet')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wallet Settings</h1>
            <p className="text-gray-600 mt-1">Configure internal wallet and payout settings</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>
        <FeatureDisabled
          feature="Internal Wallet"
          message="Internal wallet feature is currently disabled. Enable it in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable "Internal Wallet"</li>
            <li>Set platform fee percentage in General settings</li>
            <li>Configure payout limits (min/max amounts)</li>
            <li>Set up bank transfer integration for payouts</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Wallet Settings</h1>
          <p className="text-gray-600 mt-1">Configure internal wallet and payout settings</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Configuration</h2>
        <p className="text-gray-600 mb-4">Settings for internal wallet system will be implemented here.</p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Platform Fee Settings</h3>
            <p className="text-sm text-gray-600">Configure fees charged on transactions</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Payout Limits</h3>
            <p className="text-sm text-gray-600">Set minimum and maximum withdrawal amounts</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Escrow Rules</h3>
            <p className="text-sm text-gray-600">Configure how funds are held for jobs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
