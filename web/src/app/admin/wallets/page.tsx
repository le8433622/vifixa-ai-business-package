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

interface WalletRecord {
  id: string
  user_id: string
  balance: number
  locked_amount: number
  currency: string
  profiles: { email: string; full_name: string; role: string } | null
}

interface WalletSummary {
  total_balance: number
  total_locked: number
  pending_payout_amount: number
  total_wallets: number
}

export default function AdminWallets() {
  const router = useRouter()
  const { toast } = useToast()
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 20
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchData = useCallback(async (searchTerm = search, pageNum = page) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [walletsRes, summaryRes] = await Promise.all([
        fetch(`/api/admin?action=wallets&page=${pageNum}&pageSize=${pageSize}${searchTerm ? `&search=${searchTerm}` : ''}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/admin?action=wallets-summary', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ])

      if (walletsRes.ok) {
        const data = await walletsRes.json()
        if (!mountedRef.current) return
        setWallets(data.wallets || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.count || 0)
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json()
        if (mountedRef.current) setSummary(data)
      }
    } catch (err) {
      console.error('Error fetching wallets:', err)
      toast('Không thể tải danh sách ví', 'error')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router, toast, search, page])

  useEffect(() => {
    queueMicrotask(() => { fetchData(search, page) })
  }, [fetchData, search, page])

  async function handleAdjust() {
    if (!selectedWallet || adjustAmount === 0 || !adjustReason) {
      toast('Vui lòng nhập số tiền và lý do', 'error')
      return
    }
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
        body: JSON.stringify({
          action: 'wallets-adjust',
          user_id: selectedWallet.user_id,
          amount: adjustAmount,
          reason: adjustReason,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Điều chỉnh thất bại')
      }

      toast('Điều chỉnh số dư thành công', 'success')
      setSelectedWallet(null)
      setAdjustReason('')
      setAdjustAmount(0)
      fetchData(search, page)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Điều chỉnh thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
  const avail = (w: WalletRecord) => (Number(w.balance) || 0) - (Number(w.locked_amount) || 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý ví</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600">Tổng số dư</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(summary.total_balance)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600">Đang khóa</p>
            <p className="text-2xl font-bold text-yellow-600">{fmt(summary.total_locked)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600">Payout chờ duyệt</p>
            <p className="text-2xl font-bold text-orange-600">{fmt(summary.pending_payout_amount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600">Tổng ví</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_wallets}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm email, tên..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton rows={8} height="h-14" />
      ) : wallets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Không tìm thấy ví nào</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khả dụng</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đang khóa</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {wallets.map((w: WalletRecord) => (
                <TableRow key={w.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{w.profiles?.email || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{w.profiles?.full_name || ''}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`px-2 py-1 rounded text-xs font-medium ${
                      w.profiles?.role === 'admin' ? 'bg-red-100 text-red-800' :
                      w.profiles?.role === 'worker' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>{w.profiles?.role || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">{fmt(Number(w.balance))}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{fmt(avail(w))}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{fmt(Number(w.locked_amount) || 0)}</TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button onClick={() => { setSelectedWallet(w); setAdjustAmount(0); setAdjustReason('') }}
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
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedWallet(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết ví</h2>
              <button onClick={() => setSelectedWallet(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3 mb-6">
              <div><label className="text-sm font-medium text-gray-500">Người dùng</label><p className="text-sm text-gray-900">{selectedWallet.profiles?.email}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Số dư</label><p className="text-lg font-bold text-blue-600">{fmt(Number(selectedWallet.balance))}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Đang khóa</label><p className="text-sm text-yellow-600">{fmt(Number(selectedWallet.locked_amount) || 0)}</p></div>
              <div><label className="text-sm font-medium text-gray-500">Khả dụng</label><p className="text-sm text-green-600 font-medium">{fmt(avail(selectedWallet))}</p></div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">Điều chỉnh số dư</h3>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Số tiền (dương = cộng, âm = trừ)</label>
                <Input
                  type="number" value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="VD: 100000 hoặc -50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Lý do</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2} placeholder="VD: Hoàn tiền lỗi hệ thống"
                />
              </div>
              <button
                onClick={handleAdjust}
                disabled={saving || adjustAmount === 0 || !adjustReason}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Đang lưu...' : `Xác nhận điều chỉnh (${adjustAmount >= 0 ? '+' : ''}${adjustAmount.toLocaleString('vi-VN')} VNĐ)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
