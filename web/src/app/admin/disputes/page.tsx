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

interface ReviewItem {
  id: string
  entity_type: string
  entity_id: string
  ai_decision: Record<string, unknown>
  review_status: string
  resolution_action: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  profiles: { id: string; email: string; full_name: string | null } | null
}

const REVIEW_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xem xét', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
  escalated: { label: 'Đã nâng cấp', color: 'bg-purple-100 text-purple-800' },
}

const ENTITY_LABELS: Record<string, string> = {
  dispute: 'Tranh chấp',
  order: 'Đơn hàng',
  fraud: 'Gian lận',
  quality: 'Chất lượng',
  pricing: 'Định giá',
}

export default function AdminDisputes() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchDisputes = useCallback(async (status = statusFilter, type = typeFilter, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const params = new URLSearchParams({
        action: 'disputes', page: String(pageNum), pageSize: String(pageSize),
      })
      if (status) params.set('review_status', status)
      if (type) params.set('entity_type', type)

      const response = await fetch(`/api/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch disputes')
      const data = await response.json()
      if (!mountedRef.current) return
      setItems(data.disputes || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.count || 0)
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching disputes:', err)
        toast('Không thể tải danh sách khiếu nại', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, statusFilter, typeFilter, page])

  useEffect(() => {
    queueMicrotask(() => { fetchDisputes(statusFilter, typeFilter, page) })
  }, [fetchDisputes, statusFilter, typeFilter, page])

  function handleStatusFilter(val: string) { setStatusFilter(val); setPage(1) }
  function handleTypeFilter(val: string) { setTypeFilter(val); setPage(1) }

  async function handleResolve(reviewId: string, entityId: string, reviewStatus: string, orderAction: string | null) {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const body: Record<string, unknown> = {
        action: 'disputes-resolve',
        review_id: reviewId,
        resolution: { review_status: reviewStatus },
      }
      if (orderAction) {
        body.resolution = { ...body.resolution as Record<string, unknown>, action: orderAction }
        body.entity_id = entityId
        body.order_action = orderAction
      }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to resolve dispute')
      }

      toast('Giải quyết khiếu nại thành công', 'success')
      setSelectedItem(null)
      fetchDisputes(statusFilter, typeFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Giải quyết thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const statuses = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ xem xét' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Từ chối' },
    { value: 'escalated', label: 'Đã nâng cấp' },
  ]

  const types = [
    { value: '', label: 'Tất cả loại' },
    { value: 'dispute', label: 'Tranh chấp' },
    { value: 'order', label: 'Đơn hàng' },
    { value: 'fraud', label: 'Gian lận' },
    { value: 'quality', label: 'Chất lượng' },
    { value: 'pricing', label: 'Định giá' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý khiếu nại</h1>
        <p className="mt-2 sm:mt-0 text-sm text-gray-500">
          Tổng số: <span className="font-medium">{totalCount}</span> yêu cầu
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t.value}
              onClick={() => handleTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === t.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Không tìm thấy khiếu nại nào
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đối tượng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người gửi</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {items.map(item => {
                const aiDecision = item.ai_decision || {}
                return (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                        {ENTITY_LABELS[item.entity_type] || item.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {item.entity_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.profiles?.email || '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`px-2 py-1 rounded text-xs font-medium ${REVIEW_STATUS_CONFIG[item.review_status]?.color}`}>
                        {REVIEW_STATUS_CONFIG[item.review_status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                      {aiDecision.severity && (
                        <Badge className={`px-2 py-1 rounded text-xs font-medium ${
                          aiDecision.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          aiDecision.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          aiDecision.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {aiDecision.severity}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Chi tiết
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">Trang {page} / {totalPages}</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết khiếu nại</h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Loại</label>
                <p className="mt-1 text-sm text-gray-900">{ENTITY_LABELS[selectedItem.entity_type] || selectedItem.entity_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                <Badge className={`mt-1 px-2 py-1 rounded text-xs font-medium ${REVIEW_STATUS_CONFIG[selectedItem.review_status]?.color}`}>
                  {REVIEW_STATUS_CONFIG[selectedItem.review_status]?.label}
                </Badge>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Mã đối tượng</label>
                <p className="mt-1 text-sm font-mono text-gray-900">{selectedItem.entity_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Người gửi</label>
                <p className="mt-1 text-sm text-gray-900">{selectedItem.profiles?.email || selectedItem.created_by}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedItem.created_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {/* AI Decision */}
            {selectedItem.ai_decision && Object.keys(selectedItem.ai_decision).length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Kết quả AI phân tích</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(selectedItem.ai_decision).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-blue-700 capitalize">{key.replace(/_/g, ' ')}: </span>
                      <span className="text-blue-800">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedItem.review_status === 'pending' && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-700 mb-4">Xử lý khiếu nại</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedItem.entity_type === 'dispute' ? (
                    <>
                      <button
                        onClick={() => handleResolve(selectedItem.id, selectedItem.entity_id, 'approved', 'complete')}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Duyệt đơn hàng
                      </button>
                      <button
                        onClick={() => handleResolve(selectedItem.id, selectedItem.entity_id, 'rejected', 'refund')}
                        disabled={saving}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Hoàn tiền
                      </button>
                      <button
                        onClick={() => handleResolve(selectedItem.id, '', 'escalated', null)}
                        disabled={saving}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Nâng cấp
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleResolve(selectedItem.id, '', 'approved', null)}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Phê duyệt
                      </button>
                      <button
                        onClick={() => handleResolve(selectedItem.id, '', 'rejected', null)}
                        disabled={saving}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedItem.review_status !== 'pending' && selectedItem.resolved_at && (
              <div className="border-t pt-4 text-sm text-gray-500">
                Đã xử lý lúc: {new Date(selectedItem.resolved_at).toLocaleString('vi-VN')}
                {selectedItem.resolution_action && <> · Hành động: {selectedItem.resolution_action}</>}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
