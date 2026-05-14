'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingState, EmptyState, ErrorAlert, InfoBadge } from '@/components/admin/AIUI'

export default function TrangQuanLyPrompt() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [boLoc, setBoLoc] = useState('tat_ca')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [suaPrompt, setSuaPrompt] = useState<any>(null)
  const [noiDungSua, setNoiDungSua] = useState('')

  useEffect(() => { queueMicrotask(() => layDuLieu()) }, [])

  async function layDuLieu() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data } = await supabase.from('ai_prompts').select('*').order('agent_type').order('version', { ascending: false })
      setData(data || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const dsAgent = [...new Set(data.map(p => p.agent_type))] as string[]
  const daLoc = boLoc === 'tat_ca' ? data : data.filter(p => p.agent_type === boLoc)

  async function kichHoat(prompt: any) {
    setDangLuu(true)
    try {
      await supabase.from('ai_prompts').update({ is_active: false }).eq('agent_type', prompt.agent_type)
      await supabase.from('ai_prompts').update({ is_active: true }).eq('id', prompt.id)
      await layDuLieu()
    } finally { setDangLuu(false) }
  }

  async function luuSua() {
    if (!suaPrompt) return
    setDangLuu(true)
    try {
      await supabase.from('ai_prompts').update({ system_prompt: noiDungSua, changelog: `Cập nhật ${new Date().toISOString()}` }).eq('id', suaPrompt.id)
      setSuaPrompt(null)
      await layDuLieu()
    } finally { setDangLuu(false) }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="Quản lý Prompt" description="Xem và chỉnh sửa prompt cho từng AI agent"
        actions={
          <select value={boLoc} onChange={e => setBoLoc(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white text-sm">
            <option value="tat_ca">Tất cả Agent</option>
            {dsAgent.map(at => <option key={at} value={at}>{at}</option>)}
          </select>
        }
      />

      {error && <ErrorAlert message={error} onRetry={layDuLieu} />}

      {loading ? <LoadingState text="Đang tải prompt..." /> : daLoc.length === 0 ? (
        <EmptyState icon="📝" title="Chưa có prompt nào" description="Chạy migration để tạo dữ liệu mẫu." />
      ) : (
        <div className="space-y-4">
          {daLoc.map(prompt => (
            <div key={prompt.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold capitalize">{prompt.agent_type}</h3>
                  <p className="text-xs text-gray-500">
                    v{prompt.version} · {prompt.model} · nhiệt {prompt.temperature} · tối đa {prompt.max_tokens} tokens
                    · {new Date(prompt.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {prompt.is_active ? (
                    <InfoBadge label="Đang dùng" color="green" />
                  ) : (
                    <button onClick={() => kichHoat(prompt)} disabled={dangLuu}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50">
                      Kích hoạt
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <pre className="text-xs whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{prompt.system_prompt}</pre>
              </div>
              {prompt.changelog && <p className="text-xs text-gray-400 mb-3">{prompt.changelog}</p>}
              <button onClick={() => { setSuaPrompt(prompt); setNoiDungSua(prompt.system_prompt) }} className="text-sm text-blue-600 hover:underline">✏️ Sửa</button>
            </div>
          ))}
        </div>
      )}

      {suaPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSuaPrompt(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold capitalize">Sửa prompt {suaPrompt.agent_type}</h2>
              <p className="text-sm text-gray-500">v{suaPrompt.version} · {suaPrompt.model}</p>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea value={noiDungSua} onChange={e => setNoiDungSua(e.target.value)} className="w-full h-64 p-4 border rounded-lg font-mono text-sm" />
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setSuaPrompt(null)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Hủy</button>
              <button onClick={luuSua} disabled={dangLuu}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {dangLuu ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}