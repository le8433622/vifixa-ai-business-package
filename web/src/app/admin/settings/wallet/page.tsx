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
    } catch (err: any) {
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
        // @ts-ignore - Supabase type generation needs update
        const { error } = await supabase
          .from('app_settings' as any)
          // @ts-ignore
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('Wallet settings saved successfully', 'success')
      fetchSettings()
    } catch (err: any) {
      console.error('Error saving wallet settings:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const getValueForKey = (key: string): string => {
    if (key in modified) return modified[key]
    const setting = settings.find(s => s.key === key)
    return setting?.value || ''
  }

  const formatCurrency = (value: string) => {
    const num = parseInt(value)
    if (isNaN(num)) return value
    return new Intl.NumberFormat('vi-VN').format(num) + ' VND'
  }

  if (!isEnabled('internal_wallet')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wallet Settings</h1>
            <p className="text-gray-600 mt-1">Configure internal wallet, fees, and payout limits</p>
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
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable &quot;Internal Wallet&quot;</li>
            <li>Then return here to configure fee percentages and payout limits</li>
          </ol>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Wallet Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Wallet Settings</h1>
          <p className="text-gray-600 mt-1">Configure platform fees, payout limits, and escrow rules.</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="space-y-6">
        {/* Platform Fee */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Platform Fee</h2>
            <p className="text-sm text-gray-600 mt-1">Percentage taken from each transaction as platform revenue.</p>
          </div>
          {settings.filter(s => s.key === 'platform_fee_percent').map((setting) => (
            <div key={setting.key} className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {setting.label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={getValueForKey(setting.key)}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{setting.description}</p>
            </div>
          ))}
        </div>

        {/* Payout Limits */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payout Limits</h2>
            <p className="text-sm text-gray-600 mt-1">Minimum and maximum amounts workers can withdraw.</p>
          </div>
          <div className="divide-y divide-gray-200">
            {settings.filter(s => ['min_payout_amount', 'max_payout_amount'].includes(s.key)).map((setting) => {
              const raw = getValueForKey(setting.key)
              return (
                <div key={setting.key} className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {setting.label}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={raw}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">VND</span>
                    {raw && !isNaN(parseInt(raw)) && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {formatCurrency(raw)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{setting.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payout Fee */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payout Fee</h2>
            <p className="text-sm text-gray-600 mt-1">Flat fee deducted per withdrawal transaction.</p>
          </div>
          {settings.filter(s => s.key === 'payout_fee').map((setting) => {
            const raw = getValueForKey(setting.key)
            return (
              <div key={setting.key} className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {setting.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={raw}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">VND</span>
                  {raw && !isNaN(parseInt(raw)) && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {formatCurrency(raw)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{setting.description}</p>
              </div>
            )
          })}
        </div>
      </div>

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