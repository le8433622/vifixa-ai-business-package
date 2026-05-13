'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'
import SettingsPage from '@/components/admin/SettingsPage'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'
import ToggleSwitch from '@/components/admin/ToggleSwitch'
import SaveBar from '@/components/admin/SaveBar'

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
  { key: 'order_confirmation', settingKey: 'notif_order_confirmation', label: 'Xác nhận đơn hàng', description: 'Thông báo khách khi đơn hàng được tạo', icon: '📋' },
  { key: 'payment_receipt', settingKey: 'notif_payment_receipt', label: 'Biên lai thanh toán', description: 'Thông báo khách khi thanh toán thành công', icon: '💳' },
  { key: 'worker_assigned', settingKey: 'notif_worker_assigned', label: 'Thợ được phân công', description: 'Thông báo khách khi thợ được phân công', icon: '👷' },
  { key: 'job_reminder', settingKey: 'notif_job_reminder', label: 'Nhắc nhở công việc', description: 'Nhắc thợ trước giờ làm việc', icon: '⏰' },
]

const SMS_PROVIDERS = [
  { value: '', label: 'Chọn nhà cung cấp...' },
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

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('category', 'notification')
        .order('label', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      console.error('Error fetching notification settings:', err instanceof Error ? err.message : err)
      toast('Không thể tải cài đặt thông báo', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const getSettingValue = useCallback((key: string): string => {
    if (key in modified) return modified[key]
    const setting = settings.find(s => s.key === key)
    return setting?.value || ''
  }, [modified, settings])

  const getBooleanValue = useCallback((key: string): boolean => {
    const val = getSettingValue(key)
    return val === 'true'
  }, [getSettingValue])

  const handleChange = useCallback((key: string, value: string) => {
    setModified(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleToggle = useCallback((key: string, currentValue: boolean) => {
    handleChange(key, currentValue ? 'false' : 'true')
  }, [handleChange])

  const handleSave = useCallback(async () => {
    if (Object.keys(modified).length === 0) {
      toast('Không có thay đổi', 'info')
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
        const { error } = await supabase
          .from('app_settings')
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('Đã lưu cài đặt thông báo', 'success')
      fetchSettings()
    } catch (err) {
      console.error('Error saving notification settings:', err instanceof Error ? err.message : err)
      toast('Không thể lưu cài đặt', 'error')
    } finally {
      setSaving(false)
    }
  }, [modified, toast, router, fetchSettings])

  useEffect(() => {
    queueMicrotask(() => { fetchSettings() })
  }, [fetchSettings])

  const anyNotifEnabled = isEnabled('email_notifications') || isEnabled('sms_notifications') || isEnabled('push_notifications')

  if (!anyNotifEnabled) {
    return (
      <SettingsPage title="Cài đặt thông báo" description="Cấu hình email (SMTP), SMS, và thông báo đẩy.">
        <FeatureDisabled
          feature="Notifications"
          message="Tất cả tính năng thông báo hiện đang tắt. Bật trong Cài đặt Tính năng trước."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Thiết lập nhanh</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Vào <Link href="/admin/settings/features" className="underline">Tính năng</Link> và bật các cờ thông báo</li>
            <li>Sau đó quay lại đây để cấu hình nhà cung cấp</li>
          </ol>
        </div>
      </SettingsPage>
    )
  }

  if (loading) {
    return (
      <SettingsPage title="Cài đặt thông báo" description="Cấu hình email (SMTP), SMS, và thông báo đẩy.">
        <LoadingSkeleton rows={4} height="h-24" />
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Cài đặt thông báo" description="Cấu hình email (SMTP), SMS, và thông báo đẩy.">
      {/* Channel Status */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Trạng thái kênh</h3>
        <div className="flex flex-wrap gap-3">
          {(['email_notifications', 'sms_notifications', 'push_notifications'] as const).map(key => {
            const enabled = isEnabled(key)
            const labels: Record<string, string> = {
              email_notifications: 'Email',
              sms_notifications: 'SMS',
              push_notifications: 'Đẩy',
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
                <span className="text-xs">{enabled ? 'Hoạt động' : 'Tắt'}</span>
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
          { key: 'push', label: 'Đẩy', icon: '🔔', visible: isEnabled('push_notifications') },
          { key: 'events', label: 'Loại sự kiện', icon: '⚡', visible: true },
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
                  <h2 className="text-lg font-semibold text-gray-900">Cấu hình Email</h2>
                  <p className="text-sm text-gray-600 mt-1">Cài đặt SMTP cho email giao dịch.</p>
                </div>
                <ToggleSwitch
                  enabled={getBooleanValue('notif_email_enabled')}
                  onToggle={() => handleToggle('notif_email_enabled', getBooleanValue('notif_email_enabled'))}
                />
              </div>
            </div>
            {getBooleanValue('notif_email_enabled') && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máy chủ SMTP</label>
                    <input
                      type="text"
                      value={getSettingValue('notif_smtp_host')}
                      onChange={(e) => handleChange('notif_smtp_host', e.target.value)}
                      placeholder="smtp.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cổng SMTP</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập SMTP</label>
                    <input
                      type="text"
                      value={getSettingValue('notif_smtp_user')}
                      onChange={(e) => handleChange('notif_smtp_user', e.target.value)}
                      placeholder="apikey"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu SMTP</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ gửi</label>
                    <input
                      type="email"
                      value={getSettingValue('notif_from_address')}
                      onChange={(e) => handleChange('notif_from_address', e.target.value)}
                      placeholder="noreply@vifixa.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên người gửi</label>
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
                <p className="text-sm text-gray-500">Email đang tắt. Bật công tắc để cấu hình SMTP.</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">Cấu hình SMS</h2>
                  <p className="text-sm text-gray-600 mt-1">Cổng SMS cho tin nhắn giao dịch.</p>
                </div>
                <ToggleSwitch
                  enabled={getBooleanValue('notif_sms_enabled')}
                  onToggle={() => handleToggle('notif_sms_enabled', getBooleanValue('notif_sms_enabled'))}
                />
              </div>
            </div>
            {getBooleanValue('notif_sms_enabled') && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp SMS</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khóa API</label>
                  <input
                    type="password"
                    value={getSettingValue('notif_sms_api_key')}
                    onChange={(e) => handleChange('notif_sms_api_key', e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID người gửi / Số điện thoại</label>
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
                <p className="text-sm text-gray-500">SMS đang tắt. Bật công tắc để cấu hình.</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">Thông báo đẩy</h2>
                  <p className="text-sm text-gray-600 mt-1">Thông báo đẩy qua Expo Push.</p>
                </div>
                <ToggleSwitch
                  enabled={getBooleanValue('notif_push_enabled')}
                  onToggle={() => handleToggle('notif_push_enabled', getBooleanValue('notif_push_enabled'))}
                />
              </div>
            </div>
            {getBooleanValue('notif_push_enabled') && (
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-3">
                  Thông báo đẩy được gửi qua Expo Push đến ứng dụng di động. Không cần cấu hình thêm.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token Expo Push (Tùy chọn)</label>
                  <input
                    type="text"
                    value={getSettingValue('notif_expo_push_token')}
                    onChange={(e) => handleChange('notif_expo_push_token', e.target.value)}
                    placeholder="ExponentPushToken[xxxxxx]"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Dùng để kiểm tra thông báo đẩy từ bảng quản trị</p>
                </div>
              </div>
            )}
            {!getBooleanValue('notif_push_enabled') && (
              <div className="p-6">
                <p className="text-sm text-gray-500">Thông báo đẩy đang tắt. Bật công tắc để kích hoạt.</p>
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
              <h2 className="text-lg font-semibold text-gray-900">Sự kiện thông báo</h2>
              <p className="text-sm text-gray-600 mt-1">Chọn sự kiện nào sẽ gửi thông báo đến người dùng.</p>
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
                      <ToggleSwitch
                        enabled={enabled}
                        onToggle={() => handleToggle(event.settingKey, enabled)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <SaveBar
        pendingCount={Object.keys(modified).length}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModified({})}
      />
    </SettingsPage>
  )
}