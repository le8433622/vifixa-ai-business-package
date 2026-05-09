// General Settings Page
// Per Step 2: Admin Settings UI

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

interface AppSetting {
  key: string
  value: string | null
  value_type: string
  category: string
  label: string
  description: string
  is_public: boolean
}

export default function GeneralSettings() {
  const router = useRouter()
  const { toast } = useToast()
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
        .eq('category', 'general')
        .order('label', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (err: any) {
      console.error('Error fetching settings:', err)
      toast('Failed to load settings', 'error')
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

      // Update each modified setting
      for (const [key, val] of Object.entries(modified)) {
        // @ts-ignore - Supabase type generation needs update
        const { error } = await supabase
          .from('app_settings' as any)
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('Settings saved successfully', 'success')
      fetchSettings()
    } catch (err: any) {
      console.error('Error saving settings:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  function getInputType(valueType: string) {
    switch (valueType) {
      case 'number': return 'number'
      case 'boolean': return 'checkbox'
      default: return 'text'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">General Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-16 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">General Settings</h1>
      <p className="text-gray-600 mb-6">Configure application name, description, and contact information.</p>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {settings.map((setting) => (
          <div key={setting.key} className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  {setting.label}
                </label>
                <p className="text-xs text-gray-500 mb-3">{setting.description}</p>
              </div>
              {setting.is_public && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Public
                </span>
              )}
            </div>

            {setting.value_type === 'boolean' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modified[setting.key] !== undefined
                    ? modified[setting.key] === 'true'
                    : setting.value === 'true'
                  }
                  onChange={(e) => handleChange(setting.key, e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>
            ) : (
              <input
                type={getInputType(setting.value_type)}
                value={modified[setting.key] !== undefined ? modified[setting.key] : (setting.value || '')}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${setting.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
      </div>

      {Object.keys(modified).length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            {Object.keys(modified).length} change(s) pending
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModified({})}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
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
