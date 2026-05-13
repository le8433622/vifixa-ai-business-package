'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Thất bại', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-800' },
}

export default function AdminPayouts() {
  const router = useRouter()
  const { toast } = useToast()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [confirmRef, setConfirmRef] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchPayouts = useCallback(async (status = statusFilter, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const params = new URLSearchParams({ action: 'payouts', page: String(pageNum), pageSize: String(pageSize) })
      if (status) params.set('status', status)

      const response = await fetch(`/api/admin?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      if (!mountedRef.current) return
      setPayouts(data.payouts || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching payouts:', err)
      toast('Không thể tải danh sách thanh toán', 'error')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, statusFilter, page])

  useEffect(() => {
    queueMicrotask(() => { fetchPayouts(statusFilter, page) })
  }, [fetchPayouts, statusFilter, page])

  async function handleApprove(payoutId: string) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=approve&id=${payoutId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Duyệt thất bại')

      toast('Đã duyệt thanh toán', 'success')
      setSelectedPayout(null)
      fetchPayouts(statusFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Duyệt thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm(payoutId: string) {
    if (!confirmRef) { toast('Vui lòng nhập mã tham chiếu', 'error'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=confirm&id=${payoutId}&ref=${encodeURIComponent(confirmRef)}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Xác nhận thất bại')

      toast('Đã xác nhận chuyển tiền', 'success')
      setSelectedPayout(null)
      setConfirmRef('')
      fetchPayouts(statusFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Xác nhận thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleReject(payoutId: string) {
    if (!rejectNote) { toast('Vui lòng nhập lý do từ chối', 'error'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'payouts-reject', payout_id: payoutId, note: rejectNote }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Từ chối thất bại')

      toast('Đã từ chối thanh toán', 'success')
      setSelectedPayout(null)
      setRejectNote('')
      fetchPayouts(statusFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Từ chối thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)

  const statuses = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'failed', label: 'Thất bại' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý thanh toán</h1>
        <p className="text-sm text-gray-500">Tổng số: <span className="font-medium">{totalCount}</span></p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map(s => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}>{s.label}</button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} height="h-14" />
      ) : payouts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Không tìm thấy thanh toán nào</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phí</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {payouts.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.profiles?.email || p.user_id?.slice(0, 8) || 'N/A'}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">{fmt(Number(p.amount))}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.fee ? fmt(Number(p.fee)) : '-'}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[p.status]?.color}`}>
                      {STATUS_CONFIG[p.status]?.label || p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(p.created_at).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button onClick={() => { setSelectedPayout(p); setRejectNote('') }}
                      className="text-blue-600 hover:text-blue-800 font-medium">Chi tiết</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">Trang {page} / {totalPages}</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">Trước</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">Sau</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedPayout(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết thanh toán</h2>
              <button onClick={() => setSelectedPayout(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3 mb-6">
              <div><label className="text-sm font-medium text-gray-500">Người nhận</label><p className="text-sm text-gray-900">{selectedPayout.profiles?.email || selectedPayout.user_id}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Số tiền</label><p className="text-lg font-bold">{fmt(Number(selectedPayout.amount))}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Phí</label><p className="text-sm">{selectedPayout.fee ? fmt(Number(selectedPayout.fee)) : '0'}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Trạng thái</label>
                <Badge className={`mt-1 px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[selectedPayout.status]?.color}`}>
                  {STATUS_CONFIG[selectedPayout.status]?.label || selectedPayout.status}
                </Badge>
              </div>
              {selectedPayout.bank_account && (
                <div><label className="text-sm font-medium text-gray-500">Tài khoản ngân hàng</label>
                  <p className="text-sm text-gray-900">
                    {(selectedPayout.bank_account as any)?.bank_name || ''} - {(selectedPayout.bank_account as any)?.account_number || ''}
                    {(selectedPayout.bank_account as any)?.holder ? ` (${(selectedPayout.bank_account as any).holder})` : ''}
                  </p>
                </div>
              )}
              <div><label className="text-sm font-medium text-gray-500">Ngày tạo</label><p className="text-sm">{new Date(selectedPayout.created_at).toLocaleString('vi-VN')}</p></div>
              {selectedPayout.completed_at && <div><label className="text-sm font-medium text-gray-500">Xử lý lúc</label><p className="text-sm">{new Date(selectedPayout.completed_at).toLocaleString('vi-VN')}</p></div>}
            </div>

            {/* Actions - Pending: approve/reject */}
            {selectedPayout.status === 'pending' && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-700">Xử lý yêu cầu</h3>
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(selectedPayout.id)} disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                    {saving ? 'Đang xử lý...' : 'Duyệt thanh toán'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Lý do từ chối</label>
                  <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2} placeholder="Nhập lý do từ chối..." />
                </div>
                <button onClick={() => handleReject(selectedPayout.id)} disabled={saving || !rejectNote}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                  Từ chối
                </button>
              </div>
            )}

            {/* Actions - Processing: confirm */}
            {selectedPayout.status === 'processing' && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-700">Xác nhận đã chuyển tiền</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mã tham chiếu giao dịch</label>
                  <input value={confirmRef} onChange={(e) => setConfirmRef(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập mã tham chiếu từ ngân hàng..." />
                </div>
                <button onClick={() => handleConfirm(selectedPayout.id)} disabled={saving || !confirmRef}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {saving ? 'Đang xử lý...' : 'Xác nhận đã chuyển tiền'}
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedPayout(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
