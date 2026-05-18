'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'

interface PortfolioItem {
  id: string
  media_type: string
  title: string
  description: string | null
  media_url: string
  thumbnail_url: string | null
  tags: string[]
  is_public: boolean
  created_at: string
}

interface Props {
  workerId: string
}

const MEDIA_TYPES = [
  { value: 'before_after', label: 'Trước/Sau khi sửa', icon: '📸' },
  { value: 'certificate', label: 'Chứng chỉ', icon: '📜' },
  { value: 'worksample', label: 'Mẫu công việc', icon: '🔧' },
  { value: 'other', label: 'Khác', icon: '📁' },
]

export default function PortfolioManager({ workerId }: Props) {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [mediaType, setMediaType] = useState('worksample')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workerId])

  async function load() {
    const { data } = await supabase.from('worker_portfolio').select('*').eq('worker_id', workerId).order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!title || !file) return
    setSaving(true)
    const formData = new FormData()
    formData.append('worker_id', workerId)
    formData.append('title', title)
    formData.append('media_type', mediaType)
    formData.append('description', description)
    formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)))
    formData.append('file', file)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/worker/portfolio', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: formData,
    })
    const result = await res.json()
    if (result.success) {
      setShowForm(false)
      setTitle('')
      setDescription('')
      setTags('')
      setFile(null)
      setPreview('')
      load()
    }
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Xóa mục này?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/worker/portfolio?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    load()
  }

  if (loading) return <Skeleton variant="rect" height="80px" className="rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">📂 Portfolio</h3>
          <p className="text-xs text-gray-500">{items.length} mục</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
          + Thêm ảnh
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề *" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <select value={mediaType} onChange={e => setMediaType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
            {MEDIA_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.icon} {mt.label}</option>)}
          </select>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả" className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (phân cách bằng dấu phẩy)" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-32 rounded" />
                <button onClick={() => { setFile(null); setPreview('') }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <span className="text-2xl">📷</span>
                <p className="text-xs text-gray-500 mt-1">Chọn ảnh *</p>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setFile(f); const reader = new FileReader(); reader.onload = (ev) => setPreview(ev.target?.result as string); reader.readAsDataURL(f) }
                }} />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Hủy</button>
            <button onClick={handleSubmit} disabled={saving || !title || !file}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">Chưa có ảnh portfolio. Thêm ảnh để tăng uy tín!</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map(item => {
          const typeInfo = MEDIA_TYPES.find(mt => mt.value === item.media_type)
          return (
            <div key={item.id} className="group relative bg-white rounded-xl border overflow-hidden">
              <img src={item.media_url} alt={item.title} className="w-full h-28 object-cover" />
              <div className="p-2">
                <div className="flex items-center gap-1">
                  <span>{typeInfo?.icon || '📁'}</span>
                  <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
                </div>
                {item.description && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{item.description}</p>}
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.tags.slice(0, 3).map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{t}</span>)}
                  </div>
                )}
              </div>
              <button onClick={() => deleteItem(item.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-red-600">
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
