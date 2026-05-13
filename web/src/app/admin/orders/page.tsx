'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingSkeleton from '@/components/admin/LoadingSkeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import StaticMapThumbnail from '@/components/map/StaticMapThumbnail'

interface OrderProfile {
  id: string
  customer_id: string
  worker_id: string | null
  category: string
  description: string
  media_urls: unknown
  ai_diagnosis: unknown
  estimated_price: number
  final_price: number | null
  status: string
  address?: string
  location_lat?: number
  location_lng?: number
  created_at: string
  updated_at: string
  profiles: { email: string }
  workers: { user_id: string; profiles: { email: string; full_name: string | null } } | null
}

interface WorkerOption {
  user_id: string
  profiles: { email: string; full_name: string | null }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
  matched: { label: 'Đã ghép cặp', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'Đang thực hiện', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-800' },
  disputed: { label: 'Tranh chấp', color: 'bg-red-100 text-red-800' },
}

export default function AdminOrders() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<OrderProfile | null>(null)
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [editStatus, setEditStatus] = useState('')
  const [editWorkerId, setEditWorkerId] = useState('')
  const [editFinalPrice, setEditFinalPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchOrders = useCallback(async (searchTerm = search, status = statusFilter, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const params = new URLSearchParams({
        action: 'orders', page: String(pageNum), pageSize: String(pageSize),
      })
      if (searchTerm) params.set('search', searchTerm)
      if (status) params.set('status', status)

      const response = await fetch(`/api/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      if (!mountedRef.current) return
      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.count || 0)
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching orders:', err)
        toast('Không thể tải danh sách đơn hàng', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, search, statusFilter, page])

  useEffect(() => {
    queueMicrotask(() => { fetchOrders(search, statusFilter, page) })
  }, [fetchOrders, search, statusFilter, page])

  const fetchWorkers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch('/api/admin?action=workers&pageSize=200', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setWorkers(data.workers || [])
      }
    } catch (err) {
      console.error('Error fetching workers:', err)
    }
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status)
    setPage(1)
  }

  function openOrderDetail(order: OrderProfile) {
    setSelectedOrder(order)
    setEditStatus(order.status)
    setEditWorkerId(order.worker_id || '')
    setEditFinalPrice(order.final_price ? String(order.final_price) : '')
    fetchWorkers()
  }

  async function handleUpdateOrder() {
    if (!selectedOrder) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const updates: Record<string, unknown> = { status: editStatus }
      if (editWorkerId) updates.worker_id = editWorkerId
      if (editFinalPrice) updates.final_price = Number(editFinalPrice)

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'orders-update', order_id: selectedOrder.id, updates }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update order')
      }

      toast('Cập nhật đơn hàng thành công', 'success')
      setSelectedOrder(null)
      fetchOrders(search, statusFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const statuses = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'matched', label: 'Đã ghép cặp' },
    { value: 'in_progress', label: 'Đang thực hiện' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'disputed', label: 'Tranh chấp' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý đơn hàng</h1>
        <p className="mt-2 sm:mt-0 text-sm text-gray-500">
          Tổng số: <span className="font-medium">{totalCount}</span> đơn hàng
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm email, mô tả, danh mục..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} height="h-14" />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Không tìm thấy đơn hàng nào
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn hàng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thợ</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá dự kiến</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị trí</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {orders.map(order => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.category}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{order.description}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.profiles?.email || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.workers?.profiles?.email || <span className="text-gray-400">Chưa có</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_CONFIG[order.status]?.label || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.estimated_price?.toLocaleString()} VNĐ
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.location_lat && order.location_lng ? (
                      <span className="inline-flex items-center gap-1 text-blue-600" title={`${order.location_lat}, ${order.location_lng}`}>
                        📍 {order.address || `${order.location_lat.toFixed(4)}, ${order.location_lng.toFixed(4)}`}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openOrderDetail(order)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Chi tiết
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">Trang {page} / {totalPages}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết đơn hàng</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Mã đơn hàng</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedOrder.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Danh mục</label>
                <p className="mt-1 text-sm text-gray-900">{selectedOrder.category}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                <Badge className={`mt-1 px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color}`}>
                  {STATUS_CONFIG[selectedOrder.status]?.label}
                </Badge>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Mô tả</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedOrder.description}</p>
              </div>
              {selectedOrder.location_lat && selectedOrder.location_lng && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Vị trí</label>
                  <StaticMapThumbnail
                    lat={selectedOrder.location_lat}
                    lng={selectedOrder.location_lng}
                    width={400}
                    height={160}
                  />
                  {selectedOrder.address && (
                    <p className="text-xs text-gray-500 mt-1">{selectedOrder.address}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedOrder.location_lat.toFixed(6)}, {selectedOrder.location_lng.toFixed(6)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Khách hàng</label>
                <p className="mt-1 text-sm text-gray-900">{selectedOrder.profiles?.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Thợ hiện tại</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedOrder.workers?.profiles?.email || <span className="text-gray-400">Chưa phân công</span>}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Giá dự kiến</label>
                <p className="mt-1 text-sm text-gray-900">{selectedOrder.estimated_price?.toLocaleString()} VNĐ</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Giá thực tế</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedOrder.final_price ? `${selectedOrder.final_price.toLocaleString()} VNĐ` : 'Chưa có'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Cập nhật</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.updated_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">Chỉnh sửa đơn hàng</h3>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Cập nhật trạng thái</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="matched">Đã ghép cặp</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                  <option value="disputed">Tranh chấp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phân công thợ</label>
                <select
                  value={editWorkerId}
                  onChange={(e) => setEditWorkerId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chưa phân công</option>
                  {workers.map(w => (
                    <option key={w.user_id} value={w.user_id}>
                      {w.profiles?.full_name || w.profiles?.email || w.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Giá thực tế (VNĐ)</label>
                <Input
                  type="number"
                  value={editFinalPrice}
                  onChange={(e) => setEditFinalPrice(e.target.value)}
                  placeholder="Nhập giá thực tế"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUpdateOrder}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
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
