'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, EmptyState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

export default function AutoPilotPage() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [form, setForm] = useState({ category: 'plumbing', description: '', user_id: '' })

  useEffect(() => { queueMicrotask(() => fetchStatus()) }, [])

  async function fetchStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'ai_autopilot_enabled').maybeSingle()
      setEnabled(data?.value === 'true')
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function toggleAutopilot() {
    setSaving(true)
    try {
      const { data: existing } = await supabase.from('app_settings').select('id').eq('key', 'ai_autopilot_enabled').maybeSingle()
      if (existing) {
        await supabase.from('app_settings').update({ value: enabled ? 'false' : 'true', updated_at: new Date().toISOString() }).eq('key', 'ai_autopilot_enabled')
      } else {
        await supabase.from('app_settings').insert({ key: 'ai_autopilot_enabled', value: 'true', type: 'toggle', category: 'ai' })
      }
      setEnabled(!enabled)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function runAutopilot() {
    if (!form.description || !form.user_id) return
    setRunning(true); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/ai-autopilot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: form.category, description: form.description, user_id: form.user_id, action: 'dry-run' }),
      })
      setResult(await res.json())
    } catch { /* ignore */ }
    finally { setRunning(false) }
  }

  const stepLabels: Record<string, string> = {
    diagnose: '🔍 Chẩn đoán', price: '💰 Định giá', match: '🤝 Ghép thợ',
    create_order: '📋 Tạo đơn', upsell: '💎 Upsell',
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="AI Auto-Pilot" description="Một nút bấm — AI tự động vận hành toàn bộ order flow"
        actions={
          <button onClick={toggleAutopilot} disabled={saving}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              enabled ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            } disabled:opacity-50`}>
            {saving ? '⏳' : enabled ? '🟢 Auto-Pilot ON' : '🔴 Auto-Pilot OFF'}
          </button>
        }
      />

      {loading ? <LoadingState /> : (
        <>
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold mb-2">⚡ Auto-Pilot Flow</h2>
            <p className="text-sm text-gray-500 mb-4">AI sẽ tự động thực hiện các bước sau:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {['Diagnose', 'Price', 'Match Worker', 'Create Order', 'Notify', 'Upsell', 'Quality Check', 'Retention'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}. {step}
                  </span>
                  {i < 7 && <span className="text-gray-300">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold mb-4">🧪 Test Auto-Pilot</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {['plumbing', 'electricity', 'air_conditioning', 'appliance', 'camera', 'painting'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mô tả sự cố</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm h-24" placeholder="VD: Máy lạnh không mát, chảy nước..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <input value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="UUID của khách hàng" />
                </div>
                <button onClick={runAutopilot} disabled={running || !form.description || !form.user_id}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-violet-700 disabled:opacity-50 transition-all">
                  {running ? '⏳ Đang chạy...' : '🚀 Run Auto-Pilot (Dry Run)'}
                </button>
              </div>
            </div>

            {result && (
              <div className="bg-white rounded-xl shadow-sm border p-6 overflow-y-auto max-h-[500px]">
                <h2 className="text-lg font-bold mb-4">📋 Kết quả</h2>
                <div className="space-y-2">
                  {Object.entries(result).filter(([k]) => !['request_id', 'started_at', 'completed_at', 'autopilot_mode'].includes(k)).map(([step, data]: [string, any]) => (
                    <div key={step} className={`p-3 rounded-lg ${step === 'errors' ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${step === 'errors' ? 'bg-red-500' : data?.error ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="font-medium text-sm">{stepLabels[step] || step}</span>
                      </div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-hidden max-h-24">
                        {JSON.stringify(data, null, 2).slice(0, 300)}
                      </pre>
                    </div>
                  ))}
                </div>
                {result.errors && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-700">⚠️ {result.errors.length} errors</p>
                    <ul className="text-xs text-red-600 mt-1">
                      {(result.errors as string[]).map((e: string, i: number) => <li key={i}>• {e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}