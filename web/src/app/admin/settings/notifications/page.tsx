'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

interface AppSetting {
  key: string
  value: string | null
  value_type: string
  category: string
  label: string
  description: string
  is_public: boolean
}

interface NotificationEvent {
  key: string
  settingKey: string
  label: string
  description: string
  icon: string
}

const NOTIFICATION_EVENTS: NotificationEvent[] = [
  { key: 'order_confirmation', settingKey: 'notif_order_confirmation', label: 'Order Confirmations', description: 'Notify customer when an order is created', icon: '📋' },
  { key: 'payment_receipt', settingKey: 'notif_payment_receipt', label: 'Payment Receipts', description: 'Notify customer when payment succeeds', icon: '💳' },
  { key: 'worker_assigned', settingKey: 'notif_worker_assigned', label: 'Worker Assigned', description: 'Notify customer when a worker is assigned', icon: '👷' },
  { key: 'job_reminder', settingKey: 'notif_job_reminder', label: 'Job Reminders', description: 'Remind worker before scheduled job time', icon: '⏰' },
]

const SMS_PROVIDERS = [
  { value: '', label: 'Select provider...' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'vonage', label: 'Vonage' },
  { value: 'infobip', label: 'Infobip' },
]

export default function NotificationsSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const { isEnabled } = useFeatureFlags()

  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'push' | 'events'>('email')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('category', 'notification')
        .order('label', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (err: any) {
      console.error('Error fetching notification settings:', err)
      toast('Failed to load notification settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  function getSettingValue(key: string): string {
    if (key in modified) return modified[key]
    const setting = settings.find(s => s.key === key)
    return setting?.value || ''
  }

  function getBooleanValue(key: string): boolean {
    const val = getSettingValue(key)
    return val === 'true'
  }

  function handleChange(key: string, value: string) {
    setModified(prev => ({ ...prev, [key]: value }))
  }

  function handleToggle(key: string, currentValue: boolean) {
    handleChange(key, currentValue ? 'false' : 'true')
  }

  async function handleSave() {
    if (Object.keys(modified).length === 0) {
      toast('No changes to save', 'info')
      return
    }

    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      for (const [key, val] of Object.entries(modified)) {
        // @ts-ignore - Supabase type generation needs update
        const { error } = await supabase
          .from('app_settings' as any)
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('Notification settings saved', 'success')
      fetchSettings()
    } catch (err: any) {
      console.error('Error saving notification settings:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const anyNotifEnabled = isEnabled('email_notifications') || isEnabled('sms_notifications') || isEnabled('push_notifications')

  if (!anyNotifEnabled) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications Settings</h1>
            <p className="text-gray-600 mt-1">Configure email, SMS, and push notification channels</p>
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
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable notification flags</li>
            <li>Then return here to configure providers</li>
          </ol>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Notifications Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications Settings</h1>
          <p className="text-gray-600 mt-1">Configure email (SMTP), SMS, and push notification providers.</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      {/* Channel Status */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Channel Status</h3>
        <div className="flex flex-wrap gap-3">
          {(['email_notifications', 'sms_notifications', 'push_notifications'] as const).map(key => {
            const enabled = isEnabled(key)
            const labels: Record<string, string> = {
              email_notifications: 'Email',
              sms_notifications: 'SMS',
              push_notifications: 'Push',
            }
            const icons: Record<string, string> = { email_notifications: '📧', sms_notifications: '📱', push_notifications: '🔔' }
            return (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                  enabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                <span>{icons[key]}</span>
                <span className="font-medium">{labels[key]}</span>
                <span className="text-xs">{enabled ? 'Active' : 'Off'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'email', label: 'Email (SMTP)', icon: '📧', visible: isEnabled('email_notifications') },
          { key: 'sms', label: 'SMS', icon: '📱', visible: isEnabled('sms_notifications') },
          { key: 'push', label: 'Push', icon: '🔔', visible: isEnabled('push_notifications') },
          { key: 'events', label: 'Event Types', icon: '⚡', visible: true },
        ].filter(t => t.visible).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
                  <p className="text-sm text-gray-600 mt-1">SMTP settings for transactional emails.</p>
                </div>
                <button
                  onClick={() => handleToggle('notif_email_enabled', getBooleanValue('notif_email_enabled'))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    getBooleanValue('notif_email_enabled') ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getBooleanValue('notif_email_enabled') ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            {getBooleanValue('notif_email_enabled') && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={getSettingValue('notif_smtp_host')}
                      onChange={(e) => handleChange('notif_smtp_host', e.target.value)}
                      placeholder="smtp.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={getSettingValue('notif_smtp_port')}
                      onChange={(e) => handleChange('notif_smtp_port', e.target.value)}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={getSettingValue('notif_smtp_user')}
                      onChange={(e) => handleChange('notif_smtp_user', e.target.value)}
                      placeholder="apikey"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={getSettingValue('notif_smtp_password')}
                      onChange={(e) => handleChange('notif_smtp_password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
                    <input
                      type="email"
                      value={getSettingValue('notif_from_address')}
                      onChange={(e) => handleChange('notif_from_address', e.target.value)}
                      placeholder="noreply@vifixa.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                    <input
                      type="text"
                      value={getSettingValue('notif_from_name')}
                      onChange={(e) => handleChange('notif_from_name', e.target.value)}
                      placeholder="Vifixa AI"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            {!getBooleanValue('notif_email_enabled') && (
              <div className="p-6">
                <p className="text-sm text-gray-500">Email is disabled. Toggle the switch above to configure SMTP settings.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SMS Tab */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">SMS Configuration</h2>
                  <p className="text-sm text-gray-600 mt-1">SMS gateway for transactional text messages.</p>
                </div>
                <button
                  onClick={() => handleToggle('notif_sms_enabled', getBooleanValue('notif_sms_enabled'))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    getBooleanValue('notif_sms_enabled') ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getBooleanValue('notif_sms_enabled') ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            {getBooleanValue('notif_sms_enabled') && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Provider</label>
                  <select
                    value={getSettingValue('notif_sms_provider')}
                    onChange={(e) => handleChange('notif_sms_provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SMS_PROVIDERS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={getSettingValue('notif_sms_api_key')}
                    onChange={(e) => handleChange('notif_sms_api_key', e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID / Phone Number</label>
                  <input
                    type="text"
                    value={getSettingValue('notif_sms_sender_id')}
                    onChange={(e) => handleChange('notif_sms_sender_id', e.target.value)}
                    placeholder="+84xxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            {!getBooleanValue('notif_sms_enabled') && (
              <div className="p-6">
                <p className="text-sm text-gray-500">SMS is disabled. Toggle the switch above to configure.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Push Tab */}
      {activeTab === 'push' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
                  <p className="text-sm text-gray-600 mt-1">Mobile push notifications via Expo Push.</p>
                </div>
                <button
                  onClick={() => handleToggle('notif_push_enabled', getBooleanValue('notif_push_enabled'))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    getBooleanValue('notif_push_enabled') ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getBooleanValue('notif_push_enabled') ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            {getBooleanValue('notif_push_enabled') && (
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-3">
                  Push notifications are delivered via Expo Push to the mobile app. No additional configuration required.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expo Push Token (Optional)</label>
                  <input
                    type="text"
                    value={getSettingValue('notif_expo_push_token')}
                    onChange={(e) => handleChange('notif_expo_push_token', e.target.value)}
                    placeholder="ExponentPushToken[xxxxxx]"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used to test push notifications from admin panel</p>
                </div>
              </div>
            )}
            {!getBooleanValue('notif_push_enabled') && (
              <div className="p-6">
                <p className="text-sm text-gray-500">Push notifications are disabled. Toggle the switch above to enable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Notification Events</h2>
              <p className="text-sm text-gray-600 mt-1">Choose which events trigger notifications to users.</p>
            </div>
            <div className="divide-y divide-gray-200">
              {NOTIFICATION_EVENTS.map(event => {
                const enabled = getBooleanValue(event.settingKey)
                return (
                  <div key={event.key} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{event.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{event.label}</h3>
                          <p className="text-sm text-gray-600">{event.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(event.settingKey, enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pending Changes Bar */}
      {Object.keys(modified).length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            {Object.keys(modified).length} change(s) pending
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModified({})}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}