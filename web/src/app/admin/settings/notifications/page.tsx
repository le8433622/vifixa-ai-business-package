// Notifications Settings Page - Stub
// Will be implemented in Step 3

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function NotificationsSettings() {
  const { isEnabled } = useFeatureFlags()

  if (!isEnabled('email_notifications') && !isEnabled('sms_notifications') && !isEnabled('push_notifications')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications Settings</h1>
            <p className="text-gray-600 mt-1">Configure email, SMS, and push notifications</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>
        <FeatureDisabled
          feature="Notifications"
          message="All notification features are currently disabled. Enable them in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable notification flags</li>
            <li>Configure SMTP settings for email</li>
            <li>Set up SMS provider (Twilio, etc.)</li>
            <li>Configure push notification certificates</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications Settings</h1>
          <p className="text-gray-600 mt-1">Configure email, SMS, and push notifications</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
          <p className="text-gray-600 mb-4">Configure SMTP settings for transactional emails.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Order Confirmations</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Receipts</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">SMS Notifications</h2>
          <p className="text-gray-500 text-sm">SMS provider not configured yet.</p>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
          <p className="text-gray-500 text-sm">Push notifications not configured yet.</p>
        </div>
      </div>
    </div>
  )
}
