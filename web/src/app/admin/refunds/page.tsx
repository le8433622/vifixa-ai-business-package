'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function AdminRefunds() {
  const router = useRouter()
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('refund_requests')
      .select('*, orders:order_id(category, estimated_price, final_price, status, payment_status, customer_id, worker_id)')
      .order('created_at', { ascending: false })
    setRefunds(data || [])
    setLoading(false)
  }

  async function handleApprove(refund: any) {
    if (!confirm(`Duyệt hoàn tiền ${refund.amount.toLocaleString()}₫ cho đơn ${refund.order_id.slice(0, 8)}?`)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('refund_requests').update({ status: 'approved', admin_note: 'Đã duyệt bởi admin' }).eq('id', refund.id)

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escrow:refund', orderId: refund.order_id }),
      })
      await supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded' }).eq('id', refund.order_id)
      await supabase.from('refund_requests').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', refund.id)
    } catch (e) {
      console.error('Refund error:', e)
    }
    load()
  }

  async function handleReject(refund: any) {
    const note = prompt('Lý do từ chối:')
    if (note === null) return
    await supabase.from('refund_requests').update({ status: 'rejected', admin_note: note }).eq('id', refund.id)
    load()
  }

  const filtered = filter === 'all' ? refunds : refunds.filter(r => r.status === filter)
  const pending = refunds.filter(r => r.status === 'pending').length
  const approved = refunds.filter(r => r.status === 'approved').length
  const processed = refunds.filter(r => r.status === 'processed').length

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">💰 Yêu cầu hoàn tiền</h1>
        <div className="flex gap-3 text-sm text-gray-400">
          <span>Chờ duyệt: <strong className="text-amber-400">{pending}</strong></span>
          <span>Đã xử lý: <strong className="text-emerald-400">{processed + approved}</strong></span>
          <span>Tổng: <strong className="text-gray-300">{refunds.length}</strong></span>
        </div>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'processed', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {s === 'all' ? 'Tất cả' : s === 'pending' ? 'Chờ duyệt' : s === 'approved' ? 'Đã duyệt' : s === 'processed' ? 'Đã xử lý' : 'Từ chối'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Chờ duyệt', value: pending, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Đã duyệt', value: approved, color: 'text-blue-400', bg: 'bg-blue-900/30' },
          { label: 'Đã xử lý', value: processed, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Tổng yêu cầu', value: refunds.length, color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 text-left">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Dịch vụ</th>
              <th className="py-3 px-4">Khách hàng</th>
              <th className="py-3 px-4">Số tiền</th>
              <th className="py-3 px-4">Lý do</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chưa có yêu cầu hoàn tiền</td></tr>
            ) : (
              filtered.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{r.id.slice(0, 8)}</td>
                  <td className="py-3 px-4">{r.orders?.category || '—'}</td>
                  <td className="py-3 px-4 text-xs">{r.customer_id?.slice(0, 12) || '—'}</td>
                  <td className="py-3 px-4 font-medium text-orange-400">{r.amount.toLocaleString()}₫</td>
                  <td className="py-3 px-4 max-w-[200px] truncate">{r.reason}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-900/50 text-amber-300' :
                      r.status === 'approved' ? 'bg-blue-900/50 text-blue-300' :
                      r.status === 'processed' ? 'bg-emerald-900/50 text-emerald-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(r)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                          Duyệt
                        </button>
                        <button onClick={() => handleReject(r)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition">
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{r.admin_note || '—'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}