'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, EmptyState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

export default function PromptABTestPage() {
  const router = useRouter()
  const [tests, setTests] = useState<any[]>([])
  const [prompts, setPrompts] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTest, setNewTest] = useState({ test_name: '', agent_type: 'diagnosis', description: '', variant_a_prompt_id: '', variant_b_prompt_id: '', traffic_split: 50, min_sample_size: 100 })

  useEffect(() => { queueMicrotask(() => { fetchTests(); fetchPrompts() }) }, [])

  async function fetchTests() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data } = await supabase.from('prompt_ab_tests').select('*').order('created_at', { ascending: false })
      setTests(data || [])
      for (const test of data || []) {
        const { data: r } = await supabase.rpc('calculate_prompt_ab_significance', { p_test_id: test.id })
        if (r) setResults(prev => ({ ...prev, [test.id]: r }))
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function fetchPrompts() {
    const { data } = await supabase.from('ai_prompts').select('*').order('agent_type').order('version', { ascending: false })
    setPrompts(data || [])
  }

  const promptsByAgent = prompts.reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.agent_type]) acc[p.agent_type] = []; acc[p.agent_type].push(p); return acc
  }, {})

  async function handleCreate() {
    if (!newTest.test_name || !newTest.variant_a_prompt_id || !newTest.variant_b_prompt_id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('prompt_ab_tests').insert({ ...newTest, created_by: session?.user.id })
      setShowCreate(false)
      setNewTest({ test_name: '', agent_type: 'diagnosis', description: '', variant_a_prompt_id: '', variant_b_prompt_id: '', traffic_split: 50, min_sample_size: 100 })
      await fetchTests()
    } catch (err: any) { setError(err.message) }
  }

  async function handleEndTest(testId: string) {
    if (!confirm('Kết thúc test này?')) return
    await supabase.from('prompt_ab_tests').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', testId)
    await fetchTests()
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="Prompt A/B Tests" description="So sánh các phiên bản prompt với statistical significance"
        actions={<button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">+ New Test</button>}
      />

      {error && <ErrorAlert message={error} onRetry={fetchTests} />}

      {loading ? <LoadingState /> : tests.length === 0 ? (
        <EmptyState icon="🧪" title="Chưa có prompt A/B test nào" description="Tạo test để so sánh các phiên bản prompt khác nhau." />
      ) : (
        <div className="space-y-6">
          {tests.map(test => {
            const testResults = results[test.id] || []
            const winner = testResults.find(r => r.is_winner)
            return (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold">{test.test_name}</h3>
                      {test.is_active ? <InfoBadge label="Active" color="green" /> : <InfoBadge label="Ended" color="gray" />}
                      {winner && <InfoBadge label={`🏆 ${winner.variant}`} color="amber" />}
                    </div>
                    <p className="text-xs text-gray-500">
                      {test.agent_type} · Split {100 - test.traffic_split}/{test.traffic_split} · Min {test.min_sample_size} samples
                      · Started {new Date(test.started_at).toLocaleDateString()}
                      {test.ended_at && ` · Ended ${new Date(test.ended_at).toLocaleDateString()}`}
                    </p>
                    {test.description && <p className="text-sm text-gray-600 mt-1">{test.description}</p>}
                  </div>
                  {test.is_active && <button onClick={() => handleEndTest(test.id)} className="text-sm text-red-600 hover:underline">End</button>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {testResults.map(r => (
                    <div key={r.variant} className={`p-4 rounded-lg border ${r.is_winner ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-bold text-sm ${r.variant === 'variant_a' ? 'text-blue-600' : 'text-purple-600'}`}>
                          {r.variant === 'variant_a' ? 'A (Control)' : 'B (Experiment)'}
                        </span>
                        {r.is_winner && <span className="text-amber-600 text-sm font-bold">🏆 WINNER</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Calls:</span> <span className="font-medium">{r.total_calls}</span></div>
                        <div><span className="text-gray-500">Accuracy:</span> <InfoBadge label={`${r.accuracy_pct}%`} color={r.accuracy_pct >= 70 ? 'green' : 'red'} /></div>
                        <div><span className="text-gray-500">Cost:</span> <span className="font-mono">${Number(r.avg_cost).toFixed(6)}</span></div>
                        <div><span className="text-gray-500">Latency:</span> <span className="font-medium">{r.avg_latency_ms}ms</span></div>
                      </div>
                      {r.confidence_pct > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Confidence</span><span>{r.confidence_pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className={`h-full rounded-full ${r.confidence_pct >= 95 ? 'bg-green-500' : r.confidence_pct >= 80 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                              style={{ width: `${r.confidence_pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Prompt A/B Test</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test Name</label>
                <input value={newTest.test_name} onChange={e => setNewTest({ ...newTest, test_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: Diagnosis prompt v2 vs v3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agent</label>
                  <select value={newTest.agent_type} onChange={e => setNewTest({ ...newTest, agent_type: e.target.value, variant_a_prompt_id: '', variant_b_prompt_id: '' })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.keys(promptsByAgent).map(at => <option key={at} value={at}>{at}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Traffic Split (B%)</label>
                  <input type="number" value={newTest.traffic_split} onChange={e => setNewTest({ ...newTest, traffic_split: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={1} max={99} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variant A (Control)</label>
                <select value={newTest.variant_a_prompt_id} onChange={e => setNewTest({ ...newTest, variant_a_prompt_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select prompt...</option>
                  {(promptsByAgent[newTest.agent_type] || []).map(p => (
                    <option key={p.id} value={p.id}>v{p.version} {p.is_active ? '(active)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variant B (Experiment)</label>
                <select value={newTest.variant_b_prompt_id} onChange={e => setNewTest({ ...newTest, variant_b_prompt_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select prompt...</option>
                  {(promptsByAgent[newTest.agent_type] || []).map(p => (
                    <option key={p.id} value={p.id}>v{p.version} {p.is_active ? '(active)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newTest.description} onChange={e => setNewTest({ ...newTest, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm h-20" placeholder="What are you testing?" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-gray-700">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}