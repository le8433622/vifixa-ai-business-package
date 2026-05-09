// Gateway Config Page - Configure individual gateway
// Per Step 3: Payment Gateway Settings

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { GatewayConfig, GatewayKeys } from '@/types/paymentGateway'

export default function GatewayConfig() {
  const router = useRouter()
  const params = useParams()
  const gatewayKey = params.gateway as string
  const { toast } = useToast()

  const [config, setConfig] = useState<GatewayConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [sandboxMode, setSandboxMode] = useState(true)
  const [sandboxKeys, setSandboxKeys] = useState<GatewayKeys>({})
  const [liveKeys, setLiveKeys] = useState<GatewayKeys>({})
  const [modified, setModified] = useState(false)

  useEffect(() => {
    if (gatewayKey) fetchConfig()
  }, [gatewayKey])

  async function fetchConfig() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gateway_configs')
        .select('*')
        .eq('key', gatewayKey)
        .single()

      if (error) throw error

      setConfig(data)
      setSandboxMode(data.sandbox)
      setSandboxKeys(data.sandbox_keys || {})
      setLiveKeys(data.live_keys || {})
    } catch (err: any) {
      console.error('Error fetching gateway config:', err)
      toast('Failed to load gateway config', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyChange(mode: 'sandbox' | 'live', key: string, value: string) {
    if (mode === 'sandbox') {
      setSandboxKeys(prev => ({ ...prev, [key]: value }))
    } else {
      setLiveKeys(prev => ({ ...prev, [key]: value }))
    }
    setModified(true)
  }

  async function handleSave() {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const keys = sandboxMode ? sandboxKeys : liveKeys
      const keyEntries = Object.entries(keys)
      if (keyEntries.some(([, v]) => !v)) {
        toast('Please fill all API keys', 'error')
        return
      }

      const updateData: any = {
        sandbox: sandboxMode,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      }

      if (sandboxMode) {
        updateData.sandbox_keys = sandboxKeys
      } else {
        updateData.live_keys = liveKeys
      }

      // @ts-ignore - Supabase type generation needs update
      const { error } = await (supabase
        .from('gateway_configs')
        .update(updateData)
        .eq('key', gatewayKey) as any)

      if (error) throw error

      toast('Gateway config saved successfully', 'success')
      setModified(false)
      fetchConfig()
    } catch (err: any) {
      console.error('Error saving config:', err)
      toast('Failed to save config', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true)
      // This will be implemented in the Edge Function
      // For now, just simulate a test
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast('Connection test successful (mock)', 'success')
    } catch (err: any) {
      toast('Connection test failed', 'error')
    } finally {
      setTesting(false)
    }
  }

  async function toggleActive() {
    if (!config) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // @ts-ignore - Supabase type generation needs update
      const { error } = await (supabase
        .from('gateway_configs')
        .update({
          active: !config.active,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id,
        })
        .eq('key', gatewayKey) as any)

      if (error) throw error

      toast(`Gateway ${!config.active ? 'activated' : 'deactivated'}`, 'success')
      fetchConfig()
    } catch (err: any) {
      console.error('Error toggling gateway:', err)
      toast('Failed to toggle gateway', 'error')
    }
  }

  // Define which keys each gateway needs
  const getGatewayKeyFields = (key: string) => {
    switch (key) {
      case 'vnpay':
        return [
          { key: 'tmn_code', label: 'TMN Code' },
          { key: 'secret_key', label: 'Secret Key' },
          { key: 'return_url', label: 'Return URL' },
        ]
      case 'momo':
        return [
          { key: 'partner_code', label: 'Partner Code' },
          { key: 'access_key', label: 'Access Key' },
          { key: 'secret_key', label: 'Secret Key' },
        ]
      case 'zalopay':
        return [
          { key: 'app_id', label: 'App ID' },
          { key: 'key1', label: 'Key 1' },
          { key: 'key2', label: 'Key 2' },
        ]
      case 'stripe':
        return [
          { key: 'publishable_key', label: 'Publishable Key' },
          { key: 'secret_key', label: 'Secret Key' },
        ]
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-gray-500">Gateway not found</p>
        <Link href="/admin/settings/payments" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Payments
        </Link>
      </div>
    )
  }

  const keyFields = getGatewayKeyFields(gatewayKey)
  const currentKeys = sandboxMode ? sandboxKeys : liveKeys

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/settings/payments" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Payments
          </Link>
          <h1 className="text-3xl font-bold">{config.display_name} Configuration</h1>
          <p className="text-gray-600 mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm ${config.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {config.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Mode</h2>
            <p className="text-sm text-gray-600">Toggle between sandbox (test) and live (production) mode</p>
          </div>
          <button
            onClick={() => {
              setSandboxMode(!sandboxMode)
              setModified(true)
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              sandboxMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              sandboxMode ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className={`p-3 rounded-md ${sandboxMode ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
          {sandboxMode ? '🧪 Sandbox Mode - Use test credentials' : '🚀 Live Mode - Use production credentials'}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Keys ({sandboxMode ? 'Sandbox' : 'Live'})</h2>
          <div className="space-y-4">
            {keyFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="password"
                  value={currentKeys[field.key] || ''}
                  onChange={(e) => handleKeyChange(sandboxMode ? 'sandbox' : 'live', field.key, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Webhook URL */}
        <div className="p-6">
          <h3 className="font-semibold mb-2">Webhook URL</h3>
          <p className="text-sm text-gray-600 mb-3">Configure this URL in your gateway dashboard to receive payment notifications.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
              {`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-webhook-${gatewayKey}`}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-webhook-${gatewayKey}`)
                toast('Webhook URL copied!', 'success')
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex items-center justify-between">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Testing...' : '🧪 Test Connection'}
          </button>

          <div className="flex items-center gap-3">
            {modified && (
              <span className="text-sm text-yellow-600">Unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !modified}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 bg-white rounded-lg shadow border border-red-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{config.active ? 'Deactivate' : 'Activate'} Gateway</h3>
              <p className="text-sm text-gray-600">
                {config.active
                  ? 'Deactivate this gateway to remove it from checkout options.'
                  : 'Activate this gateway to enable it for customers.'}
              </p>
            </div>
            <button
              onClick={toggleActive}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                config.active
                  ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 border border-green-300 hover:bg-green-100'
              }`}
            >
              {config.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
