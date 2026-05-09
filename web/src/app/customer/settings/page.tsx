// Customer Settings Page - Smart preferences
// Per user request: Customers also need active toggles

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function CustomerSettings() {
  const router = useRouter()
  const { toast } = useToast()

  const [aiLevel, setAiLevel] = useState<'auto' | 'confirm' | 'manual'>('confirm')
  const [minRating, setMinRating] = useState<number>(4.0)
  const [budgetMin, setBudgetMin] = useState<number>(0)
  const [budgetMax, setBudgetMax] = useState<number>(1000000)
  const [scheduling, setScheduling] = useState<'asap' | 'flexible' | 'scheduled'>('flexible')
  const [channel, setChannel] = useState<'app' | 'sms' | 'email'>('app')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState(false)

  useEffect(() => {
    fetchSettings()
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
        
        if (prefs.ai_level) setAiLevel(prefs.ai_level)
        if (prefs.min_rating) setMinRating(prefs.min_rating)
        if (prefs.budget_min) setBudgetMin(prefs.budget_min)
        if (prefs.budget_max) setBudgetMax(prefs.budget_max)
        if (prefs.scheduling) setScheduling(prefs.scheduling)
        if (prefs.channel) setChannel(prefs.channel)
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
            body: JSON.stringify({ key: 'ai_level', value: aiLevel }),
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
            body: JSON.stringify({ key: 'min_rating', value: minRating }),
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
            body: JSON.stringify({ key: 'budget_min', value: budgetMin }),
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
            body: JSON.stringify({ key: 'budget_max', value: budgetMax }),
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
            body: JSON.stringify({ key: 'scheduling', value: scheduling }),
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
            body: JSON.stringify({ key: 'channel', value: channel }),
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

  // Load customer preferences
  const loadPrefs = async () => {
    try {
      // Get saved preferences (mock: use localStorage)
      const savedAiLevel = localStorage.getItem('cust_ai_level') as any
      const savedRating = localStorage.getItem('cust_min_rating')
      const savedBudgetMin = localStorage.getItem('cust_budget_min')
      const savedBudgetMax = localStorage.getItem('cust_budget_max')
      const savedScheduling = localStorage.getItem('cust_scheduling') as any
      const savedChannel = localStorage.getItem('cust_channel') as any

      if (savedAiLevel) setAiLevel(savedAiLevel)
      if (savedRating) setMinRating(parseFloat(savedRating))
      if (savedBudgetMin) setBudgetMin(parseInt(savedBudgetMin))
      if (savedBudgetMax) setBudgetMax(parseInt(savedBudgetMax))
      if (savedScheduling) setScheduling(savedScheduling)
      if (savedChannel) setChannel(savedChannel)
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
      // Save to localStorage (mock) - real would save to user_preferences
      localStorage.setItem('cust_ai_level', aiLevel)
      localStorage.setItem('cust_min_rating', minRating.toString())
      localStorage.setItem('cust_budget_min', budgetMin.toString())
      localStorage.setItem('cust_budget_max', budgetMax.toString())
      localStorage.setItem('cust_scheduling', scheduling)
      localStorage.setItem('cust_channel', channel)

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
        <h1 className="text-3xl font-bold mb-6">Customer Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/customer" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Customer Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Smart Service Preferences</h1>
          <p className="text-gray-600 mt-1">Toggle preferences to optimize your service experience</p>
        </div>
      </div>

      {/* AI Diagnosis Level */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">AI Diagnosis</h2>
        <p className="text-sm text-gray-600 mb-4">Choose how AI assists with your service requests</p>

        <div className="space-y-3">
          {[
            { value: 'auto', label: 'Tự động', desc: 'AI tự động chẩn đoán + đặt lịch', stat: '+15% speed' },
            { value: 'confirm', label: 'Xác nhận', desc: 'AI đề xuất, bạn xác nhận', stat: 'Popular' },
            { value: 'manual', label: 'Thủ công', desc: 'Bạn tự mô tả, tự chọn thợ', stat: '' },
          ].map((level) => (
            <label
              key={level.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                aiLevel === level.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
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
              {level.stat && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {level.stat}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Worker Preferences */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Worker Preferences</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Worker Rating
            </label>
            <input
              type="number"
              value={minRating}
              onChange={(e) => { setMinRating(parseFloat(e.target.value) || 0); handleChange() }}
              min="0"
              max="5"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Chỉ nhận thợ có rating từ {minRating} sao trở lên</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Range (VND)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => { setBudgetMin(parseInt(e.target.value) || 0); handleChange() }}
                placeholder="Min"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => { setBudgetMax(parseInt(e.target.value) || 0); handleChange() }}
                placeholder="Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dự kiến: {budgetMin.toLocaleString()} - {budgetMax.toLocaleString()} VND
            </p>
          </div>
        </div>
      </div>

      {/* Scheduling Preference */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Scheduling</h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'asap', label: 'ASAP', icon: '⚡️', desc: 'Sớm nhất có thể' },
            { value: 'flexible', label: 'Linh hoạt', icon: '📅', desc: 'Tùy chọn thời gian', stat: 'Recommended' },
            { value: 'scheduled', label: 'Đặt trước', icon: '🗓', desc: 'Lên lịch trước', stat: '' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setScheduling(opt.value as any); handleChange() }}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                scheduling === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{opt.icon}</div>
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-gray-600 mt-1">{opt.desc}</div>
              {opt.stat && (
                <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mt-2 inline-block">
                  {opt.stat}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Communication Channel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Communication</h2>

        <div className="space-y-3">
          {[
            { value: 'app', label: 'Trong ứng dụng', icon: '📱' },
            { value: 'sms', label: 'SMS', icon: '💬' },
            { value: 'email', label: 'Email', icon: '📧' },
          ].map((ch) => (
            <label
              key={ch.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                channel === ch.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="channel"
                checked={channel === ch.value}
                onChange={() => { setChannel(ch.value as any); handleChange() }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-xl">{ch.icon}</span>
              <span className="font-medium">{ch.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {modified && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700">
            You have unsaved changes
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => fetchSettings()}
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

      {/* Smart Suggestion */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">💡 Smart Suggestion</h3>
        <p className="text-sm text-green-800">
          Với budget {budgetMin.toLocaleString()}-{budgetMax.toLocaleString()} VND và yêu cầu thợ {minRating}⭐ trở lên,
          bạn sẽ tiết kiệm ~20% chi phí so với đặt dịch vụ truyền thống.
        </p>
      </div>
    </div>
  )
}
