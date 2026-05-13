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

interface WorkerProfile {
  user_id: string
  skills: string[]
  service_areas: string[]
  trust_score: number
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  avg_earnings: number
  total_orders: number
  avg_rating: number
  dispute_rate: number
  home_lat?: number
  home_lng?: number
  home_address?: string
  max_service_radius_km?: number
  created_at: string
  profiles: {
    email: string
    phone: string | null
    full_name: string | null
  }
}

const VERIFY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  verified: { label: 'Đã xác minh', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
}

export default function AdminWorkers() {
  const router = useRouter()
  const { toast } = useToast()
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null)
  const [editTrustScore, setEditTrustScore] = useState(50)
  const [editStatus, setEditStatus] = useState('pending')
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchWorkers = useCallback(async (searchTerm = search, status = statusFilter, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const params = new URLSearchParams({
        action: 'workers',
        page: String(pageNum),
        pageSize: String(pageSize),
      })
      if (searchTerm) params.set('search', searchTerm)
      if (status) params.set('verification_status', status)

      const response = await fetch(`/api/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch workers')
      const data = await response.json()
      if (!mountedRef.current) return
      setWorkers(data.workers || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.count || 0)
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching workers:', err)
        toast('Không thể tải danh sách thợ', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, search, statusFilter, page])

  useEffect(() => {
    queueMicrotask(() => { fetchWorkers(search, statusFilter, page) })
  }, [fetchWorkers, search, statusFilter, page])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status)
    setPage(1)
  }

  async function handleUpdateWorker() {
    if (!selectedWorker) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'workers-update',
          user_id: selectedWorker.user_id,
          updates: {
            trust_score: editTrustScore,
            verification_status: editStatus,
            is_verified: editStatus === 'verified',
          },
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update worker')
      }

      toast('Cập nhật thông tin thợ thành công', 'success')
      setSelectedWorker(null)
      fetchWorkers(search, statusFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const statuses = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'verified', label: 'Đã xác minh' },
    { value: 'rejected', label: 'Từ chối' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý thợ</h1>
        <p className="mt-2 sm:mt-0 text-sm text-gray-500">
          Tổng số: <span className="font-medium">{totalCount}</span> thợ
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm email, tên, số điện thoại..."
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

      {/* Table */}
      {loading ? (
        <LoadingSkeleton rows={8} height="h-16" />
      ) : workers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Không tìm thấy thợ nào
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thợ</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỹ năng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm tin cậy</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn hàng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {workers.map(w => (
                <TableRow key={w.user_id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{w.profiles?.full_name || w.profiles?.email || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{w.profiles?.email}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(w.skills || []).slice(0, 3).map((s: string) => (
                        <Badge key={s} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">{s}</Badge>
                      ))}
                      {(w.skills?.length || 0) > 3 && (
                        <span className="text-xs text-gray-400">+{w.skills.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`px-2 py-1 rounded text-xs font-medium ${VERIFY_STATUS_CONFIG[w.verification_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {VERIFY_STATUS_CONFIG[w.verification_status]?.label || w.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            w.trust_score >= 70 ? 'bg-green-500' : w.trust_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${w.trust_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{w.trust_score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {w.total_orders || 0}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {w.avg_rating ? `${w.avg_rating.toFixed(1)} ⭐` : 'N/A'}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => {
                        setSelectedWorker(w)
                        setEditTrustScore(w.trust_score)
                        setEditStatus(w.verification_status)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Chi tiết
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
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
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedWorker(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết thợ</h2>
              <button onClick={() => setSelectedWorker(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Họ tên</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.profiles?.full_name || 'Chưa có tên'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.profiles?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Số điện thoại</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.profiles?.phone || 'Chưa có'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Trạng thái xác minh</label>
                <Badge className={`mt-1 px-2 py-1 rounded text-xs font-medium ${VERIFY_STATUS_CONFIG[selectedWorker.verification_status]?.color}`}>
                  {VERIFY_STATUS_CONFIG[selectedWorker.verification_status]?.label}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Kỹ năng</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(selectedWorker.skills || []).map((s: string) => (
                    <Badge key={s} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Khu vực phục vụ</label>
                <p className="mt-1 text-sm text-gray-900">{(selectedWorker.service_areas || []).join(', ') || 'Chưa có'}</p>
              </div>
              {selectedWorker.home_lat && selectedWorker.home_lng && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Vị trí nhà {selectedWorker.max_service_radius_km ? `(bán kính phục vụ: ${selectedWorker.max_service_radius_km}km)` : ''}
                  </label>
                  <StaticMapThumbnail
                    lat={selectedWorker.home_lat}
                    lng={selectedWorker.home_lng}
                    width={400}
                    height={160}
                  />
                  {selectedWorker.home_address && (
                    <p className="text-xs text-gray-500 mt-1">{selectedWorker.home_address}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Tổng đơn hàng</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.total_orders || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Đánh giá trung bình</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedWorker.avg_rating ? `${selectedWorker.avg_rating.toFixed(1)} ⭐` : 'Chưa có'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Thu nhập trung bình</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.avg_earnings?.toLocaleString() || 0} VNĐ</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Tỷ lệ tranh chấp</label>
                <p className="mt-1 text-sm text-gray-900">{selectedWorker.dispute_rate || 0}%</p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">Chỉnh sửa thông tin</h3>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Điểm tin cậy (0-100)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editTrustScore}
                    onChange={(e) => setEditTrustScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono font-bold w-8 text-right">{editTrustScore}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái xác minh</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Chờ duyệt</option>
                  <option value="verified">Đã xác minh</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUpdateWorker}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => setSelectedWorker(null)}
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
