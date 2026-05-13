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

interface Profile {
  id: string
  email: string
  phone: string | null
  role: 'customer' | 'worker' | 'admin'
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

const ROLE_LABELS: Record<string, string> = {
  customer: 'Khách hàng',
  worker: 'Thợ',
  admin: 'Quản trị',
}

const ROLE_COLORS: Record<string, string> = {
  customer: 'bg-green-100 text-green-800',
  worker: 'bg-blue-100 text-blue-800',
  admin: 'bg-red-100 text-red-800',
}

export default function AdminUsers() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchUsers = useCallback(async (searchTerm = search, role = roleFilter, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const params = new URLSearchParams({
        action: 'users',
        page: String(pageNum),
        pageSize: String(pageSize),
      })
      if (searchTerm) params.set('search', searchTerm)
      if (role) params.set('role', role)

      const response = await fetch(`/api/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      if (!mountedRef.current) return
      setUsers(data.users || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.count || 0)
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching users:', err)
        toast('Không thể tải danh sách người dùng', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, search, roleFilter, page])

  useEffect(() => {
    queueMicrotask(() => { fetchUsers(search, roleFilter, page) })
  }, [fetchUsers, search, roleFilter, page])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleRoleFilter(role: string) {
    setRoleFilter(role)
    setPage(1)
  }

  async function handleUpdateRole() {
    if (!selectedUser || !editRole || editRole === selectedUser.role) return
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
          action: 'users-update',
          user_id: selectedUser.id,
          updates: { role: editRole },
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update role')
      }

      toast('Cập nhật vai trò thành công', 'success')
      setSelectedUser(null)
      fetchUsers(search, roleFilter, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const roles = [
    { value: '', label: 'Tất cả' },
    { value: 'customer', label: 'Khách hàng' },
    { value: 'worker', label: 'Thợ' },
    { value: 'admin', label: 'Quản trị' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
        <p className="mt-2 sm:mt-0 text-sm text-gray-500">
          Tổng số: <span className="font-medium">{totalCount}</span> người dùng
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
          {roles.map(r => (
            <button
              key={r.value}
              onClick={() => handleRoleFilter(r.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                roleFilter === r.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton rows={8} height="h-12" />
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Không tìm thấy người dùng nào
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số điện thoại
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {users.map(user => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || 'Chưa có tên'}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.phone || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setEditRole(user.role)
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
            <div className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </div>
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
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết người dùng</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedUser.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Họ tên</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.full_name || 'Chưa có tên'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Số điện thoại</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || 'Chưa có'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Vai trò hiện tại</label>
                <Badge className={`mt-1 px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[selectedUser.role]}`}>
                  {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                </Badge>
              </div>

              {/* Role change */}
              <div>
                <label className="block text-sm font-medium text-gray-500">Đổi vai trò</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer">Khách hàng</option>
                  <option value="worker">Thợ</option>
                  <option value="admin">Quản trị</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedUser.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Cập nhật lần cuối</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedUser.updated_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUpdateRole}
                disabled={saving || editRole === selectedUser.role}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => setSelectedUser(null)}
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
