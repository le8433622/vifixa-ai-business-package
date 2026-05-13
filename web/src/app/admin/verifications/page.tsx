'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'

interface VerificationItem {
  user_id: string
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  trust_score: number
  skills: string[]
  service_areas: string[]
  created_at: string
  profiles: {
    email: string
    phone: string | null
    full_name: string | null
    address: string | null
    id_number: string | null
    avatar_url: string | null
    bank_name: string | null
    bank_account_number: string | null
    bank_account_holder: string | null
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  verified: { label: 'Đã xác minh', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
}

export default function AdminVerifications() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<VerificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<VerificationItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchVerifications = useCallback(async (status = filter, q = search) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      let query = supabase
        .from('workers')
        .select('*, profiles(*)')

      if (status && ['pending', 'verified', 'rejected'].includes(status)) {
        query = query.eq('verification_status', status)
      }
      if (q) {
        query = query.or(
          `profiles.email.ilike.%${q}%,profiles.phone.ilike.%${q}%,profiles.full_name.ilike.%${q}%`
        )
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) throw error
      if (mountedRef.current) setItems((data || []) as VerificationItem[])
    } catch (err) {
      if (mountedRef.current) {
        console.error('fetch error:', err)
        toast('Không thể tải danh sách xác minh', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, filter, search])

  useEffect(() => {
    queueMicrotask(() => fetchVerifications(filter, search))
  }, [fetchVerifications, filter, search])

  async function handleAction(status: 'verified' | 'rejected') {
    if (!selected) return
    if (status === 'rejected' && !rejectReason.trim()) {
      toast('Vui lòng nhập lý do từ chối', 'error')
      return
    }

    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: updateError } = await supabase
        .from('workers')
        .update({
          verification_status: status,
          is_verified: status === 'verified',
        })
        .eq('user_id', selected.user_id)

      if (updateError) throw updateError

      // Write audit log
      await supabase
        .from('verification_audit_log')
        .insert({
          user_id: selected.user_id,
          action: status === 'verified' ? 'approved' : 'rejected',
          previous_status: selected.verification_status,
          new_status: status,
          reason: status === 'rejected' ? rejectReason : null,
          admin_id: session.user.id,
        })

      toast(
        status === 'verified'
          ? `Đã xác minh ${selected.profiles?.full_name || selected.profiles?.email}`
          : `Đã từ chối ${selected.profiles?.full_name || selected.profiles?.email}`,
        'success'
      )

      setSelected(null)
      setRejectReason('')
      fetchVerifications(filter, search)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Thao tác thất bại', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const tabs = [
    { value: 'pending', label: 'Chờ duyệt', count: items.filter(i => i.verification_status === 'pending').length },
    { value: 'verified', label: 'Đã xác minh', count: items.filter(i => i.verification_status === 'verified').length },
    { value: 'rejected', label: 'Từ chối', count: items.filter(i => i.verification_status === 'rejected').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">✅ Xác minh thợ</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.value} onClick={() => { setFilter(t.value); setSearch('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}>
            {t.label} {filter === t.value ? `(${t.count})` : ''}
          </button>
        ))}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm email, tên, SĐT..."
          className="ml-auto px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* List */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {filter === 'pending' ? '🎉 Không có thợ nào chờ duyệt!' : 'Không tìm thấy kết quả'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(w => (
            <div key={w.user_id} onClick={() => setSelected(w)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    {(w.profiles?.full_name?.[0] || w.profiles?.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{w.profiles?.full_name || 'Chưa có tên'}</p>
                    <p className="text-sm text-gray-500 truncate">{w.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{w.profiles?.phone || '—'}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[w.verification_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {STATUS_CONFIG[w.verification_status]?.label || w.verification_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Chi tiết xác minh</h2>
                <button onClick={() => { setSelected(null); setRejectReason('') }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {/* Worker Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Họ tên</p>
                  <p className="font-medium">{selected.profiles?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{selected.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Số điện thoại</p>
                  <p className="font-medium">{selected.profiles?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">CMND/CCCD</p>
                  <p className="font-medium">{selected.profiles?.id_number || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Địa chỉ</p>
                  <p className="font-medium">{selected.profiles?.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Điểm tin cậy</p>
                  <p className="font-medium">{selected.trust_score}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Kỹ năng</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selected.skills || []).map((s: string) => (
                      <span key={s} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Khu vực phục vụ</p>
                  <p className="font-medium">{(selected.service_areas || []).join(', ') || '—'}</p>
                </div>
                {selected.profiles?.bank_name && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Tài khoản ngân hàng</p>
                    <p className="font-medium">{selected.profiles.bank_name} - {selected.profiles.bank_account_number} ({selected.profiles.bank_account_holder})</p>
                  </div>
                )}
              </div>

              {/* Action */}
              {selected.verification_status === 'pending' && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-700">Xử lý xác minh</h3>

                  {rejectReason && (
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Lý do từ chối (bắt buộc)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 min-h-[80px]"
                    />
                  )}

                  <div className="flex gap-3">
                    {!rejectReason ? (
                      <>
                        <button onClick={() => setRejectReason('Nhập lý do...')}
                          className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium">
                          ❌ Từ chối
                        </button>
                        <button onClick={() => handleAction('verified')} disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                          {actionLoading ? 'Đang xử lý...' : '✅ Xác nhận'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setRejectReason('')}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                          ← Quay lại
                        </button>
                        <button onClick={() => handleAction('rejected')} disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                          {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selected.verification_status !== 'pending' && (
                <div className="border-t pt-4 text-center text-sm text-gray-500">
                  Đã xử lý: {STATUS_CONFIG[selected.verification_status]?.label}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
