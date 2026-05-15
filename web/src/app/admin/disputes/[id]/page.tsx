'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function DisputeDetail() {
  const router = useRouter()
  const params = useParams()
  const disputeId = params.id as string
  const { toast } = useToast()
  const [dispute, setDispute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveAction, setResolveAction] = useState('refund_full')

  useEffect(() => { load() }, [disputeId])

  async function load() {
    const { data } = await supabase
      .from('complaints')
      .select('*, orders:order_id(*)')
      .eq('id', disputeId)
      .single()
    setDispute(data)
    setLoading(false)
  }

  async function handleResolve() {
    setResolving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Update complaint status
    await supabase.from('complaints').update({
      status: resolveAction === 'dismiss' ? 'rejected' : 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: session.user.id,
      resolution: resolveAction,
    }).eq('id', disputeId)

    // If refund, process escrow refund
    if (resolveAction === 'refund_full' || resolveAction === 'refund_partial') {
      const amount = resolveAction === 'refund_full'
        ? (dispute.orders?.final_price || dispute.orders?.estimated_price || 0)
        : Math.round((dispute.orders?.final_price || dispute.orders?.estimated_price || 0) * 0.5)

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'escrow:refund', orderId: dispute.order_id }),
        })
        await supabase.from('orders').update({ status: 'disputed', payment_status: 'refunded' }).eq('id', dispute.order_id)
      } catch (e) {
        console.error('Refund error:', e)
      }
    }

    // If rework, update order status
    if (resolveAction === 'rework') {
      await supabase.from('orders').update({ status: 'in_progress' }).eq('id', dispute.order_id)
    }

    setShowResolveModal(false)
    toast('✅ Dispute resolved', 'success')
    load()
    setResolving(false)
  }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
  if (!dispute) return <div className="text-center py-20 text-gray-500 bg-gray-900">Dispute not found</div>

  const order = dispute.orders || {}

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5 bg-gray-900 min-h-screen">
      {/* Header */}
      <button onClick={() => router.push('/admin/disputes')} className="text-sm text-indigo-400 hover:underline flex items-center gap-1">
        ← Danh sách disputes
      </button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">⚖️ Dispute #{disputeId.slice(0, 8)}</h1>
          <p className="text-sm text-gray-500">{order.category} · {new Date(dispute.created_at).toLocaleString('vi-VN')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${dispute.status === 'pending' ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
          {dispute.status === 'pending' ? '⏳ Chờ xử lý' : '✅ Đã xử lý'}
        </span>
      </div>

      {/* AI Summary */}
      <div className="bg-indigo-900/30 border border-indigo-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🤖</span>
          <span className="font-semibold text-indigo-200">AI Phân tích</span>
        </div>
        <p className="text-sm text-indigo-300">{dispute.description || 'Không có mô tả'}</p>
        <div className="mt-3 text-xs text-indigo-400">
          <strong>Loại khiếu nại:</strong> {dispute.complaint_type || 'Khác'}
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="font-semibold text-gray-200 mb-3">📋 Thông tin đơn hàng</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Dịch vụ</p>
            <p className="text-gray-200 font-medium">{order.category || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Giá</p>
            <p className="text-gray-200 font-medium">{(order.estimated_price || 0).toLocaleString()}₫</p>
          </div>
          <div>
            <p className="text-gray-500">Khách hàng</p>
            <p className="text-gray-200 font-medium font-mono text-xs">{order.customer_id?.slice(0, 12) || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Thợ</p>
            <p className="text-gray-200 font-medium font-mono text-xs">{order.worker_id?.slice(0, 12) || 'Chưa có'}</p>
          </div>
          <div>
            <p className="text-gray-500">Trạng thái</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              order.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300'
              : order.status === 'disputed' ? 'bg-rose-900/50 text-rose-300'
              : 'bg-gray-700 text-gray-400'
            }`}>{order.status}</span>
          </div>
          <div>
            <p className="text-gray-500">Thanh toán</p>
            <span className={`text-xs ${order.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {order.payment_status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
          </div>
        </div>
      </div>

      {/* Resolve Section */}
      {dispute.status === 'pending' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="font-semibold text-gray-200 mb-4">🛡️ Giải quyết</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => { setResolveAction('rework'); setShowResolveModal(true) }}
              className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-blue-500 transition text-left">
              <div className="text-2xl mb-1">🔄</div>
              <div className="font-medium text-gray-200 text-sm">Yêu cầu làm lại</div>
              <div className="text-xs text-gray-500 mt-1">Thợ sửa lại miễn phí</div>
            </button>
            <button onClick={() => { setResolveAction('refund_full'); setShowResolveModal(true) }}
              className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-rose-500 transition text-left">
              <div className="text-2xl mb-1">💰</div>
              <div className="font-medium text-gray-200 text-sm">Hoàn tiền 100%</div>
              <div className="text-xs text-gray-500 mt-1">Trả lại toàn bộ tiền cho khách</div>
            </button>
            <button onClick={() => { setResolveAction('refund_partial'); setShowResolveModal(true) }}
              className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-amber-500 transition text-left">
              <div className="text-2xl mb-1">💸</div>
              <div className="font-medium text-gray-200 text-sm">Hoàn tiền 50%</div>
              <div className="text-xs text-gray-500 mt-1">Chia đều trách nhiệm</div>
            </button>
            <button onClick={() => { setResolveAction('dismiss'); setShowResolveModal(true) }}
              className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-gray-500 transition text-left">
              <div className="text-2xl mb-1">📄</div>
              <div className="font-medium text-gray-200 text-sm">Từ chối</div>
              <div className="text-xs text-gray-500 mt-1">Khiếu nại không hợp lệ</div>
            </button>
          </div>
        </div>
      )}

      {dispute.status !== 'pending' && (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl p-4">
          <p className="text-emerald-300 font-medium">✅ Đã xử lý: {dispute.resolution}</p>
          {dispute.resolved_at && <p className="text-xs text-emerald-500 mt-1">Lúc: {new Date(dispute.resolved_at).toLocaleString('vi-VN')}</p>}
        </div>
      )}

      {/* Resolve Confirm Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResolveModal(false)}>
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-200 mb-2">Xác nhận giải quyết</h2>
            <p className="text-sm text-gray-400 mb-4">
              {resolveAction === 'rework' ? '🔄 Yêu cầu thợ làm lại miễn phí' :
               resolveAction === 'refund_full' ? `💰 Hoàn tiền 100%: ${(order.final_price || order.estimated_price || 0).toLocaleString()}₫` :
               resolveAction === 'refund_partial' ? `💸 Hoàn tiền 50%: ${(Math.round((order.final_price || order.estimated_price || 0) * 0.5)).toLocaleString()}₫` :
               '📄 Từ chối khiếu nại'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResolveModal(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Hủy</button>
              <button onClick={handleResolve} disabled={resolving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {resolving ? '⏳' : '✅ Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
