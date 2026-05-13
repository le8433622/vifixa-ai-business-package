'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function ComposeNews() {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<'manual' | 'ai_assist' | 'ai_auto'>('ai_assist')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('promotion')
  const [priority, setPriority] = useState('normal')
  const [targetRole, setTargetRole] = useState('all')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function generateWithAI() {
    if (!prompt.trim()) {
      toast('Vui lòng nhập ý tưởng hoặc chọn thể loại', 'error')
      return
    }
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/ai/ai-news-writer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: mode === 'ai_auto' ? 'auto_generate' : 'manual_assist',
          category,
          prompt: mode === 'ai_assist' ? prompt : undefined,
          target_role: targetRole,
          tone: 'professional',
        }),
      })

      if (!response.ok) throw new Error('AI generation failed')
      const data = await response.json()

      setTitle(data.title || '')
      setSummary(data.summary || '')
      setBody(data.body || '')
      toast('✨ AI đã tạo nội dung! Bạn có thể chỉnh sửa thêm.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function saveBroadcast(status: 'draft' | 'published') {
    if (!title.trim() || !body.trim()) {
      toast('Vui lòng nhập tiêu đề và nội dung', 'error')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('broadcasts')
        .insert({
          title,
          summary,
          body,
          category,
          priority,
          target_role: targetRole,
          status,
          is_ai_generated: mode !== 'manual',
          ai_prompt: mode === 'ai_assist' ? prompt : null,
          created_by: session.user.id,
          published_at: status === 'published' ? new Date().toISOString() : null,
        })

      if (error) throw error
      toast(status === 'published' ? '📢 Đã xuất bản bản tin!' : '📝 Đã lưu nháp', 'success')
      router.push('/admin/news')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lưu thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/news" className="text-blue-600 hover:underline text-sm">← Quay lại</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">📝 Soạn bản tin</h1>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2">
          {[
            { value: 'ai_assist', label: '✨ AI hỗ trợ', desc: 'Nhập ý tưởng → AI viết' },
            { value: 'ai_auto', label: '🤖 AI tự động', desc: 'Chọn thể loại → AI tự sinh' },
            { value: 'manual', label: '✍️ Tự soạn', desc: 'Tự viết toàn bộ' },
          ].map(m => (
            <button key={m.value} onClick={() => setMode(m.value as typeof mode)}
              className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                mode === m.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 text-gray-600'
              }`}>
              <p className="font-medium">{m.label}</p>
              <p className="text-xs mt-1">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* AI Input */}
      {(mode === 'ai_assist' || mode === 'ai_auto') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {mode === 'ai_assist' ? '💡 Nhập ý tưởng' : '⚙️ Cấu hình AI tự động'}
          </h2>
          {mode === 'ai_assist' ? (
            <div className="space-y-3">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="VD: Viết bài khuyến mại dịch vụ điện lạnh giảm 20% cho khách hàng ở HCM và HN, áp dụng tháng 6..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="promotion">🎉 Khuyến mại</option>
                  <option value="news">📢 Tin tức</option>
                  <option value="technology">🚀 Công nghệ</option>
                  <option value="maintenance_tip">🔧 Mẹo bảo trì</option>
                  <option value="worker_tip">🛠️ Mẹo cho thợ</option>
                </select>
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">Tất cả</option>
                  <option value="customers">Khách hàng</option>
                  <option value="workers">Thợ</option>
                </select>
                <button onClick={generateWithAI} disabled={generating}
                  className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {generating ? '⏳ Đang tạo...' : '✨ Tạo nội dung'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Thể loại</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="promotion">🎉 Khuyến mại - Flash sale</option>
                  <option value="news">📢 Tin tức - Cập nhật</option>
                  <option value="technology">🚀 Công nghệ mới</option>
                  <option value="maintenance_tip">🔧 Mẹo bảo trì mùa</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng</label>
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">📢 Tất cả</option>
                  <option value="customers">👤 Khách hàng</option>
                  <option value="workers">🛠️ Thợ</option>
                </select>
              </div>
              <button onClick={generateWithAI} disabled={generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {generating ? '⏳' : '⚡ Tạo'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">✍️ Nội dung</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề bản tin..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-lg font-bold focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tóm tắt (hiển thị trong push notification)</label>
          <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
            placeholder="Tóm tắt ngắn gọn..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="## Nội dung bài viết&#10;&#10;Viết nội dung tại đây...&#10;&#10;Hỗ trợ Markdown: **bold**, *italic*, ### Heading"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm min-h-[300px] focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div className="flex gap-3">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="low">🟢 Thấp</option>
            <option value="normal">🔵 Bình thường</option>
            <option value="high">🟡 Cao</option>
            <option value="urgent">🔴 Khẩn</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between bg-white rounded-xl border border-gray-200 p-4">
        <button onClick={() => saveBroadcast('draft')} disabled={saving}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium">
          📝 Lưu nháp
        </button>
        <button onClick={() => saveBroadcast('published')} disabled={saving}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
          {saving ? '⏳ Đang lưu...' : '📨 Xuất bản'}
        </button>
      </div>
    </div>
  )
}
