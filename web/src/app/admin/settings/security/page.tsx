'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { FeatureFlag } from '@/types/featureFlags'
import SettingsPage from '@/components/admin/SettingsPage'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'
import ToggleSwitch from '@/components/admin/ToggleSwitch'

interface FeatureFlagWithState extends FeatureFlag {
  toggling?: boolean
}

export default function SecuritySettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [securityFlags, setSecurityFlags] = useState<FeatureFlagWithState[]>([])
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [originalMaintenanceMessage, setOriginalMaintenanceMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingMessage, setSavingMessage] = useState(false)
  const [messageSaved, setMessageSaved] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [flagsResult, settingsResult] = await Promise.all([
        supabase
          .from('feature_flags')
          .select('*')
          .in('key', ['maintenance_mode', 'debug_mode', 'rate_limit_strict'])
          .order('key'),
        supabase
          .from('app_settings')
          .select('key, value')
          .eq('key', 'maintenance_message')
          .single(),
      ])

      if (flagsResult.error) throw flagsResult.error
      setSecurityFlags(flagsResult.data || [])

      const msg = (settingsResult.data?.value as string) || ''
      setMaintenanceMessage(msg)
      setOriginalMaintenanceMessage(msg)
    } catch (err) {
      console.error('Error fetching security data:', err)
      toast('Không thể tải cài đặt bảo mật', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const toggleFlag = useCallback(async (key: string, currentState: boolean) => {
    try {
      setSecurityFlags(prev =>
        prev.map(f => f.key === key ? { ...f, toggling: true } : f)
      )

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/feature-flag`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, enabled: !currentState }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle flag')
      }

      toast(`${!currentState ? 'Đã bật' : 'Đã tắt'}`, 'success')
      await fetchData()
    } catch (err) {
      console.error('Error toggling security flag:', err)
      toast(err instanceof Error ? err.message : 'Không thể chuyển đổi', 'error')
    } finally {
      setSecurityFlags(prev =>
        prev.map(f => f.key === key ? { ...f, toggling: false } : f)
      )
    }
  }, [router, toast, fetchData])

  const saveMaintenanceMessage = useCallback(async () => {
    if (maintenanceMessage === originalMaintenanceMessage) {
      toast('Không có thay đổi', 'info')
      return
    }

    try {
      setSavingMessage(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('app_settings')
        .update({ value: maintenanceMessage, updated_at: new Date().toISOString() })
        .eq('key', 'maintenance_message')

      if (error) throw error

      setOriginalMaintenanceMessage(maintenanceMessage)
      setMessageSaved(true)
      toast('Đã lưu tin nhắn bảo trì', 'success')
      setTimeout(() => setMessageSaved(false), 3000)
    } catch (err) {
      console.error('Error saving maintenance message:', err)
      toast('Không thể lưu tin nhắn', 'error')
    } finally {
      setSavingMessage(false)
    }
  }, [maintenanceMessage, originalMaintenanceMessage, router, toast])

  useEffect(() => {
    queueMicrotask(() => { fetchData() })
  }, [fetchData])

  const getFlagByKey = (key: string) => securityFlags.find(f => f.key === key)

  const flagConfigs = [
    {
      key: 'maintenance_mode',
      title: 'Chế độ bảo trì',
      description: 'Hiển thị banner bảo trì cho người dùng không phải admin. Khách hàng và thợ sẽ thấy thông báo thay vì ứng dụng.',
      icon: '🔧',
    },
    {
      key: 'rate_limit_strict',
      title: 'Giới hạn tốc độ nghiêm ngặt',
      description: 'Áp dụng giới hạn API để ngăn chặn lạm dụng và tấn công DDoS.',
      icon: '🛡️',
    },
    {
      key: 'debug_mode',
      title: 'Chế độ gỡ lỗi',
      description: 'Hiển thị thông tin gỡ lỗi chi tiết cho quản trị viên. Bật để khắc phục sự cố.',
      icon: '🐛',
    },
  ]

  if (loading) {
    return (
      <SettingsPage title="Cài đặt bảo mật" description="Cấu hình cờ bảo mật, chế độ bảo trì, và giới hạn tốc độ.">
        <LoadingSkeleton rows={4} height="h-24" />
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Cài đặt bảo mật" description="Cấu hình cờ bảo mật, chế độ bảo trì, và giới hạn tốc độ.">

      {/* Security Feature Flags */}
      <div className="space-y-4">
        {flagConfigs.map(({ key, title, description, icon }) => {
          const flag = getFlagByKey(key)
          const enabled = flag?.enabled || false
          const toggling = flag?.toggling || false

          return (
            <div key={key} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-2xl mt-0.5">{icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{key}</code>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {enabled ? 'Bật' : 'Tắt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ToggleSwitch
                    enabled={enabled}
                    loading={toggling}
                    onToggle={() => toggleFlag(key, enabled)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Maintenance Message */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tin nhắn bảo trì</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tin nhắn này hiển thị khi chế độ bảo trì được bật.
          </p>
        </div>
        <div className="p-6">
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            rows={3}
            placeholder="Nhập tin nhắn bảo trì..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {maintenanceMessage.length} ký tự
            </div>
            <button
              onClick={saveMaintenanceMessage}
              disabled={savingMessage || maintenanceMessage === originalMaintenanceMessage}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                messageSaved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {savingMessage ? 'Đang lưu...' : messageSaved ? 'Đã lưu!' : 'Lưu tin nhắn'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Về cờ bảo mật</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Chế độ bảo trì</strong> — Chuyển hướng người dùng không phải admin đến trang bảo trì</li>
          <li>• <strong>Giới hạn tốc độ nghiêm ngặt</strong> — Giảm giới hạn API để ngăn chặn lạm dụng</li>
          <li>• <strong>Chế độ gỡ lỗi</strong> — Hiển thị stack trace và thông tin gỡ lỗi cho admin</li>
          <li>• Thay đổi có hiệu lực ngay lập tức trên tất cả client</li>
        </ul>
      </div>
    </SettingsPage>
  )
}