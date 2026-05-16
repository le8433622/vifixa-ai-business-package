'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface KYCWorker {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  verification_status: string
  is_verified: boolean
  id_front_url: string | null
  id_back_url: string | null
  selfie_url: string | null
  trust_score: number | null
  kyc_submitted_at: string | null
  kyc_reviewed_at: string | null
  kyc_notes: string | null
  profiles: { email: string; created_at: string } | { email: string; created_at: string }[]
  documents: any[]
}

export default function AdminKYC() {
  const [workers, setWorkers] = useState<KYCWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 })
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [aiVerifying, setAiVerifying] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<Record<string, any>>({})

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin/kyc?status=${tab}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const result = await res.json()
      if (result.success) {
        setWorkers(result.data || [])
        setStats(result.stats)
      }
    } catch (e) {
      console.error('Load KYC error:', e)
    }
    setLoading(false)
  }

  async function handleReview(workerId: string, status: 'verified' | 'rejected') {
    setActioning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ worker_id: workerId, status, admin_notes: adminNotes, reviewed_by: session?.user.id }),
      })
      const result = await res.json()
      if (result.success) {
        setReviewing(null)
        setAdminNotes('')
        load()
      }
    } catch (e) {
      console.error('Review error:', e)
    }
    setActioning(false)
  }

  const tabs = [
    { key: 'pending', label: 'Chờ duyệt', count: stats.pending, color: 'text-amber-400' },
    { key: 'verified', label: 'Đã duyệt', count: stats.verified, color: 'text-emerald-400' },
    { key: 'rejected', label: 'Từ chối', count: stats.rejected, color: 'text-red-400' },
  ]

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedDoc(null)}>
          <img src={selectedDoc} alt="Document" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
          <button onClick={() => setSelectedDoc(null)} className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">🪪 KYC — Xác thực danh tính</h1>
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {workers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-3">{tab === 'pending' ? '✅' : '📋'}</div>
          <p>{tab === 'pending' ? 'Không có yêu cầu KYC nào đang chờ' : `Không có thợ nào ở trạng thái ${tab}`}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workers.map(worker => {
            const profileEmail = Array.isArray(worker.profiles) ? worker.profiles[0]?.email : worker.profiles?.email
            return (
              <div key={worker.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
                {/* Worker Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                      {worker.full_name?.[0] || worker.id[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200">{worker.full_name || 'Chưa có tên'}</p>
                      <p className="text-xs text-gray-500">{profileEmail || worker.id.slice(0, 12)}</p>
                      {worker.phone && <p className="text-xs text-gray-500">{worker.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {worker.trust_score != null && (
                      <span className={`text-sm font-bold ${worker.trust_score >= 80 ? 'text-emerald-400' : worker.trust_score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        🛡️ {worker.trust_score}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      worker.verification_status === 'verified' ? 'bg-emerald-900/50 text-emerald-300'
                      : worker.verification_status === 'rejected' ? 'bg-red-900/50 text-red-300'
                      : 'bg-amber-900/50 text-amber-300'
                    }`}>{worker.verification_status}</span>
                  </div>
                </div>

                {/* Document Preview */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {worker.id_front_url && (
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-gray-500 mb-1">Mặt trước CMND/CCCD</p>
                      <img src={worker.id_front_url} alt="ID Front" className="w-32 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedDoc(worker.id_front_url!)} />
                    </div>
                  )}
                  {worker.id_back_url && (
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-gray-500 mb-1">Mặt sau</p>
                      <img src={worker.id_back_url} alt="ID Back" className="w-32 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedDoc(worker.id_back_url!)} />
                    </div>
                  )}
                  {worker.selfie_url && (
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-gray-500 mb-1">Chân dung + CMND</p>
                      <img src={worker.selfie_url} alt="Selfie" className="w-32 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedDoc(worker.selfie_url!)} />
                    </div>
                  )}
                </div>

                {/* Submissions stats */}
                {worker.documents?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {worker.documents.length} tài liệu đã tải lên
                    {worker.kyc_submitted_at && ` · ${new Date(worker.kyc_submitted_at).toLocaleString('vi-VN')}`}
                  </div>
                )}

                {/* AI Verify Result */}
                {aiResults[worker.id] && (
                  <div className={`rounded-lg p-3 text-xs ${aiResults[worker.id].auto_approved ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'}`}>
                    <strong>🤖 AI Vision:</strong> {aiResults[worker.id].auto_approved ? 'Tự động duyệt' : 'Cần xem xét'}
                    · Độ tin cậy: {Math.round(aiResults[worker.id].confidence * 100)}%
                    · Giấy tờ hợp lệ: {aiResults[worker.id].document_valid ? '✅' : '❌'}
                    {aiResults[worker.id].selfie_matches !== undefined && ` · Khớp selfie: ${aiResults[worker.id].selfie_matches ? '✅' : '❌'}`}
                    {aiResults[worker.id].flags?.length > 0 && (
                      <div className="mt-1 text-red-400">{aiResults[worker.id].flags.join('; ')}</div>
                    )}
                    <p className="mt-1 text-gray-400">{aiResults[worker.id].explanation}</p>
                  </div>
                )}

                {/* Review Actions */}
                {tab === 'pending' && (
                  <div className="space-y-3">
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Ghi chú khi duyệt (không bắt buộc)..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500" rows={2} />
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        setAiVerifying(worker.id)
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                          const res = await fetch(`${supabaseUrl}/functions/v1/ai-kyc`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              worker_id: worker.id,
                              id_front_url: worker.id_front_url,
                              id_back_url: worker.id_back_url,
                              selfie_url: worker.selfie_url,
                            }),
                          })
                          const result = await res.json()
                          if (result.success) setAiResults(prev => ({ ...prev, [worker.id]: result.data }))
                        } catch (e) {
                          console.error('AI KYC error:', e)
                        }
                        setAiVerifying(null)
                      }} disabled={aiVerifying === worker.id || !worker.id_front_url}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                        {aiVerifying === worker.id ? '🔄 Đang phân tích...' : '🤖 Xác thực bằng AI Vision'}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(worker.id, 'verified')} disabled={actioning}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                          ✅ Duyệt
                        </button>
                        <button onClick={() => handleReview(worker.id, 'rejected')} disabled={actioning}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                          ❌ Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Review Notes */}
                {worker.kyc_notes && (
                  <div className="text-xs text-gray-400 bg-gray-700/50 rounded-lg p-2">
                    <strong>Ghi chú:</strong> {worker.kyc_notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
