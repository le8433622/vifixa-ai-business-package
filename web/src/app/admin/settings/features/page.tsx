// Features Management Page - Toggle feature flags ON/OFF
// Per Step 2: Admin Settings UI

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { FeatureFlag } from '@/types/featureFlags'
import SettingsPage from '@/components/admin/SettingsPage'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'
import ToggleSwitch from '@/components/admin/ToggleSwitch'

interface FeatureFlagWithToggle extends FeatureFlag {
  toggling?: boolean
}

const CATEGORY_LINKS: Record<string, string> = {
  payment: '/admin/settings/payments',
  wallet: '/admin/settings/wallet',
  ai: '/admin/settings/ai',
  notification: '/admin/settings/notifications',
  security: '/admin/settings/security',
  system: '/admin/settings/general',
}

const CATEGORY_LABELS: Record<string, string> = {
  payment: 'Thanh toán',
  wallet: 'Ví',
  ai: 'AI',
  notification: 'Thông báo',
  security: 'Bảo mật',
  system: 'Hệ thống',
}

export default function FeaturesSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [flags, setFlags] = useState<FeatureFlagWithToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'payment', label: 'Thanh toán' },
    { value: 'wallet', label: 'Ví' },
    { value: 'ai', label: 'AI' },
    { value: 'notification', label: 'Thông báo' },
    { value: 'security', label: 'Bảo mật' },
    { value: 'system', label: 'Hệ thống' },
  ]

  const fetchFlags = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('label', { ascending: true })

      if (error) throw error
      if (mountedRef.current) setFlags(data || [])
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching flags:', err)
        toast('Failed to load feature flags', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  const toggleFlag = useCallback(async (key: string, currentState: boolean) => {
    try {
      setSaving(key)
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

      toast(`Feature ${!currentState ? 'enabled' : 'disabled'} successfully`, 'success')
      fetchFlags()
    } catch (err) {
      console.error('Error toggling flag:', err)
      toast(err instanceof Error ? err.message : 'Failed to toggle feature', 'error')
    } finally {
      setSaving(null)
    }
  }, [router, toast, fetchFlags])

  useEffect(() => {
    queueMicrotask(() => { fetchFlags() })
  }, [fetchFlags])

  const filteredFlags = categoryFilter === 'all'
    ? flags
    : flags.filter(f => f.category === categoryFilter)

  const groupedFlags = filteredFlags.reduce((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = []
    acc[flag.category].push(flag)
    return acc
  }, {} as Record<string, FeatureFlagWithToggle[]>)

  if (loading) {
    return (
      <SettingsPage title="Tính năng" description="Bật/tắt tính năng không cần deploy code.">
        <LoadingSkeleton rows={4} height="h-20" />
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Tính năng" description="Bật/tắt tính năng không cần deploy code.">
      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Feature Flags List */}
      <div className="space-y-6">
        {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 capitalize">
              {CATEGORY_LABELS[category] || category} ({categoryFlags.length})
            </h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {(categoryFlags as FeatureFlagWithToggle[]).map(flag => (
                <div key={flag.key} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{flag.label}</h3>
                        {flag.requires_config && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            flag.config_completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {flag.config_completed ? 'Đã cấu hình' : 'Chưa cấu hình'}
                          </span>
                        )}
                        {flag.enabled && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Đang hoạt động
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{flag.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Mã: <code className="bg-gray-100 px-1 rounded">{flag.key}</code></span>
                        <span>Danh mục: {flag.category}</span>
                      </div>
                    </div>

                    <ToggleSwitch
                      enabled={flag.enabled}
                      loading={saving === flag.key}
                      onToggle={() => toggleFlag(flag.key, flag.enabled)}
                    />
                  </div>

                  {flag.requires_config && !flag.enabled && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        ⚠️ Cần cấu hình trước khi bật tính năng này.
                        {' '}
                        <Link href={CATEGORY_LINKS[flag.category] || `/admin/settings/${flag.category}`} className="underline font-medium">
                          Cấu hình ngay
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Cách hoạt động</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tính năng mặc định TẮT để an toàn</li>
          <li>• Bật khi sẵn sàng sử dụng</li>
          <li>• Tính năng cần cấu hình trước khi bật</li>
          <li>• Thay đổi có hiệu lực ngay (không cần deploy)</li>
        </ul>
      </div>
    </SettingsPage>
  )
}
