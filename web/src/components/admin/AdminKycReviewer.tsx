'use client'

import { useState } from 'react'
import { KycApplication } from '@/hooks/useAdminAutoMode'

interface AdminKycReviewerProps {
  applications: KycApplication[]
  onApprove: (kycId: string, score?: number) => void
  onReject: (kycId: string, reason: string) => void
  loading: boolean
}

export default function AdminKycReviewer({ applications, onApprove, onReject, loading }: AdminKycReviewerProps) {
  const [selectedKyc, setSelectedKyc] = useState<KycApplication | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  if (applications.length === 0 && !loading) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 text-center">
        <span className="text-3xl">🪪</span>
        <p className="text-sm text-gray-400 mt-2">Không có KYC nào chờ duyệt</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-200">🪪 KYC chờ duyệt ({applications.length})</h3>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {applications.map(kyc => (
          <div
            key={kyc.id}
            className={`rounded-xl border p-3 cursor-pointer transition ${
              selectedKyc?.id === kyc.id
                ? 'bg-indigo-900/40 border-indigo-600'
                : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
            }`}
            onClick={() => { setSelectedKyc(kyc); setShowReject(false) }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-sm font-medium text-gray-200">{kyc.full_name}</p>
                  <p className="text-[10px] text-gray-400">{kyc.phone} · {kyc.id_number}</p>
                </div>
              </div>
              {kyc.ai_score !== undefined && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  kyc.ai_score >= 80 ? 'bg-green-900/50 text-green-300' :
                  kyc.ai_score >= 60 ? 'bg-amber-900/50 text-amber-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  AI: {kyc.ai_score}%
                </span>
              )}
            </div>

            {kyc.ai_reasons && kyc.ai_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {kyc.ai_reasons.slice(0, 2).map((reason, i) => (
                  <span key={i} className="text-[10px] bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                    {reason}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            {selectedKyc?.id === kyc.id && (
              <div className="mt-3 pt-3 border-t border-gray-600 flex gap-2">
                {!showReject ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(kyc.id, kyc.ai_score) }}
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowReject(true) }}
                      className="flex-1 py-2 px-4 bg-red-600/20 text-red-300 border border-red-600 rounded-xl text-xs font-medium hover:bg-red-600/30 transition"
                    >
                      ❌ Từ chối
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 w-full">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Lý do từ chối..."
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (rejectReason.trim()) {
                          onReject(kyc.id, rejectReason)
                          setShowReject(false)
                          setRejectReason('')
                        }
                      }}
                      disabled={loading || !rejectReason.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 disabled:opacity-40 transition"
                    >
                      Xác nhận
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
