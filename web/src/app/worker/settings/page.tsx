// Worker Settings Page - Smart toggles for workers
// Per user request: Workers need on/off toggles to work proactively

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function WorkerSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const { isEnabled } = useFeatureFlags()

  const [workMode, setWorkMode] = useState<'active' | 'selective' | 'standby' | 'offline'>('active')
  const [minPay, setMinPay] = useState<number>(200000)
  const [maxDistance, setMaxDistance] = useState<number>(10)
  const [aiLevel, setAiLevel] = useState<'auto' | 'asist' | 'manual' | 'learning'>('asist')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState(false)

  useEffect(() => {
    fetchSettings()
    loadPrefs()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Fetch from user-references Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const prefs = data.preferences || {}
        
        if (prefs.work_mode) setWorkMode(prefs.work_mode)
        if (prefs.min_pay) setMinPay(prefs.min_pay)
        if (prefs.max_distance) setMaxDistance(prefs.max_distance)
        if (prefs.ai_level) setAiLevel(prefs.ai_level)
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err)
      toast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange() {
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

      // Save to user-references Edge Function
      const savePromises = [
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: 'work_mode', value: workMode }),
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: 'min_pay', value: minPay }),
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: 'max_distance', value: maxDistance }),
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: 'ai_level', value: aiLevel }),
          }
        ),
      ]

      const results = await Promise.all(savePromises)
      const allOk = results.every(r => r.ok)
      
      if (!allOk) throw new Error('Failed to save some settings')
      
      setModified(false)
      toast('Settings saved successfully', 'success')
     } catch (err: any) {
      console.error('Error saving:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Load worker preferences from user_preferences function
  const loadPrefs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get worker preferences from user_preferences function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences?key=work_mode`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )
      const modeData = response.ok ? await response.json() : null
      if (modeData?.value) setWorkMode(modeData.value)

      const minPayResp = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences?key=min_pay`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )
      const minPayData = minPayResp.ok ? await minPayResp.json() : null
      if (minPayData?.value) setMinPay(minPayData.value)

      const distanceResp = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences?key=max_distance`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )
      const distanceData = distanceResp.ok ? await distanceResp.json() : null
      if (distanceData?.value) setMaxDistance(distanceData.value)

      const aiLevelResp = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences?key=ai_level`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )
      const aiLevelData = aiLevelResp.ok ? await aiLevelResp.json() : null
      if (aiLevelData?.value) setAiLevel(aiLevelData.value)

    } catch (err: any) {
      console.error('Error fetching settings:', err)
      toast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange() {
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

      // Save to user_preferences function
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'work_mode',
            value: workMode,
          }),
        }
      )

      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'min_pay',
            value: minPay,
          }),
        }
      )

      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'max_distance',
            value: maxDistance,
          }),
        }
      )

      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'ai_level',
            value: aiLevel,
          }),
        }
      )

      setModified(false)
      toast('Settings saved successfully', 'success')
    } catch (err: any) {
      console.error('Error saving:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Worker Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const workModes = [
    { value: 'active' as const, label: 'Active', icon: '🟢', desc: 'Nhận tất cả job phù hợp', boost: '+23% earnings' },
    { value: 'selective' as const, label: 'Selective', icon: '🟡', desc: 'Chỉ job đúng tiêu chí', boost: '' },
    { value: 'standby' as const, label: 'Standby', icon: '🔵', desc: 'Sẵn sàng nhưng không chủ động', boost: '' },
    { value: 'offline' as const, label: 'Offline', icon: '⚫', desc: 'Không nhận job', boost: '' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/worker" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Worker Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Smart Work Settings</h1>
          <p className="text-gray-600 mt-1">Toggle preferences to optimize your work</p>
        </div>
      </div>

      {/* Work Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Work Mode</h2>
        <p className="text-sm text-gray-600 mb-4">Chọn chế độ làm việc phù hợp với bạn</p>

        <div className="grid grid-cols-4 gap-3">
          {workModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => { setWorkMode(mode.value); handleChange() }}
              className={`p-4 rounded-lg border-2 transition-all ${
                workMode === mode.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{mode.icon}</div>
              <div className="font-semibold">{mode.label}</div>
              <div className="text-xs text-gray-600 mt-1">{mode.desc}</div>
              {mode.boost && workMode === mode.value && (
                <div className="text-xs text-green-600 mt-2 font-medium">{mode.boost}</div>
              )}
            </button>
          ))}
        </div>

        {/* Smart Suggestion */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-semibold text-blue-900">Gợi ý thông minh</h4>
              <p className="text-sm text-blue-700 mt-1">
                Thứ 3 từ 9-11h, bật Active → +30% thu nhập (dựa trên lịch sử của bạn)
              </p>
              <button className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Job Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Job Filters</h2>
        <p className="text-sm text-gray-600 mb-4">Thiết lập tiêu chí nhận job</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mức lương tối thiểu (VND)
            </label>
            <input
              type="number"
              value={minPay}
              onChange={(e) => { setMinPay(parseInt(e.target.value) || 0); handleChange() }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="200000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bán kính tối đa (km)
            </label>
            <input
              type="number"
              value={maxDistance}
              onChange={(e) => { setMaxDistance(parseInt(e.target.value) || 0); handleChange() }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10"
            />
          </div>
        </div>
      </div>

      {/* AI Assistance Level */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">AI Assistance</h2>
        <p className="text-sm text-gray-600 mb-4">Mức độ hỗ trợ từ AI</p>

        <div className="space-y-3">
          {[
            { value: 'auto', label: 'Tự động', desc: 'AI làm tất cả', stat: '' },
            { value: 'asist', label: 'Hỗ trợ', desc: 'AI đề xuất, thợ duyệt', stat: 'Tỷ lệ tranh chấp -15%' },
            { value: 'manual', label: 'Thủ công', desc: 'Thợ tự làm', stat: '' },
            { value: 'learning', label: 'Học hỏi', desc: 'AI quan sát và học', stat: '' },
          ].map((level) => (
            <label
              key={level.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                aiLevel === level.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="ai_level"
                checked={aiLevel === level.value}
                onChange={() => { setAiLevel(level.value as any); handleChange() }}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">{level.label}</div>
                <div className="text-sm text-gray-600">{level.desc}</div>
              </div>
              {level.stat && aiLevel === level.value && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{level.stat}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {modified && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700">You have unsaved changes</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setModified(false); fetchSettings() }}
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
