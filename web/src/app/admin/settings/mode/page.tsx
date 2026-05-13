'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const MODULES = [
  { key: 'ai_diagnosis', label: 'AI Chẩn đoán', desc: 'Tự động chẩn đoán lỗi từ mô tả/hình ảnh', auto: true },
  { key: 'worker_matching', label: 'Ghép thợ', desc: 'Tự động tìm thợ phù hợp dựa trên kỹ năng, vị trí', auto: true },
  { key: 'pricing', label: 'Định giá', desc: 'Tự động tính giá dựa trên AI + dynamic pricing', auto: true },
  { key: 'job_assignment', label: 'Gán việc', desc: 'Tự động gán việc cho thợ được match', auto: true },
  { key: 'quality_check', label: 'Kiểm tra chất lượng', desc: 'Tự động đánh giá chất lượng sau khi hoàn thành', auto: true },
  { key: 'payment_release', label: 'Giải ngân', desc: 'Tự động giải ngân thanh toán cho thợ', auto: false },
]

export default function SystemMode() {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState(false)

  const fetchMode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'system_mode')
        .single()
      if (error) throw error
      if (data?.value === 'auto' || data?.value === 'manual') {
        setMode(data.value)
      }
    } catch (err) {
      console.error('Error fetching system mode:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { fetchMode() })
  }, [fetchMode])

  const handleToggle = async () => {
    const newMode = mode === 'auto' ? 'manual' : 'auto'
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { error } = await supabase
        .from('app_settings')
        .update({ value: newMode, updated_at: new Date().toISOString() })
        .eq('key', 'system_mode')

      if (error) throw error
      setMode(newMode)
      setModified(true)
      toast(`Đã chuyển sang chế độ ${newMode === 'auto' ? 'Tự động' : 'Thủ công'}`, 'success')
    } catch (err) {
      console.error('Error saving system mode:', err)
      toast('Không thể lưu chế độ', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-96 mb-8" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Mode</h1>
          <p className="text-gray-600 mt-1">Chuyển đổi giữa chế độ tự động và thủ công siêu chi tiết</p>
        </div>
        <button
          onClick={() => router.push('/admin/settings')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Settings
        </button>
      </div>

      {/* Mode Toggle Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chế độ vận hành</h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'auto'
                ? 'Hệ thống tự động xử lý toàn bộ quy trình từ chẩn đoán đến giải ngân'
                : 'Admin kiểm soát và phê duyệt từng bước trong quy trình'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative p-6 rounded-xl border-2 transition-all ${
              mode === 'auto'
                ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                mode === 'auto' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                🤖
              </div>
              <div>
                <p className="font-bold text-gray-900">Tự động</p>
                <p className="text-xs text-gray-500">Auto Mode</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {MODULES.filter(m => m.auto).map(m => (
                <li key={m.key} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-emerald-500">✓</span> {m.desc}
                </li>
              ))}
            </ul>
          </button>

          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative p-6 rounded-xl border-2 transition-all ${
              mode === 'manual'
                ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                🔧
              </div>
              <div>
                <p className="font-bold text-gray-900">Thủ công</p>
                <p className="text-xs text-gray-500">Manual Mode</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {MODULES.map(m => (
                <li key={m.key} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={m.auto ? 'text-amber-500' : 'text-blue-500'}>◉</span>
                  <span>{m.desc}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    m.auto ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {m.auto ? 'Tự động' : 'Thủ công'}
                  </span>
                </li>
              ))}
            </ul>
          </button>
        </div>

        <button
          onClick={handleToggle}
          disabled={saving}
          className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-all ${
            saving
              ? 'bg-gray-400'
              : mode === 'auto'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {saving
            ? 'Đang chuyển đổi...'
            : mode === 'auto'
              ? 'Chuyển sang chế độ Thủ công'
              : 'Chuyển sang chế độ Tự động'
          }
        </button>
      </div>

      {/* Manual Mode Detailed Configuration */}
      {mode === 'manual' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cấu hình chi tiết từng bước</h2>
          <p className="text-sm text-gray-500 mb-6">
            Bật/tắt từng bước để admin phê duyệt thủ công
          </p>

          <div className="space-y-4">
            {MODULES.map(m => (
              <div key={m.key} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{m.label}</h3>
                  <p className="text-sm text-gray-500">{m.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    m.auto ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {m.auto ? 'Tự động' : 'Thủ công'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      defaultChecked={!m.auto}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Lưu ý:</strong> Ở chế độ thủ công, admin cần phê duyệt từng bước trước khi hệ thống tiến hành. Điều này giúp kiểm soát chất lượng nhưng có thể làm chậm quy trình xử lý.
            </p>
          </div>
        </div>
      )}

      {modified && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <span>✅</span>
            Đã chuyển sang chế độ <strong>{mode === 'auto' ? 'Tự động' : 'Thủ công'}</strong>. Thay đổi có hiệu lực ngay lập tức.
          </p>
        </div>
      )}
    </div>
  )
}
