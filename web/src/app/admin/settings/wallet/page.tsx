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

export default function WalletSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const { isEnabled } = useFeatureFlags()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState<Record<string, string>>({})

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('category', ['wallet', 'billing'])
        .order('label', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      console.error('Error fetching wallet settings:', err)
      toast('Không thể tải cài đặt ví', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleChange = useCallback((key: string, value: string) => {
    setModified(prev => ({ ...prev, [key]: value }))
  }, [])

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
      toast('Đã lưu cài đặt ví thành công', 'success')
      fetchSettings()
    } catch (err) {
      console.error('Error saving wallet settings:', err)
      toast('Không thể lưu cài đặt', 'error')
    } finally {
      setSaving(false)
    }
  }, [modified, toast, router, fetchSettings])

  useEffect(() => {
    queueMicrotask(() => { fetchSettings() })
  }, [fetchSettings])

  if (!isEnabled('internal_wallet')) {
    return (
      <SettingsPage title="Cài đặt Ví & Thanh toán" description="Cấu hình ví và hệ thống thanh toán.">
        <FeatureDisabled
          feature="Internal Wallet"
          message="Tính năng ví nội bộ hiện đang tắt. Bật trong phần Tính năng trước."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Thiết lập nhanh</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Vào <Link href="/admin/settings/features" className="underline">Tính năng</Link> và bật &quot;Ví nội bộ&quot;</li>
            <li>Sau đó quay lại để cấu hình phí và hạn mức thanh toán</li>
          </ol>
        </div>
      </SettingsPage>
    )
  }

  if (loading) {
    return (
      <SettingsPage title="Cài đặt Ví & Thanh toán" description="Cấu hình ví và hệ thống thanh toán.">
        <LoadingSkeleton rows={4} height="h-16" />
      </SettingsPage>
    )
  }

  if (!isEnabled('wallet_system') && !isEnabled('auto_billing')) {
    return (
      <SettingsPage title="Cài đặt Ví & Thanh toán" description="Cấu hình ví và hệ thống thanh toán.">
        <FeatureDisabled
          feature="Wallet & Billing"
          message="Wallet and billing features are currently disabled. Enable them in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Thiết lập nhanh</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Vào <Link href="/admin/settings/features" className="underline">Tính năng</Link> và bật wallet_system và auto_billing</li>
            <li>Sau đó quay lại để cấu hình</li>
          </ol>
        </div>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Cài đặt Ví & Thanh toán" description="Cấu hình ví và hệ thống thanh toán.">
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {settings.map((setting) => (
          <div key={setting.key} className="p-6">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {setting.label}
            </label>
            <p className="text-xs text-gray-500 mb-3">{setting.description}</p>
            {setting.value_type === 'number' ? (
              <input
                type="number"
                value={modified[setting.key] !== undefined ? modified[setting.key] : (setting.value || '0')}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type="text"
                value={modified[setting.key] !== undefined ? modified[setting.key] : (setting.value || '')}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>

      <SaveBar
        pendingCount={Object.keys(modified).length}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModified({})}
      />
    </SettingsPage>
  )
  }