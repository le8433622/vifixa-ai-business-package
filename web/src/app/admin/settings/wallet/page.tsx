'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
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
      toast('Failed to load wallet settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(key: string, value: string) {
    setModified(prev => ({ ...prev, [key]: value }))
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
        const { error } = await supabase
          .from('app_settings')
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('Wallet settings saved successfully', 'success')
      fetchSettings()
    } catch (err) {
      console.error('Error saving wallet settings:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isEnabled('internal_wallet')) {
    return (
      <SettingsPage title="Wallet & Billing Settings" description="Configure wallet and billing system preferences.">
        <FeatureDisabled
          feature="Internal Wallet"
          message="Internal wallet feature is currently disabled. Enable it in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable &quot;Internal Wallet&quot;</li>
            <li>Then return here to configure fee percentages and payout limits</li>
          </ol>
        </div>
      </SettingsPage>
    )
  }

  if (loading) {
    return (
      <SettingsPage title="Wallet & Billing Settings" description="Configure wallet and billing system preferences.">
        <LoadingSkeleton rows={4} height="h-16" />
      </SettingsPage>
    )
  }

  if (!isEnabled('wallet_system') && !isEnabled('auto_billing')) {
    return (
      <SettingsPage title="Wallet & Billing Settings" description="Configure wallet and billing system preferences.">
        <FeatureDisabled
          feature="Wallet & Billing"
          message="Wallet and billing features are currently disabled. Enable them in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable wallet_system and auto_billing</li>
            <li>Then return here to configure settings</li>
          </ol>
        </div>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Wallet & Billing Settings" description="Configure wallet and billing system preferences.">
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