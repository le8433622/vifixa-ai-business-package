'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  workerId: string
  onComplete?: () => void
}

type UploadField = 'id_front' | 'id_back' | 'selfie'

export default function KYCUpload({ workerId, onComplete }: Props) {
  const [files, setFiles] = useState<Record<UploadField, File | null>>({ id_front: null, id_back: null, selfie: null })
  const [previews, setPreviews] = useState<Record<UploadField, string>>({ id_front: '', id_back: '', selfie: '' })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeField, setActiveField] = useState<UploadField>('id_front')

  const handleFileSelect = (field: UploadField, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh (JPEG, PNG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File quá lớn (tối đa 10MB)')
      return
    }
    setError('')
    setFiles(prev => ({ ...prev, [field]: file }))
    const reader = new FileReader()
    reader.onload = (e) => setPreviews(prev => ({ ...prev, [field]: e.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const removeFile = (field: UploadField) => {
    setFiles(prev => ({ ...prev, [field]: null }))
    setPreviews(prev => ({ ...prev, [field]: '' }))
  }

  async function submit() {
    if (!files.id_front) {
      setError('Vui lòng upload mặt trước CMND/CCCD')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('worker_id', workerId)
      if (files.id_front) formData.append('id_front', files.id_front)
      if (files.id_back) formData.append('id_back', files.id_back)
      if (files.selfie) formData.append('selfie', files.selfie)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/worker/kyc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      onComplete?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const fields: { key: UploadField; label: string; hint: string }[] = [
    { key: 'id_front', label: 'Mặt trước CMND/CCCD', hint: 'Chụp rõ mặt, đủ thông tin' },
    { key: 'id_back', label: 'Mặt sau CMND/CCCD', hint: 'Chụp rõ mã vạch, ngày cấp' },
    { key: 'selfie', label: 'Ảnh chân dung kèm CMND', hint: 'Chụp mặt + CMND trên tay' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Xác thực danh tính</h3>
        <p className="text-sm text-gray-500 mt-1">Upload giấy tờ tùy thân để admin xét duyệt</p>
      </div>

      {/* Field tabs */}
      <div className="flex gap-2">
        {fields.map(f => (
          <button key={f.key} onClick={() => setActiveField(f.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${activeField === f.key ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            {f.label}
            {files[f.key] && <span className="ml-1 text-emerald-500">✓</span>}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        {previews[activeField] ? (
          <div className="relative inline-block">
            <img src={previews[activeField]} alt={fields.find(f => f.key === activeField)?.label} className="max-h-48 rounded-lg object-contain mx-auto" />
            <button onClick={() => removeFile(activeField)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600">✕</button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium text-gray-700">{fields.find(f => f.key === activeField)?.hint}</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG tối đa 10MB</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
              Chọn ảnh
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(activeField, f); e.target.value = '' }} />
      </div>

      {/* Upload progress */}
      <div className="flex items-center gap-2 text-sm">
        {['id_front', 'id_back', 'selfie'].map(k => (
          <div key={k} className={`flex items-center gap-1 ${files[k as UploadField] ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${files[k as UploadField] ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              {files[k as UploadField] ? '✓' : (['id_front', 'id_back', 'selfie'].indexOf(k) + 1)}
            </span>
            <span className="text-xs">{k === 'id_front' ? 'Mặt trước' : k === 'id_back' ? 'Mặt sau' : 'Selfie'}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button onClick={submit} disabled={uploading || !files.id_front}
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
        {uploading ? 'Đang tải lên...' : 'Gửi xác thực'}
      </button>
    </div>
  )
}
