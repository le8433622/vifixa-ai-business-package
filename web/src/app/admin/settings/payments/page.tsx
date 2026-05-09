// Payments Settings Page - Gateway list
// Per Step 3: Payment Gateway Settings.

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { GatewayConfig } from '@/types/paymentGateway'

export default function PaymentsSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [gateways, setGateways] = useState<GatewayConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetchGateways()
  }, [])

  async function fetchGateways() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gateway_configs')
        .select('*')
        .order('priority', { ascending: true })

      if (error) throw error
      setGateways(data || [])
    } catch (err: any) {
      console.error('Error fetching gateways:', err)
      toast('Failed to load gateways', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleGateway(key: string, currentState: boolean) {
    try {
      setToggling(key)
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
          body: JSON.stringify({ key: 'payment_gateway', enabled: !currentState }),
        }
      )

      if (!response.ok) throw new Error('Failed to toggle')
      toast(`Gateway ${!currentState ? 'enabled' : 'disabled'}`, 'success')
      fetchGateways()
    } catch (err: any) {
      console.error('Error toggling gateway:', err)
      toast('Failed to toggle gateway', 'error')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payments Settings</h1>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
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
          <h1 className="text-3xl font-bold">Payments Settings</h1>
          <p className="text-gray-600 mt-1">Configure payment gateways and methods</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {gateways.map((gateway) => (
          <div key={gateway.key} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{gateway.display_name}</h3>
                  {gateway.active && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                  {gateway.sandbox && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Sandbox
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{gateway.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Priority: {gateway.priority}</span>
                  <span>Currencies: {gateway.supported_currencies.join(', ')}</span>
                  <span>Methods: {gateway.supported_methods.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/admin/settings/payments/${gateway.key}`)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Configure
                </button>

                <button
                  onClick={() => toggleGateway(gateway.key, gateway.active)}
                  disabled={toggling === gateway.key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    gateway.active ? 'bg-blue-600' : 'bg-gray-300'
                  } ${toggling === gateway.key ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gateway.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {toggling === gateway.key && (
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to configure</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enable sandbox mode first for testing</li>
          <li>• Click "Configure" to enter API keys</li>
          <li>• Toggle switch to activate gateway for customers</li>
          <li>• Test with sandbox before going live</li>
        </ul>
      </div>
    </div>
  )
}
