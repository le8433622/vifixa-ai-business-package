// Features Management Page - Toggle feature flags ON/OFF
// Per Step 2: Admin Settings UI

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { FeatureFlag } from '@/types/featureFlags'

interface FeatureFlagWithToggle extends FeatureFlag {
  toggling?: boolean
}

export default function FeaturesSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [flags, setFlags] = useState<FeatureFlagWithToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'payment', label: 'Payment' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'ai', label: 'AI' },
    { value: 'notification', label: 'Notification' },
    { value: 'security', label: 'Security' },
    { value: 'system', label: 'System' },
  ]

  useEffect(() => {
    fetchFlags()
  }, [])

  async function fetchFlags() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('label', { ascending: true })

      if (error) throw error
      setFlags(data || [])
    } catch (err: any) {
      console.error('Error fetching flags:', err)
      toast('Failed to load feature flags', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleFlag(key: string, currentState: boolean) {
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
    } catch (err: any) {
      console.error('Error toggling flag:', err)
      toast(err.message || 'Failed to toggle feature', 'error')
    } finally {
      setSaving(null)
    }
  }

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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Feature Flags</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-gray-600 mt-1">
            Toggle features ON/OFF without code deployment. Safe for production.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Settings
        </Link>
      </div>

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
              {category} Features ({categoryFlags.length})
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
                            {flag.config_completed ? 'Configured' : 'Needs Config'}
                          </span>
                        )}
                        {flag.enabled && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{flag.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Key: <code className="bg-gray-100 px-1 rounded">{flag.key}</code></span>
                        <span>Category: {flag.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleFlag(flag.key, flag.enabled)}
                        disabled={saving === flag.key || (flag.requires_config && !flag.config_completed && !flag.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          flag.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        } ${saving === flag.key ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            flag.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {saving === flag.key && (
                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Warning if trying to enable without config */}
                  {flag.requires_config && !flag.config_completed && !flag.enabled && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        ⚠️ This feature requires configuration before it can be enabled.
                        {' '}
                        <Link href={`/admin/settings/${flag.category}`} className="underline font-medium">
                          Configure now
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
        <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Features default to OFF for safety</li>
          <li>• Toggle ON when ready for production</li>
          <li>• Features with "Needs Config" require setup first</li>
          <li>• Changes take effect immediately (no deployment needed)</li>
        </ul>
      </div>
    </div>
  )
}
